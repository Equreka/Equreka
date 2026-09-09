import { type CatalogLiteEntry, foldSearchTerm } from '@equreka/content/search-options';
import { collectionLabel, type Locale, type MessageKey, t } from '@equreka/core/i18n';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import type { ReaderPayload } from '../integrations/equreka-assets';

type ReaderState =
	| { status: 'loading' }
	| { status: 'error' }
	| { status: 'ready'; catalog: CatalogLiteEntry[]; entries: ReaderPayload };

interface SelectedEntry {
	collection: string;
	slug: string;
}

const ENTRY_PATH_RE =
	/^\/(?:es\/)?(units|magnitudes|constants|equations|categories|paths)\/([^/]+)\/?$/;

const MATH_FRAGMENT_RE = /\$\$?([^$]+)\$\$?/g;

/**
 * The URL the service worker failed to fetch: the offline reader HTML is
 * served under the originally requested path (precacheFallback preserves
 * it, per-locale), with `?from=` honored as an explicit override for links
 * into the reader. The path's collection segment doubles as the
 * reader-payload key; an /es/ prefix is stripped.
 */
function requestedEntry(): SelectedEntry | null {
	const from = new URLSearchParams(window.location.search).get('from');
	const path = from ?? window.location.pathname;
	const match = ENTRY_PATH_RE.exec(path);
	if (match === null) return null;
	return { collection: match[1] ?? '', slug: match[2] ?? '' };
}

/**
 * Plain-text fallback for descriptions carrying inline $TeX$: math
 * fragments render as monospace runs instead of KaTeX, which is not
 * precached logic — the reader must work from data alone.
 */
function plainMathText(text: string): ReactNode[] {
	const nodes: ReactNode[] = [];
	let cursor = 0;
	for (const match of text.matchAll(MATH_FRAGMENT_RE)) {
		const index = match.index ?? 0;
		if (index > cursor) {
			nodes.push(text.slice(cursor, index));
		}
		nodes.push(
			<span key={index} className="font-mono text-sm">
				{match[1]}
			</span>,
		);
		cursor = index + match[0].length;
	}
	if (cursor < text.length) {
		nodes.push(text.slice(cursor));
	}
	return nodes;
}

const LIST_LIMIT = 30;

/**
 * Step kind → catalog key for the offline outline labels.
 */
const STEP_KIND_KEYS: Record<string, MessageKey> = {
	entry: 'path.kind.entry',
	prose: 'path.kind.prose',
	check: 'path.kind.check',
};

export interface OfflineReaderProps {
	locale?: Locale;
}

