import { usePathProgress } from '@equreka/core';
import { type Locale, t } from '@equreka/core/i18n';
import { kvLocalStorage } from '../lib/kv-local-storage';

export interface PathStepToggleProps {
	pathSlug: string;
	stepId: string;
	stepIds: string[];
	locale?: Locale;
}

/**
 * The per-step "mark done" control on a path page: a native checkbox (so
 * keyboard, screen-reader and form semantics come for free) bound to the
 * shared progress record — every instance and the header bar stay in sync
 * through the storage adapter's change channel.
 */
export default function PathStepToggle({
	pathSlug,
	stepId,
	stepIds,
	locale = 'en',
}: PathStepToggleProps) {
	const { isDone, toggleStep } = usePathProgress(kvLocalStorage, pathSlug, stepIds);
	const done = isDone(stepId);
	const label = t(locale, done ? 'path.markUndone' : 'path.markDone');

	return (
		<input
			type="checkbox"
			className="mt-1.5 size-5 shrink-0 cursor-pointer accent-accent"
			checked={done}
			aria-label={label}
			title={label}
			data-step-toggle={stepId}
			onChange={() => toggleStep(stepId)}
		/>
	);
}
