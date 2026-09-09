import type { CatalogLiteEntry } from '@equreka/content/search-options';
import { type FavoriteEntry, useFavorites } from '@equreka/core';
import { collectionLabel, type Locale, t } from '@equreka/core/i18n';
import { useEffect, useState } from 'react';
import { entryHref } from '../lib/entry-links';
import { kvLocalStorage } from '../lib/kv-local-storage';
import { COLLECTION_ORDER } from '../lib/labels';
import { localePath } from '../lib/locale-paths';
import FavoritesTransfer from './favorites-transfer';

export interface FavoritesListProps {
	locale?: Locale;
}

interface FavoriteGroup {
	collection: string;
	entries: FavoriteEntry[];
}

interface CatalogNames {
	names: Map<string, string>;
	symbols: Map<string, string>;
}

function groupFavorites(favorites: readonly FavoriteEntry[]): FavoriteGroup[] {
	const byCollection = new Map<string, FavoriteEntry[]>();
	for (const entry of favorites) {
		const bucket = byCollection.get(entry.collection);
		if (bucket === undefined) {
			byCollection.set(entry.collection, [entry]);
		} else {
			bucket.push(entry);
		}
	}
	const order = (collection: string): number => {
		const index = (COLLECTION_ORDER as readonly string[]).indexOf(collection);
		return index === -1 ? COLLECTION_ORDER.length : index;
	};
	return [...byCollection.entries()]
		.map(([collection, entries]) => ({ collection, entries }))
		.sort((a, b) => order(a.collection) - order(b.collection));
}

/**
 * The /favorites page body: favorites grouped by collection with entry
 * links and removal, plus export/import. Display names resolve from the
 * precached catalog-lite (slug is the offline-safe fallback).
 */
export default function FavoritesList({ locale = 'en' }: FavoritesListProps) {
	const favorites = useFavorites(kvLocalStorage);
	const [catalog, setCatalog] = useState<CatalogNames | null>(null);

	useEffect(() => {
		let cancelled = false;
		fetch(`/search/catalog-lite.${locale}.json`)
			.then((response) => {
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				return response.json() as Promise<CatalogLiteEntry[]>;
			})
			.then((entries) => {
				if (cancelled) return;
				const names = new Map<string, string>();
				const symbols = new Map<string, string>();
				for (const entry of entries) {
					names.set(`${entry.collection}:${entry.slug}`, entry.name);
					symbols.set(`${entry.collection}:${entry.slug}`, entry.symbolText);
				}
				setCatalog({ names, symbols });
			})
			.catch(() => {
				if (!cancelled) setCatalog(null);
			});
		return () => {
			cancelled = true;
		};
	}, [locale]);

	const groups = groupFavorites(favorites.favorites);

	return (
		<div className="mt-6 grid gap-8">
			{groups.length === 0 ? (
				<p className="text-ink-muted">{t(locale, 'favorites.none')}</p>
			) : (
				groups.map((group) => (
					<section key={group.collection} aria-label={collectionLabel(locale, group.collection)}>
						<h2 className="text-xl font-semibold">
							{collectionLabel(locale, group.collection)}
							<span className="ml-2 text-sm font-normal text-ink-muted">
								{group.entries.length}
							</span>
						</h2>
						<ul className="mt-3 divide-y divide-border rounded-md border border-border bg-surface">
							{group.entries.map((entry) => {
								const key = `${entry.collection}:${entry.slug}`;
								const name = catalog?.names.get(key) ?? entry.slug;
								const symbol = catalog?.symbols.get(key) ?? '';
								const href = entryHref(entry.collection, entry.slug);
								return (
									<li key={key} className="flex items-baseline gap-2 px-3 py-2">
										{href !== undefined ? (
											<a className="text-accent hover:underline" href={localePath(locale, href)}>
												{name}
											</a>
										) : (
											<span>{name}</span>
										)}
										{symbol !== '' && (
											<span className="font-mono text-sm text-ink-muted">{symbol}</span>
										)}
										<button
											type="button"
											className="ml-auto text-sm text-ink-muted hover:text-danger"
											aria-label={`${t(locale, 'favorites.remove')}: ${name}`}
											onClick={() => favorites.toggle(entry.collection, entry.slug)}
										>
											{t(locale, 'favorites.removeShort')}
										</button>
									</li>
								);
							})}
						</ul>
					</section>
				))
			)}
			<FavoritesTransfer locale={locale} />
		</div>
	);
}
