import {
	type CatalogLiteEntry,
	foldSearchTerm,
	type SearchDocument,
	searchOptions,
} from '@equreka/content/search-options';
import MiniSearch from 'minisearch';
import { useCallback, useEffect, useRef, useState } from 'react';
import { COLLECTION_LABELS, COLLECTION_ORDER } from '../lib/labels';

export interface SearchBoxProps {
	variant: 'header' | 'page';
}

interface FoldedCatalogEntry extends CatalogLiteEntry {
	foldedName: string;
	foldedSymbol: string;
	foldedAliases: string[];
}

interface SearchLanes {
	catalog: FoldedCatalogEntry[];
	index: MiniSearch<SearchDocument>;
}

interface ResultRow {
	key: string;
	collection: string;
	slug: string;
	name: string;
	symbolText: string;
	pinned: boolean;
}

interface ResultGroup {
	collection: string;
	rows: ResultRow[];
}

const PINNED_LIMIT = 8;
const TOTAL_LIMIT = 20;

/**
 * Two-lane search per ADR 0002: an exact/startsWith pass over the folded
 * catalog-lite (lane 1, pinned) above MiniSearch BM25 prefix results
 * (lane 2), both diacritic-folded through the canonical foldSearchTerm.
 */
function runSearch(lanes: SearchLanes, query: string): ResultRow[] {
	const folded = foldSearchTerm(query.trim());
	if (folded === '') return [];

	const scored: { row: ResultRow; rank: number }[] = [];
	for (const entry of lanes.catalog) {
		const exact =
			entry.foldedName === folded ||
			entry.foldedSymbol === folded ||
			entry.foldedAliases.includes(folded);
		const starts =
			exact ||
			entry.foldedName.startsWith(folded) ||
			(entry.foldedSymbol !== '' && entry.foldedSymbol.startsWith(folded)) ||
			entry.foldedAliases.some((alias) => alias.startsWith(folded));
		if (!starts) continue;
		scored.push({
			rank: exact ? 0 : 1,
			row: {
				key: `${entry.collection}:${entry.slug}`,
				collection: entry.collection,
				slug: entry.slug,
				name: entry.name,
				symbolText: entry.symbolText,
				pinned: true,
			},
		});
	}
	scored.sort((a, b) => a.rank - b.rank || a.row.name.localeCompare(b.row.name));
	const pinned = scored.slice(0, PINNED_LIMIT).map((item) => item.row);

	const seen = new Set(pinned.map((row) => row.key));
	const rest: ResultRow[] = [];
	for (const hit of lanes.index.search(query, { prefix: true, fuzzy: 0.2 })) {
		const key = String(hit.id);
		if (seen.has(key)) continue;
		const separator = key.indexOf(':');
		rest.push({
			key,
			collection: String(hit.collection ?? key.slice(0, separator)),
			slug: key.slice(separator + 1),
			name: String(hit.name ?? key),
			symbolText: '',
			pinned: false,
		});
		if (pinned.length + rest.length >= TOTAL_LIMIT) break;
	}
	return [...pinned, ...rest];
}

function groupRows(rows: ResultRow[]): ResultGroup[] {
	const byCollection = new Map<string, ResultRow[]>();
	for (const row of rows) {
		const bucket = byCollection.get(row.collection);
		if (bucket === undefined) {
			byCollection.set(row.collection, [row]);
		} else {
			bucket.push(row);
		}
	}
	const order = (collection: string): number => {
		const index = (COLLECTION_ORDER as readonly string[]).indexOf(collection);
		return index === -1 ? COLLECTION_ORDER.length : index;
	};
	return [...byCollection.entries()]
		.map(([collection, groupRows]) => ({ collection, rows: groupRows }))
		.sort((a, b) => {
			const aPinned = a.rows.some((row) => row.pinned) ? 0 : 1;
			const bPinned = b.rows.some((row) => row.pinned) ? 0 : 1;
			return aPinned - bPinned || order(a.collection) - order(b.collection);
		});
}

