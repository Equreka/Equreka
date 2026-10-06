import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripMacrosToText } from '@equreka/content/rich-text';
import { COLLECTION_ORDER } from '@equreka/core/collections';
import type { EngineSlice } from '@equreka/schema';
import type { AstroIntegration } from 'astro';

const requireFromHere = createRequire(import.meta.url);

/**
 * Poppins weights the legacy design downloaded (headings and chrome only);
 * latin subset woff2, served from public/fonts/ and precached.
 */
const POPPINS_FILES = ['poppins-latin-500-normal.woff2', 'poppins-latin-600-normal.woff2'] as const;

/**
 * The legacy icon web font, served from public/fonts/ and precached. The
 * shell draws its icons as glyphs of this font because the original did,
 * and text rasterization (LCD antialiasing on opaque surfaces) differs
 * from SVG paths: the parity harness measures 0 diff only with the font.
 */
const ICON_FONT_FILE = 'bootstrap-icons.woff2';

/**
 * Locales with runtime payloads — one search index, converter payload,
 * reader payload and paths payload each. Mirrors @equreka/core/i18n LOCALES.
 */
const LOCALES = ['en', 'es'] as const;

type PayloadLocale = (typeof LOCALES)[number];

/**
 * Raw-byte ceiling per locale of each derived payload (ADR 0010). Islands
 * fetch them and the PWA precaches all of them, so every byte is paid on
 * first install and counts against the 6 MiB precache budget.
 */
const PAYLOAD_BUDGETS = {
	converter: 256 * 1024,
	reader: 1024 * 1024,
	paths: 128 * 1024,
} as const;

type PayloadKind = keyof typeof PAYLOAD_BUDGETS;

/**
 * Share of a payload budget at which the build warns, matching the content
 * pipeline's artifact budgets.
 */
const PAYLOAD_WARN_RATIO = 0.8;

/**
 * Fails the build over budget and warns from PAYLOAD_WARN_RATIO of it.
 */
function enforcePayloadBudget(
	relPath: string,
	kind: PayloadKind,
	text: string,
	warn: (message: string) => void,
): void {
	const bytes = Buffer.byteLength(text, 'utf8');
	const maxBytes = PAYLOAD_BUDGETS[kind];
	if (bytes > maxBytes) {
		throw new Error(`${relPath} is ${bytes} bytes, over its ${maxBytes}-byte budget (ADR 0010)`);
	}
	if (bytes >= maxBytes * PAYLOAD_WARN_RATIO) {
		warn(
			`${relPath} is ${bytes} bytes, ${((bytes / maxBytes) * 100).toFixed(1)}% of its ${maxBytes}-byte budget`,
		);
	}
}

interface LocalizedField {
	en: string;
	es?: string;
}

function localized(field: LocalizedField, locale: PayloadLocale): string {
	return field[locale] ?? field.en;
}

/**
 * Client slice of the engine artifact for the converter island: per-unit
 * conversion parameters and per-magnitude picker metadata only — no TeX, no
 * prefixes/constants/equations, names flattened to locale-resolved strings
 * (es falls back to en while content is untranslated). Unit `magnitudes`
 * and magnitude `kindOf` carry the quantity-kind scope (ADR 0006). The
 * island rebuilds an EngineSlice-shaped object from this at runtime.
 */
export interface ConverterPayload {
	units: Record<
		string,
		{
			name: string;
			symbolText: string;
			magnitudes: string[];
			dimension: number[];
			factor: string;
			offset: string;
			exact: boolean;
			affine: boolean;
		}
	>;
	magnitudes: Record<
		string,
		{ name: string; baseUnit: string; dimension: number[]; kindOf?: string }
	>;
}

/**
 * One step of a path as the offline reader lists it: the step kind plus a
 * locale-resolved title (the entry's name, the check's prompt; empty for
 * prose, which the reader labels by kind alone).
 */
export interface ReaderOutlineItem {
	kind: string;
	title: string;
}

