import { COLLECTIONS } from '@equreka/schema';
import { isShardedCollection, SHARDED_COLLECTIONS } from './presentation-shards.js';
import { SEARCH_LOCALES } from './search-options.js';

const KIB = 1024;

const MIB = 1024 * KIB;

/**
 * How one emitted file is judged (ADR 0010). `maxBytes` caps its raw
 * compact bytes and is null for a build-only file that ships nowhere;
 * `mobileBundled` counts the file toward the mobile transfer budget and
 * storage ceiling (ADR 0015); `protects` names the cost the cap bounds and
 * is quoted in every finding.
 */
export interface ArtifactBudget {
	maxBytes: number | null;
	mobileBundled: boolean;
	protects: string;
}

/**
 * Every file the build may emit, keyed by path pattern: `<collection>`
 * matches a COLLECTIONS name, `<sharded>` one in PRESENTATION_SHARDS and
 * `<whole>` one outside it, `<locale>` a SEARCH_LOCALES code, `<shard>`
 * a lowercase hex shard id, `<equation>` an equation slug. A file that
 * matches no pattern, or several, fails the build, so no artifact ships
 * unbudgeted. `mobileBundled` must equal whether
 * `apps/mobile/shared/content/artifact.ts` imports or requires the file,
 * which a mobile test asserts. Lives apart from the emitter, with no Node
 * imports, so that test can read it.
 */
export const ARTIFACT_BUDGETS: Readonly<Record<string, ArtifactBudget>> = {
	'engine.json': {
		maxBytes: 500 * KIB,
		mobileBundled: true,
		protects: 'mobile bundle and OTA size; parsed on the first engine call',
	},
	'meta.json': {
		maxBytes: 4 * KIB,
		mobileBundled: true,
		protects: 'mobile bundle; stays a fixed-size header, never a data carrier',
	},
	'solutions.js': {
		maxBytes: 512 * KIB,
		mobileBundled: true,
		protects: 'mobile bundle and OTA size; every equation, evaluated on the first mobile solve',
	},
	'solutions.d.ts': {
		maxBytes: null,
		mobileBundled: false,
		protects: 'build-only TypeScript declarations',
	},
	'solutions/index.js': {
		maxBytes: 64 * KIB,
		mobileBundled: false,
		protects: 'web calculator island chunk; one dynamic-import case per equation',
	},
	'solutions/index.d.ts': {
		maxBytes: null,
		mobileBundled: false,
		protects: 'build-only TypeScript declarations',
	},
	'solutions/<equation>.js': {
		maxBytes: 16 * KIB,
		mobileBundled: false,
		protects: 'web transfer: the one solution chunk a calculator page loads; PWA precache',
	},
	'presentation/<whole>.json': {
		maxBytes: 2 * MIB,
		mobileBundled: true,
		protects:
			'mobile bundle; one JSON parse on the first screen of the collection; nearing the cap means sharding it in PRESENTATION_SHARDS',
	},
	'presentation/<sharded>.json': {
		maxBytes: 256 * KIB,
		mobileBundled: true,
		protects:
			'mobile bundle; the list index every list, browse and cross-reference screen of the collection parses; growth beyond the entry count means a heavy field joined its indexFields',
	},
	'presentation/<sharded>/<shard>.json': {
		maxBytes: 128 * KIB,
		mobileBundled: true,
		protects:
			'mobile bundle; one hash shard of entry details, parsed when a screen first opens an entry in it; nearing the cap means doubling the collection count in PRESENTATION_SHARDS',
	},
	'presentation/math/atlas.json': {
		maxBytes: 200 * KIB,
		mobileBundled: true,
		protects: 'mobile bundle; glyph atlas parsed with the first rendered math',
	},
	'presentation/math/bodies/<shard>.json': {
		maxBytes: 128 * KIB,
		mobileBundled: true,
		protects:
			'mobile bundle; one hash shard of pre-rendered math, parsed when a screen first renders a body in it; nearing the cap means doubling MATH_SHARD_COUNT',
	},
	'search/<locale>.json': {
		maxBytes: MIB,
		mobileBundled: false,
		protects:
			'web transfer on search focus and the 6 MiB offline install (the active locale data cache, ADR 0013)',
	},
	'search/catalog-lite.<locale>.json': {
		maxBytes: 512 * KIB,
		mobileBundled: true,
		protects:
			'web transfer and the active locale offline data cache (search, favorites, offline reader); mobile bundle',
	},
	'search/leads.<locale>.json': {
		maxBytes: 512 * KIB,
		mobileBundled: true,
		protects:
			'mobile bundle; parsed once per locale when the search tab first builds its on-device index',
	},
	'schemas/<collection>.schema.json': {
		maxBytes: null,
		mobileBundled: false,
		protects: 'build-only editor JSON Schema',
	},
	'schemas/<collection>.locale.schema.json': {
		maxBytes: null,
		mobileBundled: false,
		protects: 'build-only editor JSON Schema',
	},
};

/**
 * Budget on the `mobileBundled` files gzipped as one stream in path order:
 * the app compiles them into its one JavaScript bundle, and every OTA update
 * and store install downloads that bundle compressed, so cross-file
 * redundancy is shared and splitting a file into shards does not inflate
 * the figure (ADR 0015).
 */
export const MOBILE_TRANSFER_BUDGET_BYTES = 3 * MIB;

/**
 * Backstop on the summed raw `mobileBundled` bytes, which the installed
 * bundle stores uncompressed (ADR 0015).
 */
export const MOBILE_STORAGE_CEILING_BYTES = 16 * MIB;

/**
 * Share of a budget at which the build starts warning, so growth is seen
 * a content wave before it fails.
 */
export const BUDGET_WARN_RATIO = 0.8;

/**
 * `<equation>` excludes `index`, the name of the solutions loader, so
 * `solutions/index.js` classifies under its own row only.
 */
const PATTERN_PLACEHOLDERS: Readonly<Record<string, string>> = {
	collection: COLLECTIONS.join('|'),
	sharded: SHARDED_COLLECTIONS.join('|'),
	whole: COLLECTIONS.filter((collection) => !isShardedCollection(collection)).join('|'),
	locale: SEARCH_LOCALES.join('|'),
	shard: '[0-9a-f]+',
	equation: '(?!index\\.)[a-z0-9]+(?:-[a-z0-9]+)*',
};

function patternRegExp(pattern: string): RegExp {
	const source = pattern
		.split(/(<[a-z]+>)/)
		.map((part) => {
			const placeholder = /^<([a-z]+)>$/.exec(part)?.[1];
			if (placeholder === undefined) {
				return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			}
			const alternatives = PATTERN_PLACEHOLDERS[placeholder];
			if (alternatives === undefined) {
				throw new Error(`artifact budget pattern ${pattern}: unknown placeholder <${placeholder}>`);
			}
			return `(?:${alternatives})`;
		})
		.join('');
	return new RegExp(`^${source}$`);
}

const BUDGET_MATCHERS = Object.entries(ARTIFACT_BUDGETS).map(([pattern, budget]) => ({
	pattern,
	budget,
	regExp: patternRegExp(pattern),
}));

/**
 * The ARTIFACT_BUDGETS patterns a dist-relative path matches; a well-formed
 * table yields exactly one for every emitted file.
 */
export function artifactBudgetPatterns(relPath: string): string[] {
	return BUDGET_MATCHERS.filter((matcher) => matcher.regExp.test(relPath)).map(
		(matcher) => matcher.pattern,
	);
}
