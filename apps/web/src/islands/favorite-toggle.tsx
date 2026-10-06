import { useFavorites } from '@equreka/core';
import { type Locale, t } from '@equreka/core/i18n';
import { Icon } from '../components/react-icon';
import { heartFillIcon, heartIcon } from '../lib/icons';
import { kvLocalStorage } from '../lib/kv-local-storage';

export interface FavoriteToggleProps {
	collection: string;
	slug: string;
	locale?: Locale;
}

/**
 * Heart toggle for one entry-page header. Both glyphs render; CSS shows
 * the filled one when saved or hovered (the legacy preview). Renders
 * unfavorited during SSR (storage is client-only); useSyncExternalStore
 * reconciles on hydration.
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
			<Icon icon={heartIcon} className="eq-favorite-off" />
			<Icon icon={heartFillIcon} className="eq-favorite-on" />
		</button>
	);
}
