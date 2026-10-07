import {
	type CollectionName,
	collectionLocaleTrees,
	SOURCE_LOCALE,
	TRANSLATION_LOCALES,
	type TranslationLocale,
} from '@equreka/schema';
import { localizedPositions } from './locale-sidecar.js';

export type ProseLocale = typeof SOURCE_LOCALE | TranslationLocale;

const LOCALES: readonly ProseLocale[] = [SOURCE_LOCALE, ...TRANSLATION_LOCALES];

/**
 * The prose position migrated from the legacy app: tex-allowlist.json may
 * downgrade its math failures to warnings. Every other prose position is
 * new content with no legacy debt.
 */
const LEGACY_PROSE_PATH = 'description';

/**
 * One locale's text at one prose position. `path` is the sidecar-form
 * position (`description`, `steps.<id>.body`), so a finding names the key an
 * author or translator edits.
 */
export interface ProseField {
	readonly path: string;
	readonly locale: ProseLocale;
	readonly text: string;
	readonly downgradable: boolean;
}

/**
 * Every rich-text position an entity fills — those its schema declares
 * `localizedProse` — per locale, in schema field order, then locale order.
 */
export function proseFields(collection: CollectionName, entity: unknown): ProseField[] {
	return localizedPositions(collectionLocaleTrees[collection], entity)
		.filter((position) => position.prose)
		.flatMap(({ path, text }) =>
			LOCALES.flatMap((locale) => {
				const value = text[locale];
				return typeof value === 'string'
					? [{ path, locale, text: value, downgradable: path === LEGACY_PROSE_PATH }]
					: [];
			}),
		);
}

/**
 * Whether the field sits on the entity itself (`description`) rather than
 * inside one of its parts (`steps.<id>.note`): stage reports list every
 * entity's own text before any part's.
 */
export function isEntityLevel(field: ProseField): boolean {
	return !field.path.includes('.');
}
