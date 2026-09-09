import { usePathProgress } from '@equreka/core';
import { type Locale, t } from '@equreka/core/i18n';
import { kvLocalStorage } from '../lib/kv-local-storage';

export interface PathProgressProps {
	pathSlug: string;
	stepIds: string[];
	locale?: Locale;
	variant: 'bar' | 'badge';
}

/**
 * A path's completion state from the device-local progress record. `bar`
 * is the path page header (progress bar + reset); `badge` is the compact
 * count on /paths cards, rendering nothing until a step is done so the
 * static card stays clean during SSR and for new readers.
 */
export default function PathProgress({
	pathSlug,
	stepIds,
	locale = 'en',
	variant,
}: PathProgressProps) {
	const { done, percent, reset } = usePathProgress(kvLocalStorage, pathSlug, stepIds);
	const total = stepIds.length;
	const complete = total > 0 && done.size === total;

	if (variant === 'badge') {
		if (done.size === 0) return null;
		return (
			<span
				className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
					complete ? 'bg-accent text-accent-ink' : 'bg-accent/10 text-accent'
				}`}
			>
				{complete ? t(locale, 'path.completed') : `${done.size}/${total} · ${percent}%`}
			</span>
		);
	}

	return (
		<div className="mt-4 max-w-xl">
			<div className="flex items-baseline justify-between gap-4 text-sm">
				<span className={complete ? 'font-medium text-accent' : 'text-ink-muted'}>
					{complete
						? t(locale, 'path.completed')
						: t(locale, 'path.progress', { done: done.size, total })}
				</span>
				{done.size > 0 && (
					<button
						type="button"
						className="text-sm text-ink-muted hover:text-danger"
						onClick={reset}
					>
						{t(locale, 'path.reset')}
					</button>
				)}
			</div>
			<progress
				className="path-progress mt-1 h-2 w-full"
				aria-label={t(locale, 'path.progressAria')}
				max={total}
				value={done.size}
			>
				{percent}%
			</progress>
		</div>
	);
}