export default function SearchBox({ variant }: SearchBoxProps) {
	const [query, setQuery] = useState('');
	const [lanes, setLanes] = useState<SearchLanes | null>(null);
	const [failed, setFailed] = useState(false);
	const [focused, setFocused] = useState(false);
	const loadRef = useRef<Promise<void> | null>(null);

	const ensureLanes = useCallback(() => {
		loadRef.current ??= (async () => {
			const [catalogResponse, indexResponse] = await Promise.all([
				fetch('/search/catalog-lite.en.json'),
				fetch('/search/en.json'),
			]);
			if (!catalogResponse.ok || !indexResponse.ok) {
				throw new Error('search assets unavailable');
			}
			const rawCatalog = (await catalogResponse.json()) as CatalogLiteEntry[];
			const indexJson = await indexResponse.text();
			const catalog = rawCatalog.map((entry) => ({
				...entry,
				foldedName: foldSearchTerm(entry.name),
				foldedSymbol: foldSearchTerm(entry.symbolText),
				foldedAliases: entry.aliases.map(foldSearchTerm),
			}));
			setLanes({ catalog, index: MiniSearch.loadJSON<SearchDocument>(indexJson, searchOptions) });
		})().catch(() => {
			loadRef.current = null;
			setFailed(true);
		});
	}, []);

	useEffect(() => {
		if (variant === 'page') ensureLanes();
	}, [variant, ensureLanes]);

	const rows = lanes === null ? [] : runSearch(lanes, query);
	const groups = groupRows(rows);
	const active = query.trim() !== '';
	const showPanel = variant === 'page' || (focused && active);

	const results = !active ? null : failed ? (
		<p role="alert" className="px-3 py-2 text-sm text-danger">
			Search is unavailable right now.
		</p>
	) : lanes === null ? (
		<p className="px-3 py-2 text-sm text-ink-muted">Loading search index…</p>
	) : groups.length === 0 ? (
		<p className="px-3 py-2 text-sm text-ink-muted">No results for “{query.trim()}”.</p>
	) : (
		<ul className="divide-y divide-border">
			{groups.map((group) => (
				<li key={group.collection} className="py-1">
					<p className="px-3 pt-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">
						{COLLECTION_LABELS[group.collection] ?? group.collection}
					</p>
					<ul>
						{group.rows.map((row) => (
							<li key={row.key}>
								{row.collection === 'units' ? (
									<a
										className="flex items-baseline gap-2 px-3 py-1.5 hover:bg-bg"
										href={`/units/${row.slug}/`}
									>
										<span>{row.name}</span>
										{row.symbolText !== '' && (
											<span className="font-mono text-sm text-ink-muted">{row.symbolText}</span>
										)}
									</a>
								) : (
									<span className="flex items-baseline gap-2 px-3 py-1.5 text-ink-muted">
										<span>{row.name}</span>
										{row.symbolText !== '' && (
											<span className="font-mono text-sm">{row.symbolText}</span>
										)}
									</span>
								)}
							</li>
						))}
					</ul>
				</li>
			))}
		</ul>
	);

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: focus tracking on the search container is composite-widget focus management, not a pointer interaction
		<div
			className={variant === 'header' ? 'relative w-full max-w-xs' : 'w-full'}
			onFocus={() => {
				setFocused(true);
				ensureLanes();
			}}
			onBlur={(event) => {
				const next = event.relatedTarget instanceof Node ? event.relatedTarget : null;
				if (next === null || !event.currentTarget.contains(next)) {
					setFocused(false);
				}
			}}
		>
			<input
				type="search"
				placeholder="Search units, magnitudes…"
				aria-label="Search the wiki"
				className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-base text-ink placeholder:text-ink-muted"
				value={query}
				onChange={(event) => setQuery(event.target.value)}
			/>
			{showPanel && results !== null && (
				<div
					className={
						variant === 'header'
							? 'absolute top-full right-0 left-0 z-10 mt-1 max-h-96 overflow-y-auto rounded-md border border-border bg-surface shadow-lg'
							: 'mt-4 rounded-md border border-border bg-surface'
					}
				>
					{results}
				</div>
			)}
		</div>
	);
}