/**
 * One entry of the offline reader payload: locale-resolved
 * name/symbol/description, plus the step outline for paths. Descriptions
 * keep their inline $TeX$ fragments (the reader renders them as plain
 * text) but semantic annotation macros are reduced to their arguments —
 * the reader must work from data alone, without KaTeX.
 */
export interface ReaderEntry {
	name: string;
	symbolText: string;
	description: string;
	outline?: ReaderOutlineItem[];
}

/**
 * The offline reader's slice of the presentation artifact, keyed collection
 * → slug. Every collection with per-entry presentation data is included so
 * the reader resolves any entry, not just units.
 */
export type ReaderPayload = Record<string, Record<string, ReaderEntry>>;

/**
 * The learning-path context payload the dormant PathContextBar fetches on
 * entry pages carrying `?path=&step=`: every path's name and ordered steps,
 * locale-resolved and small enough to precache. Routes are derived on the
 * client from (collection, slug) through entryHref — the artifact stays
 * platform-neutral (ADR 0004).
 */
export type PathsPayload = Record<
	string,
	{
		name: string;
		steps: {
			id: string;
			kind: 'entry' | 'prose' | 'check';
			collection?: string;
			slug?: string;
			title: string;
		}[];
	}
>;

/**
 * Structural subset of @equreka/content's PresentationPathStep: entry steps
 * carry the pipeline-resolved target.
 */
type PresentationPathStep =
	| {
			id: string;
			kind: 'entry';
			ref: { collection: string; slug: string };
			target: { name: LocalizedField; symbolText: string };
	  }
	| { id: string; kind: 'prose'; body: LocalizedField }
	| { id: string; kind: 'check'; prompt: LocalizedField; answer: LocalizedField };

interface PresentationEntry {
	name: LocalizedField;
	symbolText?: string;
	description?: { en?: string; es?: string };
	steps?: PresentationPathStep[];
}

function readPresentation(collection: string): Record<string, PresentationEntry> {
	return JSON.parse(
		readFileSync(
			requireFromHere.resolve(`@equreka/content/artifact/presentation/${collection}.json`),
			'utf8',
		),
	) as Record<string, PresentationEntry>;
}

function outlineTitle(step: PresentationPathStep, locale: PayloadLocale): string {
	switch (step.kind) {
		case 'entry':
			return step.target.symbolText === ''
				? localized(step.target.name, locale)
				: `${localized(step.target.name, locale)} (${step.target.symbolText})`;
		case 'check':
			return localized(step.prompt, locale);
		case 'prose':
			return '';
	}
}

function buildReaderPayload(locale: PayloadLocale): string {
	const payload: ReaderPayload = {};
	for (const collection of COLLECTION_ORDER) {
		const slice: Record<string, ReaderEntry> = {};
		for (const [slug, entry] of Object.entries(readPresentation(collection))) {
			const description = entry.description?.[locale] ?? entry.description?.en ?? '';
			const reader: ReaderEntry = {
				name: localized(entry.name, locale),
				symbolText: entry.symbolText ?? '',
				description: stripMacrosToText(description),
			};
			if (entry.steps !== undefined) {
				reader.outline = entry.steps.map((step) => ({
					kind: step.kind,
					title: outlineTitle(step, locale),
				}));
			}
			slice[slug] = reader;
		}
		payload[collection] = slice;
	}
	return JSON.stringify(payload);
}

function buildPathsPayload(locale: PayloadLocale): string {
	const payload: PathsPayload = {};
	for (const [slug, entry] of Object.entries(readPresentation('paths'))) {
		payload[slug] = {
			name: localized(entry.name, locale),
			steps: (entry.steps ?? []).map((step) =>
				step.kind === 'entry'
					? {
							id: step.id,
							kind: step.kind,
							collection: step.ref.collection,
							slug: step.ref.slug,
							title: localized(step.target.name, locale),
						}
					: { id: step.id, kind: step.kind, title: '' },
			),
		};
	}
	return JSON.stringify(payload);
}

