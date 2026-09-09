/**
 * Shared platform-neutral React layer: the KVStorage port, favorites,
 * path-progress and settings hooks, the export/import envelope, and the
 * typed i18n catalogs. No react-dom, no
 * react-native — enforced by the biome boundary preset.
 */
export const CORE_VERSION = 1;

export {
	FAVORITES_KEY,
	type FavoriteEntry,
	migrateLegacyFavorites,
	type UseFavorites,
	useFavorites,
} from './hooks/use-favorites';
export {
	PATH_PROGRESS_KEY,
	type PathProgressRecord,
	type UsePathProgress,
	usePathProgress,
} from './hooks/use-path-progress';
export {
	DEFAULT_SETTINGS,
	SETTINGS_KEY,
	type Settings,
	type ThemeSetting,
	type UseSettings,
	useSettings,
} from './hooks/use-settings';
export type { KVStorage } from './ports/kv-storage';
export {
	exportEnvelope,
	type FavoritesEnvelope,
	type ImportResult,
	importEnvelope,
	type TransferEnvelope,
} from './transfer';
