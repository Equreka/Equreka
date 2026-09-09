import { usePathProgress } from '@equreka/core';
import { type Locale, t } from '@equreka/core/i18n';
import { useEffect, useState } from 'react';
import type { PathsPayload } from '../integrations/equreka-assets';
import { entryHref, pathStepAnchor, withPathContext } from '../lib/entry-links';
import { kvLocalStorage } from '../lib/kv-local-storage';
import { localePath } from '../lib/locale-paths';

export interface PathContextBarProps {
	locale?: Locale;
}

interface PathContext {
	path: string;
	step: string;
}

type PathStepRef = PathsPayload[string]['steps'][number];

/**
 * The `?path=&step=` pair the path page appends to entry links. Read on the
 * client only, so the static HTML of every entry page stays canonical and
 * cacheable regardless of how it was reached.
 */
function readContext(): PathContext | null {
	const params = new URLSearchParams(window.location.search);
	const path = params.get('path');
	const step = params.get('step');
	return path !== null && step !== null && path !== '' && step !== '' ? { path, step } : null;
}

function stepHref(locale: Locale, pathSlug: string, step: PathStepRef): string {
	const href =
		step.kind === 'entry' && step.collection !== undefined && step.slug !== undefined
			? entryHref(step.collection, step.slug)
			: undefined;
	return localePath(
		locale,
		href === undefined
			? pathStepAnchor(pathSlug, step.id)
			: withPathContext(href, pathSlug, step.id),
	);
}

/**
 * Dormant learning-path bar mounted on every entry page. Renders nothing
 * unless the URL carries `?path=&step=`; then it fetches the precached
 * paths payload and shows the path name, the step position, a mark-done
 * toggle and previous/next links, so a learner can walk a path without
 * returning to its page after every entry.
 */
export default function PathContextBar({ locale = 'en' }: PathContextBarProps) {
	const [context, setContext] = useState<PathContext | null>(null);
	const [payload, setPayload] = useState<PathsPayload | null>(null);

	useEffect(() => {
		setContext(readContext());
	}, []);

	useEffect(() => {
		if (context === null) return;
		let cancelled = false;
		fetch(`/data/paths.${locale}.json`)
			.then((response) => {
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				return response.json() as Promise<PathsPayload>;
			})
			.then((data) => {
				if (!cancelled) setPayload(data);
			})
			.catch(() => {
				if (!cancelled) setPayload(null);
			});
		return () => {
			cancelled = true;
		};
	}, [context, locale]);

	const path = context === null ? undefined : payload?.[context.path];
	const stepIds = path === undefined ? [] : path.steps.map((step) => step.id);
	const progress = usePathProgress(kvLocalStorage, context?.path ?? '', stepIds);

	if (context === null || path === undefined) return null;
	const index = path.steps.findIndex((step) => step.id === context.step);
	if (index === -1) return null;
	const previous = path.steps[index - 1];
	const next = path.steps[index + 1];
	const done = progress.isDone(context.step);
	const linkClass = 'text-sm text-accent hover:underline';

	return (
		<aside
			aria-label={path.name}
			className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-accent/40 bg-accent/5 px-4 py-3 text-sm"
		>
			<a
				className="font-medium text-accent hover:underline"
				href={localePath(locale, `/paths/${context.path}/`)}
			>
				{path.name}
			</a>
			<span className="text-ink-muted">
				{t(locale, 'path.stepOf', { n: index + 1, total: path.steps.length })}
			</span>
			<button
				type="button"
				aria-pressed={done}
				className={`rounded-md border px-2.5 py-1 text-sm font-medium ${
					done
						? 'border-accent bg-accent text-accent-ink'
						: 'border-border bg-surface text-ink hover:bg-bg'
				}`}
				onClick={() => progress.toggleStep(context.step)}
			>
				{done ? `✓ ${t(locale, 'path.completed')}` : t(locale, 'path.markDone')}
			</button>
			<span className="ml-auto flex flex-wrap gap-4">
				{previous !== undefined && (
					<a className={linkClass} href={stepHref(locale, context.path, previous)} rel="prev">
						← {t(locale, 'path.prev')}
					</a>
				)}
				{next !== undefined ? (
					<a className={linkClass} href={stepHref(locale, context.path, next)} rel="next">
						{t(locale, 'path.next')} →
					</a>
				) : (
					<a className={linkClass} href={localePath(locale, `/paths/${context.path}/`)}>
						{t(locale, 'path.backToPath')} →
					</a>
				)}
			</span>
		</aside>
	);
}
