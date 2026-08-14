import { useFavorites } from '@equreka/core';
import { type Locale, t } from '@equreka/core/i18n';
import { kvLocalStorage } from '../lib/kv-local-storage';

export interface FavoriteToggleProps {
	collection: string;
	slug: string;
	locale?: Locale;
}

/**
 * Heart toggle for one entry-page header. Renders unfavorited during SSR
 * (storage is client-only); useSyncExternalStore reconciles on hydration.
 */
export default function FavoriteToggle({ collection, slug, locale = 'en' }: FavoriteToggleProps) {
	const { isFavorite, toggle } = useFavorites(kvLocalStorage);
	const active = isFavorite(collection, slug);
	const label = t(locale, active ? 'favorites.remove' : 'favorites.add');

	return (
		<button
			type="button"
			aria-pressed={active}
			aria-label={label}
			title={label}
			className={`rounded-md border border-border px-2.5 py-1.5 text-sm ${
				active ? 'text-danger' : 'text-ink-muted hover:text-ink'
			}`}
			onClick={() => toggle(collection, slug)}
		>
			<span aria-hidden="true">{active ? '♥' : '♡'}</span>
		</button>
	);
}
