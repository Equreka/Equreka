import {
	type CatalogLiteEntry,
	foldSearchTerm,
	type SearchDocument,
	searchOptions,
} from '@equreka/content/search-options';
import { collectionRank, SEARCH_GROUP_ORDER } from '@equreka/core/collections';
import { collectionLabel, type Locale, t } from '@equreka/core/i18n';
import MiniSearch from 'minisearch';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../components/react-icon';
import { entryHref } from '../lib/entry-links';
import { searchIcon } from '../lib/icons';
import { localePath } from '../lib/locale-paths';
import { collectionAccent } from './collection-accent';
import { LegacyAbbr } from './legacy-abbr';

export interface SearchBoxProps {
	variant: 'header' | 'page';
	locale?: Locale;
}

interface FoldedCatalogEntry extends CatalogLiteEntry {
	foldedName: string;
	foldedSymbol: string;
	foldedAliases: string[];
}

/**
 * `byKey` resolves a BM25 hit (which stores only name and collection) to
 * its catalog row for the category badge; `categoryNames` maps a category
 * slug to its localized name, read from the catalog's own category rows.
 */
interface SearchLanes {
	catalog: FoldedCatalogEntry[];
	byKey: ReadonlyMap<string, FoldedCatalogEntry>;
	categoryNames: ReadonlyMap<string, string>;
	index: MiniSearch<SearchDocument>;
}

/**
 * `category` is the first category slug, the one the original badged.
 */
interface ResultRow {
	key: string;
	collection: string;
	slug: string;
	name: string;
	category: string | undefined;
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
				category: entry.categories[0],
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
			category: lanes.byKey.get(key)?.categories[0],
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
	const order = (collection: string): number => collectionRank(SEARCH_GROUP_ORDER.web, collection);
	return [...byCollection.entries()]
		.map(([collection, groupRows]) => ({ collection, rows: groupRows }))
		.sort((a, b) => order(a.collection) - order(b.collection));
}

interface ResultRowContentProps {
	row: ResultRow;
	categoryNames: ReadonlyMap<string, string>;
	locale: Locale;
}

/**
 * The original `SearchResults` row body: the name, then the `Abbr` badge
 * of the entry's first category (short code below 768px, full name from
 * 768px).
 */
function ResultRowContent({ row, categoryNames, locale }: ResultRowContentProps) {
	const label = row.category === undefined ? undefined : categoryNames.get(row.category);
	return (
		<>
			<span>{row.name}</span>
			{row.category === undefined || label === undefined ? null : (
				<span className="eq-badge eq-badge-accent eq-search-category">
					<LegacyAbbr term={row.category} label={label} locale={locale} />
				</span>
			)}
		</>
	);
}

export default function SearchBox({ variant, locale = 'en' }: SearchBoxProps) {
	const [query, setQuery] = useState('');
	const [lanes, setLanes] = useState<SearchLanes | null>(null);
	const [failed, setFailed] = useState(false);
	const [focused, setFocused] = useState(false);
	const loadRef = useRef<Promise<void> | null>(null);

	const ensureLanes = useCallback(() => {
		loadRef.current ??= (async () => {
			const [catalogResponse, indexResponse] = await Promise.all([
				fetch(`/search/catalog-lite.${locale}.json`),
				fetch(`/search/${locale}.json`),
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
			setLanes({
				catalog,
				byKey: new Map(catalog.map((entry) => [`${entry.collection}:${entry.slug}`, entry])),
				categoryNames: new Map(
					catalog
						.filter((entry) => entry.collection === 'categories')
						.map((entry) => [entry.slug, entry.name]),
				),
				index: MiniSearch.loadJSON<SearchDocument>(indexJson, searchOptions),
			});
		})().catch(() => {
			loadRef.current = null;
			setFailed(true);
		});
	}, [locale]);

	useEffect(() => {
		if (variant === 'page') ensureLanes();
	}, [variant, ensureLanes]);

	const rows = lanes === null ? [] : runSearch(lanes, query);
	const groups = groupRows(rows);
	const active = query.trim() !== '';
	const showPanel = variant === 'page' || (focused && active);

	const results = !active ? null : failed ? (
		<p role="alert" className="eq-search-message eq-search-message-error">
			{t(locale, 'search.unavailable')}
		</p>
	) : lanes === null ? (
		<p className="eq-search-message">{t(locale, 'search.loading')}</p>
	) : groups.length === 0 ? (
		<p className="eq-search-message">{t(locale, 'search.noResults', { query: query.trim() })}</p>
	) : (
		<ul>
			{groups.map((group) => (
				<li
					key={group.collection}
					className={`eq-search-group ${collectionAccent(group.collection)}`}
				>
					<p className="eq-search-group-title">
						<span>{collectionLabel(locale, group.collection)}</span>
						<span className="eq-badge eq-badge-outline eq-search-count">{group.rows.length}</span>
					</p>
					<ul>
						{group.rows.map((row) => {
							const href = entryHref(row.collection, row.slug);
							const className =
								row.category === undefined
									? 'eq-search-item'
									: `eq-search-item cat-${row.category}`;
							const content = (
								<ResultRowContent row={row} categoryNames={lanes.categoryNames} locale={locale} />
							);
							return (
								<li key={row.key}>
									{href !== undefined ? (
										<a className={className} href={localePath(locale, href)}>
											{content}
										</a>
									) : (
										<span className={className}>{content}</span>
									)}
								</li>
							);
						})}
					</ul>
				</li>
			))}
		</ul>
	);

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: focus tracking on the search container is composite-widget focus management, not a pointer interaction
		<div
			className="eq-search"
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
				placeholder={t(locale, 'search.placeholder')}
				aria-label={t(locale, 'search.aria')}
				className={variant === 'header' ? 'eq-search-input' : 'eq-search-input eq-search-input-lg'}
				value={query}
				onChange={(event) => setQuery(event.target.value)}
			/>
			<Icon icon={searchIcon} className="eq-search-icon" />
			{showPanel && results !== null && (
				<div
					className={
						variant === 'header'
							? 'eq-search-results eq-search-results-floating'
							: 'eq-search-results'
					}
				>
					{results}
				</div>
			)}
		</div>
	);
}
