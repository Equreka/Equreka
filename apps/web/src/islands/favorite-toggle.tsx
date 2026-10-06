import { useFavorites } from '@equreka/core';
import { type Locale, t } from '@equreka/core/i18n';
import { kvLocalStorage } from '../lib/kv-local-storage';
import { LegacyGlyph } from './legacy-glyph';

export interface FavoriteToggleProps {
	collection: string;
	slug: string;
	locale?: Locale;
}

/**
 * Heart toggle for one entry-page header. Both glyphs of the legacy icon
 * font render; CSS shows the filled one when saved or hovered (the legacy
 * preview). Renders unfavorited during SSR (storage is client-only);
 * useSyncExternalStore reconciles on hydration.
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
			className="eq-page-action eq-favorite-toggle"
			onClick={() => toggle(collection, slug)}
		>
			<LegacyGlyph name="heart" className="eq-favorite-off" />
			<LegacyGlyph name="heart-fill" className="eq-favorite-on" />
		</button>
	);
}
