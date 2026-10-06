import { usePathProgress } from '@equreka/core';
import { type Locale, t } from '@equreka/core/i18n';
import { Icon } from '../components/react-icon';
import { arrowClockwiseIcon } from '../lib/icons';
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
				className={`eq-badge type-paths ${complete ? 'eq-badge-accent' : 'eq-path-badge-progress'}`}
			>
				{complete ? t(locale, 'path.completed') : `${done.size}/${total} · ${percent}%`}
			</span>
		);
	}

	return (
		<div className="eq-path-progress">
			<div className="eq-path-progress-row">
				<span
					className={
						complete ? 'eq-path-progress-status eq-is-complete' : 'eq-path-progress-status'
					}
				>
					{complete
						? t(locale, 'path.completed')
						: t(locale, 'path.progress', { done: done.size, total })}
				</span>
				{done.size > 0 && (
					<button
						type="button"
						className="eq-btn eq-btn-text eq-btn-sm eq-path-progress-reset"
						onClick={reset}
					>
						<Icon icon={arrowClockwiseIcon} />
						{t(locale, 'path.reset')}
					</button>
				)}
			</div>
			<progress
				className={complete ? 'path-progress eq-is-complete' : 'path-progress'}
				aria-label={t(locale, 'path.progressAria')}
				max={total}
				value={done.size}
			>
				{percent}%
			</progress>
		</div>
	);
}
