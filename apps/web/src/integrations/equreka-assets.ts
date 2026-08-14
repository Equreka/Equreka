import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EngineSlice } from '@equreka/schema';
import type { AstroIntegration } from 'astro';

const requireFromHere = createRequire(import.meta.url);

/**
 * Client slice of the engine artifact for the converter island: per-unit
 * conversion parameters and per-magnitude picker metadata only — no TeX, no
 * prefixes/constants/equations, English names flattened to strings. The
 * island rebuilds an EngineSlice-shaped object from this at runtime.
 */
export interface ConverterPayload {
	units: Record<
		string,
		{
			name: string;
			symbolText: string;
			dimension: number[];
			factor: string;
			offset: string;
			exact: boolean;
			affine: boolean;
		}
	>;
	magnitudes: Record<string, { name: string; baseUnit: string; dimension: number[] }>;
}

/**
 * One entry of the offline reader payload: English name/symbol/description
 * only. Descriptions keep their inline $TeX$ fragments (the reader renders
 * them as plain text) but semantic annotation macros are reduced to their
 * arguments — the reader must work from data alone, without KaTeX.
 */
export interface ReaderEntry {
	name: string;
	symbolText: string;
	description: string;
}

/**
 * The offline reader's slice of the presentation artifact, keyed collection
 * → slug. Every collection with per-entry presentation data is included so
 * the reader resolves any entry, not just units.
 */
export type ReaderPayload = Record<string, Record<string, ReaderEntry>>;

/**
 * Presentation collections flattened into the reader payload; paths is
 * excluded (empty in v1 and step-structured rather than entry-shaped).
 */
const READER_COLLECTIONS = [
	'categories',
	'magnitudes',
	'units',
	'prefixes',
	'constants',
	'variables',
	'equations',
] as const;

interface PresentationEntry {
	name: { en: string };
	symbolText?: string;
	description?: { en?: string };
}

const SEMANTIC_MACRO_RE = /\\(?:mag|const|var)\{([^{}]*)\}/g;

function buildReaderPayload(): string {
	const payload: ReaderPayload = {};
	for (const collection of READER_COLLECTIONS) {
		const entries = JSON.parse(
			readFileSync(
				requireFromHere.resolve(`@equreka/content/artifact/presentation/${collection}.json`),
				'utf8',
			),
		) as Record<string, PresentationEntry>;
		const slice: Record<string, ReaderEntry> = {};
		for (const [slug, entry] of Object.entries(entries)) {
			slice[slug] = {
				name: entry.name.en,
				symbolText: entry.symbolText ?? '',
				description: (entry.description?.en ?? '').replace(SEMANTIC_MACRO_RE, '$1'),
			};
		}
		payload[collection] = slice;
	}
	return JSON.stringify(payload);
}

function buildConverterPayload(slice: EngineSlice): ConverterPayload {
	const payload: ConverterPayload = { units: {}, magnitudes: {} };
	for (const unit of Object.values(slice.units)) {
		payload.units[unit.slug] = {
			name: unit.name.en,
			symbolText: unit.symbolText,
			dimension: unit.dimension,
			factor: unit.factor,
			offset: unit.offset,
			exact: unit.exact,
			affine: unit.affine,
		};
	}
	for (const magnitude of Object.values(slice.magnitudes)) {
		payload.magnitudes[magnitude.slug] = {
			name: magnitude.name.en,
			baseUnit: magnitude.baseUnit,
			dimension: magnitude.dimension,
		};
	}
	return payload;
}

/**
 * Materializes the static assets the pages and islands fetch at runtime:
 * self-hosted KaTeX CSS + woff2 fonts (no CDN per ADR 0002), the MiniSearch
 * index + catalog-lite shards, the trimmed converter payload, and the
 * offline reader payload. Runs at config setup so both `astro dev` and
 * `astro build` serve them from public/ (the generated paths are
 * gitignored).
 */
export function equrekaAssets(): AstroIntegration {
	return {
		name: 'equreka-assets',
		hooks: {
			'astro:config:setup': ({ config, logger }) => {
				const publicDir = fileURLToPath(config.publicDir);

				const katexCss = requireFromHere.resolve('katex/dist/katex.min.css');
				const katexFontsDir = join(dirname(katexCss), 'fonts');
				const katexOutDir = join(publicDir, 'katex');
				mkdirSync(join(katexOutDir, 'fonts'), { recursive: true });
				copyFileSync(katexCss, join(katexOutDir, 'katex.min.css'));
				const woff2Fonts = readdirSync(katexFontsDir).filter((name) => name.endsWith('.woff2'));
				for (const font of woff2Fonts) {
					copyFileSync(join(katexFontsDir, font), join(katexOutDir, 'fonts', font));
				}

				const searchOutDir = join(publicDir, 'search');
				mkdirSync(searchOutDir, { recursive: true });
				copyFileSync(
					requireFromHere.resolve('@equreka/content/artifact/search/en.json'),
					join(searchOutDir, 'en.json'),
				);
				copyFileSync(
					requireFromHere.resolve('@equreka/content/artifact/search/catalog-lite.en.json'),
					join(searchOutDir, 'catalog-lite.en.json'),
				);

				const slice = JSON.parse(
					readFileSync(requireFromHere.resolve('@equreka/content/artifact/engine.json'), 'utf8'),
				) as EngineSlice;
				const dataOutDir = join(publicDir, 'data');
				mkdirSync(dataOutDir, { recursive: true });
				const payload = JSON.stringify(buildConverterPayload(slice));
				writeFileSync(join(dataOutDir, 'converter.en.json'), payload);

				const readerPayload = buildReaderPayload();
				writeFileSync(join(dataOutDir, 'reader.en.json'), readerPayload);
				rmSync(join(dataOutDir, 'units.en.json'), { force: true });

				logger.info(
					`katex css + ${woff2Fonts.length} woff2 fonts, search index, converter payload (${payload.length} bytes), reader payload (${readerPayload.length} bytes)`,
				);
			},
		},
	};
}
