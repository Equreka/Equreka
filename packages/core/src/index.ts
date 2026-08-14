/**
 * Shared platform-neutral React layer: the KVStorage port, favorites and
 * settings hooks, and the typed i18n catalogs. No react-dom, no
 * react-native — enforced by the biome boundary preset.
 */
export const CORE_VERSION = 1;

export {
	FAVORITES_KEY,
	type FavoriteEntry,
	type FavoritesEnvelope,
	migrateLegacyFavorites,
	type UseFavorites,
	useFavorites,
} from './hooks/use-favorites';
export {
	DEFAULT_SETTINGS,
	SETTINGS_KEY,
	type Settings,
	type ThemeSetting,
	type UseSettings,
	useSettings,
} from './hooks/use-settings';
export type { KVStorage } from './ports/kv-storage';