export function buildConverterPayload(slice: EngineSlice, locale: PayloadLocale): ConverterPayload {
	const payload: ConverterPayload = { units: {}, magnitudes: {} };
	for (const unit of Object.values(slice.units)) {
		payload.units[unit.slug] = {
			name: localized(unit.name, locale),
			symbolText: unit.symbolText,
			magnitudes: unit.magnitudes,
			dimension: unit.dimension,
			factor: unit.factor,
			offset: unit.offset,
			exact: unit.exact,
			affine: unit.affine,
		};
	}
	for (const magnitude of Object.values(slice.magnitudes)) {
		payload.magnitudes[magnitude.slug] = {
			name: localized(magnitude.name, locale),
			baseUnit: magnitude.baseUnit,
			dimension: magnitude.dimension,
			...(magnitude.kindOf === undefined ? {} : { kindOf: magnitude.kindOf }),
		};
	}
	return payload;
}

/**
 * Materializes the static assets the pages and islands fetch at runtime:
 * self-hosted KaTeX CSS + woff2 fonts, the Poppins display faces and the
 * icon font (no CDN per ADR 0002), the per-locale MiniSearch index +
 * catalog-lite shards, the trimmed converter payloads, the offline reader
 * payloads and the learning-path context payloads, each derived payload
 * held to its PAYLOAD_BUDGETS entry. Runs at config setup so both
 * `astro dev` and `astro build` serve them from public/ (the generated
 * paths are gitignored).
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

				const poppinsDir = join(
					dirname(requireFromHere.resolve('@fontsource/poppins/package.json')),
					'files',
				);
				const fontsOutDir = join(publicDir, 'fonts');
				mkdirSync(fontsOutDir, { recursive: true });
				for (const font of POPPINS_FILES) {
					copyFileSync(join(poppinsDir, font), join(fontsOutDir, font));
				}
				copyFileSync(
					requireFromHere.resolve(`bootstrap-icons/font/fonts/${ICON_FONT_FILE}`),
					join(fontsOutDir, ICON_FONT_FILE),
				);

				const searchOutDir = join(publicDir, 'search');
				mkdirSync(searchOutDir, { recursive: true });

				const slice = JSON.parse(
					readFileSync(requireFromHere.resolve('@equreka/content/artifact/engine.json'), 'utf8'),
				) as EngineSlice;
				const dataOutDir = join(publicDir, 'data');
				mkdirSync(dataOutDir, { recursive: true });
				rmSync(join(dataOutDir, 'units.en.json'), { force: true });

				let payloadBytes = 0;
				for (const locale of LOCALES) {
					copyFileSync(
						requireFromHere.resolve(`@equreka/content/artifact/search/${locale}.json`),
						join(searchOutDir, `${locale}.json`),
					);
					copyFileSync(
						requireFromHere.resolve(`@equreka/content/artifact/search/catalog-lite.${locale}.json`),
						join(searchOutDir, `catalog-lite.${locale}.json`),
					);
					const payloads: Record<PayloadKind, string> = {
						converter: JSON.stringify(buildConverterPayload(slice, locale)),
						reader: buildReaderPayload(locale),
						paths: buildPathsPayload(locale),
					};
					for (const kind of Object.keys(PAYLOAD_BUDGETS) as PayloadKind[]) {
						const text = payloads[kind];
						const fileName = `${kind}.${locale}.json`;
						enforcePayloadBudget(`data/${fileName}`, kind, text, (message) => logger.warn(message));
						writeFileSync(join(dataOutDir, fileName), text);
						payloadBytes += Buffer.byteLength(text, 'utf8');
					}
				}

				logger.info(
					`katex css + ${woff2Fonts.length} woff2 fonts, ${POPPINS_FILES.length} Poppins faces, icon font, ${LOCALES.length}-locale search index, converter + reader + paths payloads (${payloadBytes} bytes)`,
				);
			},
		},
	};
}
