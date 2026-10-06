import { useEffect, useState } from 'react';
import { HydratedMathView } from '../../shared/math/math-view';
import {
	layoutRuntimeMath,
	type RuntimeMath,
	type RuntimeMathBody,
	runtimeMath,
} from '../../shared/math/runtime-mathjax';
import { useTheme } from '../../shared/providers/equreka-provider';
import { VStack } from '../../shared/ui/screen';
import { AppText } from '../../shared/ui/text';
import type { SolvedFormLine } from './solved-form';

type LineState =
	| { status: 'pending' }
	| { status: 'ready'; body: RuntimeMathBody }
	| { status: 'failed' };

const PENDING: LineState = { status: 'pending' };

/**
 * Renders `tex` through the on-device MathJax leg; a rejection (throw,
 * budget overrun, malformed output) resolves to `failed` so the caller
 * shows plain text. A result that arrives after `tex` changed is dropped.
 */
function useRuntimeMath(tex: string, renderer: RuntimeMath): LineState {
	const [state, setState] = useState<{ tex: string; line: LineState }>({ tex, line: PENDING });
	useEffect(() => {
		let live = true;
		renderer.render(tex).then(
			(body) => {
				if (live) setState({ tex, line: { status: 'ready', body } });
			},
			() => {
				if (live) setState({ tex, line: { status: 'failed' } });
			},
		);
		return () => {
			live = false;
		};
	}, [tex, renderer]);
	return state.tex === tex ? state.line : PENDING;
}

function SolvedFormLineView({ line, renderer }: { line: SolvedFormLine; renderer: RuntimeMath }) {
	const theme = useTheme();
	const state = useRuntimeMath(line.tex, renderer);
	if (state.status === 'failed') {
		return (
			<AppText size="sm" mono accessibilityLiveRegion="polite">
				{line.text}
			</AppText>
		);
	}
	if (state.status === 'pending') return null;
	return (
		<HydratedMathView
			hydrated={layoutRuntimeMath(state.body, theme.text.lg.fontSize)}
			color={theme.color.ink}
			scroll
			accessibilityLabel={line.text}
			testID="runtime-math"
		/>
	);
}

export interface SolvedFormViewProps {
	lines: readonly SolvedFormLine[];
	renderer?: RuntimeMath | undefined;
}

export function SolvedFormView({ lines, renderer = runtimeMath }: SolvedFormViewProps) {
	return (
		<VStack gap={1}>
			{lines.map((line) => (
				<SolvedFormLineView key={line.tex} line={line} renderer={renderer} />
			))}
		</VStack>
	);
}
