import {
	type CatalogLiteEntry,
	foldSearchTerm,
	type SearchDocument,
	searchLeadOf,
	searchOptions,
} from '@equreka/content/search-options';
import type { Locale } from '@equreka/core/i18n';
import MiniSearch from 'minisearch';
import { useEffect, useState } from 'react';
import { isEntryCollection } from '../../entities/content/routes';
import { getCatalogLite, getPresentation } from '../../shared/content/artifact';

interface FoldedCatalogEntry extends CatalogLiteEntry {
	foldedName: string;
	foldedSymbol: string;
	foldedAliases: string[];
}

export interface SearchLanes {
	catalog: FoldedCatalogEntry[];
	index: MiniSearch<SearchDocument>;
}

export interface ResultRow {
	key: string;
	collection: string;
	slug: string;
	name: string;
	symbolText: string;
	pinned: boolean;
}

const PINNED_LIMIT = 8;
const TOTAL_LIMIT = 20;

/**
 * The indexed lead of an entry's localized description, resolved exactly as
 * the pipeline resolves it for the web index (locale, else English).
 */
function leadOf(entry: CatalogLiteEntry, locale: Locale): string {
	if (!isEntryCollection(entry.collection)) return '';
	const description = getPresentation(entry.collection)[entry.slug]?.description;
	const text = description?.[locale] ?? description?.en;
	return text === undefined ? '' : searchLeadOf(text);
}

/**
 * Builds both lanes on-device from the bundled catalog-lite plus each
 * entity's description lead (ADR 0002: no serialized index ships to
 * mobile). Documents, `searchLeadOf` and the MiniSearch options are the
 * web's, so the ranking matches the web for the same corpus.
 */
export function buildSearchLanes(locale: Locale): SearchLanes {
	const raw = getCatalogLite(locale);
	const catalog = raw.map((entry) => ({
		...entry,
		foldedName: foldSearchTerm(entry.name),
		foldedSymbol: foldSearchTerm(entry.symbolText),
		foldedAliases: entry.aliases.map(foldSearchTerm),
	}));
	const documents: SearchDocument[] = raw.map((entry) => ({
		id: `${entry.collection}:${entry.slug}`,
		collection: entry.collection,
		slug: entry.slug,
		name: entry.name,
		description: leadOf(entry, locale),
		aliases: entry.aliases,
		symbolText: entry.symbolText,
		branches: entry.branches,
	}));
	const index = new MiniSearch<SearchDocument>(searchOptions);
	index.addAll(documents);
	return { catalog, index };
}

/**
 * Two-lane search per ADR 0002: exact/startsWith over the folded catalog
 * (pinned) above MiniSearch BM25 prefix results, both diacritic-folded
 * through the canonical foldSearchTerm.
 */
export function runSearch(lanes: SearchLanes, query: string): ResultRow[] {
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

export type LanesState = { status: 'building' } | { status: 'ready'; lanes: SearchLanes };

const cache = new Map<Locale, SearchLanes>();

/**
 * Lanes for the locale, built once per process after the first frame so
 * the tab paints before the ~150-document index is tokenized; cached across
 * remounts because tab switches unmount the screen.
 */
export function useSearchLanes(locale: Locale): LanesState {
	const [state, setState] = useState<LanesState>(() => {
		const cached = cache.get(locale);
		return cached === undefined ? { status: 'building' } : { status: 'ready', lanes: cached };
	});
	useEffect(() => {
		const cached = cache.get(locale);
		if (cached !== undefined) {
			setState({ status: 'ready', lanes: cached });
			return;
		}
		setState({ status: 'building' });
		const handle = setTimeout(() => {
			const lanes = buildSearchLanes(locale);
			cache.set(locale, lanes);
			setState({ status: 'ready', lanes });
		}, 0);
		return () => clearTimeout(handle);
	}, [locale]);
	return state;
}