export default function OfflineReader({ locale = 'en' }: OfflineReaderProps) {
	const [state, setState] = useState<ReaderState>({ status: 'loading' });
	const [selected, setSelected] = useState<SelectedEntry | null>(null);
	const [filter, setFilter] = useState('');

	useEffect(() => {
		let cancelled = false;
		Promise.all([
			fetch(`/search/catalog-lite.${locale}.json`).then((response) => {
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				return response.json() as Promise<CatalogLiteEntry[]>;
			}),
			fetch(`/data/reader.${locale}.json`).then((response) => {
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				return response.json() as Promise<ReaderPayload>;
			}),
		])
			.then(([catalog, entries]) => {
				if (cancelled) return;
				setState({ status: 'ready', catalog, entries });
				setSelected(requestedEntry());
			})
			.catch(() => {
				if (!cancelled) setState({ status: 'error' });
			});
		return () => {
			cancelled = true;
		};
	}, [locale]);

	const rows = useMemo(() => {
		if (state.status !== 'ready') return [];
		const folded = foldSearchTerm(filter.trim());
		const matches =
			folded === ''
				? state.catalog
				: state.catalog.filter(
						(entry) =>
							foldSearchTerm(entry.name).includes(folded) ||
							foldSearchTerm(entry.symbolText).startsWith(folded) ||
							entry.aliases.some((alias) => foldSearchTerm(alias).includes(folded)),
					);
		return matches.slice(0, LIST_LIMIT);
	}, [state, filter]);

	if (state.status === 'loading') {
		return <p className="text-ink-muted">{t(locale, 'offline.loading')}</p>;
	}
	if (state.status === 'error') {
		return (
			<p role="alert" className="text-danger">
				{t(locale, 'offline.error')}
			</p>
		);
	}

	const selectedEntry =
		selected === null ? undefined : state.entries[selected.collection]?.[selected.slug];

	return (
		<div className="mt-6 grid gap-8">
			{selected !== null && (
				<article className="rounded-lg border border-border bg-surface p-6">
					{selectedEntry === undefined ? (
						<p className="text-ink-muted">{t(locale, 'offline.notCached')}</p>
					) : (
						<>
							<div className="flex flex-wrap items-baseline gap-3">
								<h2 className="text-2xl font-bold tracking-tight">{selectedEntry.name}</h2>
								{selectedEntry.symbolText !== '' && (
									<span className="font-mono text-xl text-ink-muted">
										{selectedEntry.symbolText}
									</span>
								)}
								<span className="ml-auto text-xs text-ink-muted uppercase tracking-wide">
									{collectionLabel(locale, selected.collection)}
								</span>
							</div>
							{selectedEntry.description !== '' && (
								<p className="mt-3 leading-7">{plainMathText(selectedEntry.description)}</p>
							)}
							{selectedEntry.outline !== undefined && (
								<section aria-labelledby="offline-outline-heading" className="mt-4">
									<h3 id="offline-outline-heading" className="text-sm font-semibold">
										{t(locale, 'offline.outline')}
									</h3>
									<ol className="mt-2 list-decimal space-y-1 pl-6 text-sm">
										{selectedEntry.outline.map((item, index) => (
											<li key={`${index}-${item.kind}`}>
												<span className="text-xs text-ink-muted uppercase tracking-wide">
													{t(locale, STEP_KIND_KEYS[item.kind] ?? 'path.steps')}
												</span>
												{item.title !== '' && (
													<span className="ml-2">{plainMathText(item.title)}</span>
												)}
											</li>
										))}
									</ol>
								</section>
							)}
						</>
					)}
				</article>
			)}
			<section aria-labelledby="offline-library-heading">
				<h2 id="offline-library-heading" className="text-xl font-semibold">
					{t(locale, 'offline.browse')}
				</h2>
				<input
					type="search"
					aria-label={t(locale, 'offline.filterAria')}
					placeholder={t(locale, 'offline.filterPlaceholder')}
					className="mt-3 w-full max-w-md rounded-md border border-border bg-surface px-3 py-1.5 text-base text-ink placeholder:text-ink-muted"
					value={filter}
					onChange={(event) => setFilter(event.target.value)}
				/>
				<ul className="mt-4 divide-y divide-border rounded-md border border-border bg-surface">
					{rows.map((entry) => (
						<li key={`${entry.collection}:${entry.slug}`}>
							{state.entries[entry.collection]?.[entry.slug] !== undefined ? (
								<button
									type="button"
									className="flex w-full items-baseline gap-2 px-3 py-2 text-left hover:bg-bg"
									onClick={() => setSelected({ collection: entry.collection, slug: entry.slug })}
								>
									<span className="text-accent">{entry.name}</span>
									{entry.symbolText !== '' && (
										<span className="font-mono text-sm text-ink-muted">{entry.symbolText}</span>
									)}
									<span className="ml-auto text-xs text-ink-muted">
										{collectionLabel(locale, entry.collection)}
									</span>
								</button>
							) : (
								<span className="flex items-baseline gap-2 px-3 py-2">
									<span>{entry.name}</span>
									{entry.symbolText !== '' && (
										<span className="font-mono text-sm text-ink-muted">{entry.symbolText}</span>
									)}
									<span className="ml-auto text-xs text-ink-muted">
										{collectionLabel(locale, entry.collection)}
									</span>
								</span>
							)}
						</li>
					))}
					{rows.length === 0 && (
						<li className="px-3 py-2 text-sm text-ink-muted">{t(locale, 'offline.noMatch')}</li>
					)}
				</ul>
			</section>
		</div>
	);
}
