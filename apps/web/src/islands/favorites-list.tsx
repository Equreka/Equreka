import type { CatalogLiteEntry } from '@equreka/content/search-options';
import { type FavoriteEntry, useFavorites } from '@equreka/core';
import { collectionLabel, type Locale, t } from '@equreka/core/i18n';
import { useEffect, useState } from 'react';
import { Icon } from '../components/react-icon';
import { entryHref } from '../lib/entry-links';
import { check2Icon, chevronRightIcon, pencilIcon, xIcon } from '../lib/icons';
import { kvLocalStorage } from '../lib/kv-local-storage';
import { COLLECTION_ORDER } from '../lib/labels';
import { localePath } from '../lib/locale-paths';
import { collectionAccent } from './collection-accent';
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
 * Legacy empty-favorites heart, drawn behind nothing and tinted from theme
 * variables so it follows light and dark without its own palette.
 */
function FavoritesEmptyArt() {
	return (
		<svg
			className="eq-art eq-art-favorites"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 800 460"
			aria-hidden="true"
			focusable="false"
		>
			<path
				className="eq-art-accent-red"
				d="M573.25977 279.26375l-46.77977 46.17-105.72023 104.32-2.13965 2.11-11.91992 11.76-24.9902-24.69-2.20019-2.17-45.69-45.13h-.00976l-14.64013-14.47-8.6499-8.55-25.76025-25.44-3.4795-3.44-41.06006-40.56a117.65792 117.65792 0 01-20.52-27.63c-.5-.91-.97022-1.83-1.43018-2.75A117.50682 117.50682 0 01342.98 80.26375h.01025c.37989.06.75.12 1.12989.2a113.60526 113.60526 0 0111.91015 2.77 117.09292 117.09292 0 0129.11961 12.93q1.4253.885 2.82031 1.8a118.17183 118.17183 0 0118.46973 15.09l.3501-.35.3501.35a118.54248 118.54248 0 0110.83007-9.58c.82959-.65 1.66993-1.29 2.50977-1.91a117.44922 117.44922 0 0190.51025-21.06 111.92113 111.92113 0 0111.91993 2.78q1.96507.55509 3.8999 1.2c1.04.34 2.08008.69 3.10986 1.07a116.42525 116.42525 0 0124.39014 12.1q2.50488 1.63494 4.93994 3.42a117.54672 117.54672 0 0114.00977 178.19z"
			/>
			<path
				className="eq-art-shade"
				d="M526.48 325.43375l-105.72023 104.32-2.13965 2.11-11.91992 11.76-24.9902-24.69-2.20019-2.17-45.69-45.13c7.34034-1.71 18.62012.64 22.75 2.68 9.79 4.83 17.84034 12.76 27.78028 17.28a46.138 46.138 0 0028.33009 3.13c17.81982-3.74 31.60986-17.52 43.77-31.08 12.15966-13.57 24.58984-28.13 41.67968-34.42 9.01028-3.32 18.68996-4.07 28.35014-3.79z"
			/>
			<path
				className="eq-art-shade"
				d="M368.87988 87.77375c-6.41992 5.07-13.31006 9.75-17.48 16.68-3.06982 5.12-4.3999 11.07-5.39013 16.95-1.91993 11.44-2.73975 23.16-6.5 34.12994-3.75 10.97-11.06983 21.45-21.91993 25.54-6.73 2.53-14.1499 2.39-21.31982 1.9-17.68994-1.2-35.5-4.37-51.41992-12.16-8.8999-4.36-17.53028-10.24-27.41992-10.89a25.39538 25.39538 0 00-6.02.33A117.494 117.494 0 01342.98 80.26375h.01025c.37989.06.75.12 1.12989.2a113.60526 113.60526 0 0111.91015 2.77 117.48205 117.48205 0 0112.84959 4.54z"
			/>
		</svg>
	);
}

/**
 * The /favorites page body: favorites grouped by collection with entry
 * links and removal (behind the legacy edit toggle), plus export/import.
 * Renders as a fragment so the toggle joins the page header row through
 * the island wrapper's `display: contents`. Display names resolve from the
 * precached catalog-lite (slug is the offline-safe fallback).
 */
export default function FavoritesList({ locale = 'en' }: FavoritesListProps) {
	const favorites = useFavorites(kvLocalStorage);
	const [catalog, setCatalog] = useState<CatalogNames | null>(null);
	const [editing, setEditing] = useState(false);

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
	const editLabel = t(locale, 'design.interactive.editFavorites');

	return (
		<>
			{groups.length > 0 && (
				<button
					type="button"
					className={`eq-btn eq-fav-edit ${editing ? 'eq-btn-success' : 'eq-btn-warning'}`}
					aria-pressed={editing}
					aria-label={editLabel}
					title={editLabel}
					onClick={() => setEditing((previous) => !previous)}
				>
					<Icon icon={editing ? check2Icon : pencilIcon} />
				</button>
			)}
			<div className="eq-fav-body">
				{groups.length === 0 ? (
					<div className="eq-card eq-fav-empty">
						<div className="eq-card-body">
							<p>{t(locale, 'favorites.none')}</p>
						</div>
					</div>
				) : (
					groups.map((group) => (
						<section
							key={group.collection}
							aria-label={collectionLabel(locale, group.collection)}
							className={collectionAccent(group.collection)}
						>
							<details className="eq-card eq-collapse" open>
								<summary className="eq-card-body eq-fav-summary">
									<Icon icon={chevronRightIcon} className="eq-collapse-chevron" />
									<h2 className="eq-collapse-title">
										{collectionLabel(locale, group.collection)}
										<span className="eq-badge eq-badge-outline eq-fav-count">
											{group.entries.length}
										</span>
									</h2>
								</summary>
								<div className="eq-card-body eq-collapse-content eq-fav-panel">
									<ul className="eq-fav-rows">
										{group.entries.map((entry) => {
											const key = `${entry.collection}:${entry.slug}`;
											const name = catalog?.names.get(key) ?? entry.slug;
											const symbol = catalog?.symbols.get(key) ?? '';
											const href = entryHref(entry.collection, entry.slug);
											return (
												<li key={key} className="eq-fav-row">
													{symbol !== '' && <span className="eq-badge-symbol">{symbol}</span>}
													<span className="eq-fav-name">
														{href !== undefined ? (
															<a className="eq-link" href={localePath(locale, href)}>
																{name}
															</a>
														) : (
															<span>{name}</span>
														)}
													</span>
													{editing && (
														<button
															type="button"
															className="eq-btn eq-btn-danger eq-btn-pill eq-fav-remove"
															aria-label={`${t(locale, 'favorites.remove')}: ${name}`}
															title={t(locale, 'favorites.removeShort')}
															onClick={() => favorites.toggle(entry.collection, entry.slug)}
														>
															<Icon icon={xIcon} />
														</button>
													)}
												</li>
											);
										})}
									</ul>
								</div>
							</details>
						</section>
					))
				)}
				{groups.length === 0 && <FavoritesEmptyArt />}
				<div className="eq-card">
					<div className="eq-card-body">
						<FavoritesTransfer locale={locale} />
					</div>
				</div>
			</div>
		</>
	);
}
