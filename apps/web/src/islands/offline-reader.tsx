import { splitRichText } from '@equreka/content/rich-text';
import { type CatalogLiteEntry, foldSearchTerm } from '@equreka/content/search-options';
import { collectionLabel, type Locale, type MessageKey, t } from '@equreka/core/i18n';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import type { ReaderPayload } from '../integrations/equreka-assets';
import { localePayloadUrl } from '../lib/locale-payloads';
import { collectionAccent } from './collection-accent';

type ReaderState =
	| { status: 'loading' }
	| { status: 'error' }
	| { status: 'ready'; catalog: CatalogLiteEntry[]; entries: ReaderPayload };

interface SelectedEntry {
	collection: string;
	slug: string;
}

const ENTRY_PATH_RE =
	/^\/(?:es\/)?(units|magnitudes|constants|equations|categories|branches|paths)\/([^/]+)\/?$/;

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
	return splitRichText(text).map((segment, index) =>
		segment.t === 'text' ? (
			segment.v
		) : (
			<span key={`${index}-${segment.tex}`} className="font-mono text-sm">
				{segment.tex}
			</span>
		),
	);
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
			fetch(localePayloadUrl('catalog-lite', locale)).then((response) => {
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				return response.json() as Promise<CatalogLiteEntry[]>;
			}),
			fetch(localePayloadUrl('reader', locale)).then((response) => {
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
		return <p className="eq-tool-message">{t(locale, 'offline.loading')}</p>;
	}
	if (state.status === 'error') {
		return (
			<p role="alert" className="eq-tool-error">
				{t(locale, 'offline.error')}
			</p>
		);
	}

	const selectedEntry =
		selected === null ? undefined : state.entries[selected.collection]?.[selected.slug];

	return (
		<div className="eq-reader">
			{selected !== null && (
				<article className={`eq-card eq-card-accent ${collectionAccent(selected.collection)}`}>
					<div className="eq-card-body">
						{selectedEntry === undefined ? (
							<p className="eq-tool-message">{t(locale, 'offline.notCached')}</p>
						) : (
							<>
								<div className="eq-reader-heading">
									<h2>{selectedEntry.name}</h2>
									{selectedEntry.symbolText !== '' && (
										<span className="eq-reader-symbol">{selectedEntry.symbolText}</span>
									)}
									<span className="eq-badge eq-badge-accent">
										{collectionLabel(locale, selected.collection)}
									</span>
								</div>
								{selectedEntry.description !== '' && (
									<p className="eq-reader-description">
										{plainMathText(selectedEntry.description)}
									</p>
								)}
								{selectedEntry.outline !== undefined && (
									<section aria-labelledby="offline-outline-heading" className="eq-reader-outline">
										<h3 id="offline-outline-heading">{t(locale, 'offline.outline')}</h3>
										<ol>
											{selectedEntry.outline.map((item, index) => (
												<li key={`${index}-${item.kind}`}>
													<span className="eq-label">
														{t(locale, STEP_KIND_KEYS[item.kind] ?? 'path.steps')}
													</span>
													{item.title !== '' && <span>{plainMathText(item.title)}</span>}
												</li>
											))}
										</ol>
									</section>
								)}
							</>
						)}
					</div>
				</article>
			)}
			<section aria-labelledby="offline-library-heading" className="eq-card">
				<div className="eq-card-body">
					<h2 id="offline-library-heading" className="eq-collapse-title mb-3">
						{t(locale, 'offline.browse')}
					</h2>
					<input
						type="search"
						aria-label={t(locale, 'offline.filterAria')}
						placeholder={t(locale, 'offline.filterPlaceholder')}
						className="eq-input eq-reader-filter"
						value={filter}
						onChange={(event) => setFilter(event.target.value)}
					/>
					<ul className="eq-reader-rows">
						{rows.map((entry) => (
							<li key={`${entry.collection}:${entry.slug}`}>
								{state.entries[entry.collection]?.[entry.slug] !== undefined ? (
									<button
										type="button"
										className="eq-reader-row"
										onClick={() => setSelected({ collection: entry.collection, slug: entry.slug })}
									>
										{entry.symbolText !== '' && (
											<span className="eq-badge-symbol">{entry.symbolText}</span>
										)}
										<span className="eq-reader-name">{entry.name}</span>
										<span className="eq-reader-collection">
											{collectionLabel(locale, entry.collection)}
										</span>
									</button>
								) : (
									<span className="eq-reader-row">
										{entry.symbolText !== '' && (
											<span className="eq-badge-symbol">{entry.symbolText}</span>
										)}
										<span className="eq-reader-name">{entry.name}</span>
										<span className="eq-reader-collection">
											{collectionLabel(locale, entry.collection)}
										</span>
									</span>
								)}
							</li>
						))}
						{rows.length === 0 && (
							<li className="eq-reader-empty">{t(locale, 'offline.noMatch')}</li>
						)}
					</ul>
				</div>
			</section>
		</div>
	);
}
