import { type CatalogLiteEntry, foldSearchTerm } from '@equreka/content/search-options';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import type { ReaderUnits } from '../integrations/equreka-assets';
import { COLLECTION_LABELS } from '../lib/labels';

type ReaderState =
	| { status: 'loading' }
	| { status: 'error' }
	| { status: 'ready'; catalog: CatalogLiteEntry[]; units: ReaderUnits };

const UNIT_PATH_RE = /^\/units\/([^/]+)\/?$/;

const MATH_FRAGMENT_RE = /\$\$?([^$]+)\$\$?/g;

/**
 * The URL the service worker failed to fetch: the offline reader HTML is
 * served under the originally requested path (precacheFallback preserves
 * it), with `?from=` honored as an explicit override for links into the
 * reader.
 */
function requestedUnitSlug(): string | null {
	const from = new URLSearchParams(window.location.search).get('from');
	const path = from ?? window.location.pathname;
	return UNIT_PATH_RE.exec(path)?.[1] ?? null;
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

export default function OfflineReader() {
	const [state, setState] = useState<ReaderState>({ status: 'loading' });
	const [selected, setSelected] = useState<string | null>(null);
	const [filter, setFilter] = useState('');

	useEffect(() => {
		let cancelled = false;
		Promise.all([
			fetch('/search/catalog-lite.en.json').then((response) => {
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				return response.json() as Promise<CatalogLiteEntry[]>;
			}),
			fetch('/data/units.en.json').then((response) => {
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				return response.json() as Promise<ReaderUnits>;
			}),
		])
			.then(([catalog, units]) => {
				if (cancelled) return;
				setState({ status: 'ready', catalog, units });
				setSelected(requestedUnitSlug());
			})
			.catch(() => {
				if (!cancelled) setState({ status: 'error' });
			});
		return () => {
			cancelled = true;
		};
	}, []);

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
		return <p className="text-ink-muted">Loading offline library…</p>;
	}
	if (state.status === 'error') {
		return (
			<p role="alert" className="text-danger">
				The offline library is not available. Reconnect and reload once to store it.
			</p>
		);
	}

	const selectedUnit = selected === null ? undefined : state.units[selected];

	return (
		<div className="mt-6 grid gap-8">
			{selected !== null && (
				<article className="rounded-lg border border-border bg-surface p-6">
					{selectedUnit === undefined ? (
						<p className="text-ink-muted">
							This entry is not in the offline library. Pick one below.
						</p>
					) : (
						<>
							<div className="flex flex-wrap items-baseline gap-3">
								<h2 className="text-2xl font-bold tracking-tight">{selectedUnit.name}</h2>
								{selectedUnit.symbolText !== '' && (
									<span className="font-mono text-xl text-ink-muted">
										{selectedUnit.symbolText}
									</span>
								)}
							</div>
							{selectedUnit.description !== '' && (
								<p className="mt-3 leading-7">{plainMathText(selectedUnit.description)}</p>
							)}
						</>
					)}
				</article>
			)}
			<section aria-labelledby="offline-library-heading">
				<h2 id="offline-library-heading" className="text-xl font-semibold">
					Browse the offline library
				</h2>
				<input
					type="search"
					aria-label="Filter offline entries"
					placeholder="Filter by name, symbol, or alias…"
					className="mt-3 w-full max-w-md rounded-md border border-border bg-surface px-3 py-1.5 text-base text-ink placeholder:text-ink-muted"
					value={filter}
					onChange={(event) => setFilter(event.target.value)}
				/>
				<ul className="mt-4 divide-y divide-border rounded-md border border-border bg-surface">
					{rows.map((entry) => (
						<li key={`${entry.collection}:${entry.slug}`}>
							{entry.collection === 'units' ? (
								<button
									type="button"
									className="flex w-full items-baseline gap-2 px-3 py-2 text-left hover:bg-bg"
									onClick={() => setSelected(entry.slug)}
								>
									<span className="text-accent">{entry.name}</span>
									{entry.symbolText !== '' && (
										<span className="font-mono text-sm text-ink-muted">{entry.symbolText}</span>
									)}
								</button>
							) : (
								<span className="flex items-baseline gap-2 px-3 py-2">
									<span>{entry.name}</span>
									{entry.symbolText !== '' && (
										<span className="font-mono text-sm text-ink-muted">{entry.symbolText}</span>
									)}
									<span className="ml-auto text-xs text-ink-muted">
										{COLLECTION_LABELS[entry.collection] ?? entry.collection}
									</span>
								</span>
							)}
						</li>
					))}
					{rows.length === 0 && (
						<li className="px-3 py-2 text-sm text-ink-muted">No offline entries match.</li>
					)}
				</ul>
			</section>
		</div>
	);
}
