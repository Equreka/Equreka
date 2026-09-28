import {
	type Symbol as AuthoredSymbol,
	collectionLocaleTrees,
	type Prefix,
	SOURCE_LOCALE,
	type TranslationLocale,
	type Unit,
	unit as unitSchema,
} from '@equreka/schema';
import type { LoadedContent } from './load.js';
import { ratFromDecimal, ratFromExact, ratIsZero } from './rational.js';
import { symbolText } from './tex.js';
import { type Issue, issue } from './types.js';
import { type Corpus, fileOf } from './validate.js';

type GrammarLocale = typeof SOURCE_LOCALE | TranslationLocale;

/**
 * Units after expansion: every hand unit plus every generated one.
 * `generated` holds generated slugs with no hand file; `overridden` holds
 * generated slugs whose hand file was merged over the generated fields.
 */
export interface PrefixExpansion {
	units: Map<string, Unit>;
	generated: ReadonlySet<string>;
	overridden: ReadonlySet<string>;
	issues: Issue[];
}

export interface CorpusExpansion {
	corpus: Corpus;
	generated: ReadonlySet<string>;
	overridden: ReadonlySet<string>;
	issues: Issue[];
}

/**
 * Base fields a generated unit takes verbatim: what it measures, where it
 * is filed, and the editorial state of the factor it scales.
 */
const INHERITED_FIELDS = ['unitOf', 'system', 'categories', 'branches', 'status'] as const;

/**
 * Localized unit fields, derived from the schema: an override merges these
 * per locale, so a hand `name.en` keeps the generated `name.es`.
 */
const LOCALIZED_UNIT_FIELDS: ReadonlySet<string> = new Set(
	Object.entries(collectionLocaleTrees.units.fields)
		.filter(([, node]) => node.kind === 'text')
		.map(([key]) => key),
);

/**
 * A base alias of this shape is a spelling variant (meter, liters, amps)
 * and takes the prefix name; every other alias is a notation variant (L)
 * and takes the prefix symbol.
 */
const WORD_ALIAS_RE = /^[a-z]{3,}$/;

/**
 * A single-letter prefix alias is an ASCII stand-in for the prefix symbol
 * (u for μ, ISO 2955) and composes with the base symbol: um, ug, uL.
 */
const ASCII_PREFIX_ALIAS_RE = /^[A-Za-z]$/;

/**
 * Spanish base names whose prefixed compounds are esdrújulas, stressing
 * the prefix's last vowel: kilómetro, milímetro, nanómetro. Every other
 * compound keeps the base's stress (kilogramo, mililitro, microsegundo).
 */
const ES_PREFIX_STRESSED_BASES: ReadonlySet<string> = new Set(['metro']);

const ACCENTED_VOWELS: Readonly<Record<string, string>> = {
	a: 'á',
	e: 'é',
	i: 'í',
	o: 'ó',
	u: 'ú',
};

/**
 * Lowercase inputs for one generated description: singular and plural of
 * the generated unit and its base, the prefix name, the power of ten, and
 * the symbolic identity as TeX.
 */
interface DescriptionParts {
	name: string;
	namePlural: string;
	base: string;
	basePlural: string;
	prefix: string;
	exponent: number;
	identityTex: string;
}

/**
 * Prefix + base word per locale. Keyed by every supported locale so adding
 * a translation locale fails typecheck until its grammar exists.
 */
const COMPOUNDERS: Record<
	GrammarLocale,
	(prefixName: string, baseWord: string, baseSingular: string) => string
> = {
	en: (prefixName, baseWord) =>
		`${prefixName.toLocaleLowerCase('en')}${baseWord.toLocaleLowerCase('en')}`,
	es: (prefixName, baseWord, baseSingular) => {
		const prefix = prefixName.toLocaleLowerCase('es');
		const stem = ES_PREFIX_STRESSED_BASES.has(baseSingular.toLocaleLowerCase('es'))
			? stressLastVowel(prefix)
			: prefix;
		return `${stem}${baseWord.toLocaleLowerCase('es')}`;
	},
};

/**
 * Generated description per locale. Multiples count base units in one
 * generated unit, submultiples count generated units in one base unit, so
 * every count is at least 10 and always plural. The Spanish wording names
 * "la unidad" to stay independent of the base's grammatical gender.
 */
const DESCRIBERS: Record<GrammarLocale, (parts: DescriptionParts) => string> = {
	en: (p) =>
		p.exponent > 0
			? `The ${p.name} is a decimal multiple of the ${p.base}, formed with the SI prefix ${p.prefix}: 1 ${p.name} equals ${countOf(p.exponent)} ${p.basePlural} ($${p.identityTex}$).`
			: `The ${p.name} is a decimal submultiple of the ${p.base}, formed with the SI prefix ${p.prefix}: 1 ${p.base} equals ${countOf(p.exponent)} ${p.namePlural} ($${p.identityTex}$).`,
	es: (p) =>
		p.exponent > 0
			? `Múltiplo decimal de la unidad ${p.base}, formado con el prefijo SI ${p.prefix}: 1 ${p.name} equivale a ${countOf(p.exponent)} ${p.basePlural} ($${p.identityTex}$).`
			: `Submúltiplo decimal de la unidad ${p.base}, formado con el prefijo SI ${p.prefix}: 1 ${p.base} equivale a ${countOf(p.exponent)} ${p.namePlural} ($${p.identityTex}$).`,
};

const GRAMMAR_LOCALES = Object.keys(COMPOUNDERS) as GrammarLocale[];

function stressLastVowel(word: string): string {
	const at = word.search(/[aeiou][^aeiou]*$/);
	return at === -1
		? word
		: `${word.slice(0, at)}${ACCENTED_VOWELS[word.charAt(at)] ?? word.charAt(at)}${word.slice(at + 1)}`;
}

function capitalized(text: string): string {
	return `${text.charAt(0).toLocaleUpperCase()}${text.slice(1)}`;
}

function countOf(exponent: number): string {
	const magnitude = Math.abs(exponent);
	return magnitude <= 3 ? String(10 ** magnitude) : `$10^{${magnitude}}$`;
}

function tenExponentOf(value: bigint): number | null {
	let rest = value;
	let exponent = 0;
	while (rest > 1n && rest % 10n === 0n) {
		rest /= 10n;
		exponent += 1;
	}
	return rest === 1n && exponent > 0 ? exponent : null;
}

/**
 * The n of a prefix value exactly equal to 10^n (n ≠ 0), else null.
 */
export function powerOfTenExponent(value: string): number | null {
	const { num, den } = ratFromDecimal(value);
	if (num === 1n) {
		const exponent = tenExponentOf(den);
		return exponent === null ? null : -exponent;
	}
	return den === 1n ? tenExponentOf(num) : null;
}

/**
 * A control word followed by a letter needs a separating space (`\mu m`,
 * never `\mum`); plain symbols concatenate (`k` + `m`).
 */
function joinSymbolTex(prefixTex: string, baseTex: string): string {
	return /\\[A-Za-z]+$/.test(prefixTex) && /^[A-Za-z]/.test(baseTex)
		? `${prefixTex} ${baseTex}`
		: `${prefixTex}${baseTex}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function uniqueCaseless(values: readonly unknown[]): unknown[] {
	const seen = new Set<unknown>();
	return values.filter((value) => {
		const key = typeof value === 'string' ? value.toLocaleLowerCase('en') : value;
		if (seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
}

function derivedAliases(prefix: Prefix, base: Unit): unknown[] {
	const prefixWord = prefix.name.en.toLocaleLowerCase('en');
	const baseSymbol = symbolText(base.symbol);
	const words = base.aliases.filter((alias) => WORD_ALIAS_RE.test(alias));
	const notations = base.aliases.filter((alias) => !WORD_ALIAS_RE.test(alias));
	const asciiPrefixes = prefix.aliases.filter((alias) => ASCII_PREFIX_ALIAS_RE.test(alias));
	return uniqueCaseless([
		...words.map((word) => `${prefixWord}${word}`),
		...notations.map((notation) => `${symbolText(prefix.symbol)}${notation}`),
		...asciiPrefixes.flatMap((ascii) =>
			[baseSymbol, ...notations].map((notation) => `${ascii}${notation}`),
		),
	]);
}

/**
 * The authored-shape input of one generated unit, before schema parsing:
 * localized name/plural/description per locale where both the prefix and
 * the base supply the text (else the locale is omitted and falls back to
 * English with an untranslated notice), composed symbol and aliases,
 * inherited base fields, and `prefixOf` so resolution scales the base
 * factor exactly as for a hand-authored prefixed unit.
 */
function generatedUnitInput(
	prefixSlug: string,
	prefix: Prefix,
	baseSlug: string,
	base: Unit,
	exponent: number,
): Record<string, unknown> {
	const name: Record<string, string> = {};
	const namePlural: Record<string, string> = {};
	const description: Record<string, string> = {};
	const symbol: AuthoredSymbol = {
		tex: joinSymbolTex(prefix.symbol.tex, base.symbol.tex),
		...(prefix.symbol.text === undefined && base.symbol.text === undefined
			? {}
			: { text: `${symbolText(prefix.symbol)}${symbolText(base.symbol)}` }),
	};
	const identityTex = String.raw`1\ \mathrm{${symbol.tex}} = 10^{${exponent}}\ \mathrm{${base.symbol.tex}}`;
	for (const locale of GRAMMAR_LOCALES) {
		const prefixName = prefix.name[locale];
		const baseName = base.name[locale];
		if (prefixName === undefined || baseName === undefined) {
			continue;
		}
		const compound = COMPOUNDERS[locale];
		const singular = compound(prefixName, baseName, baseName);
		name[locale] = capitalized(singular);
		const basePlural = base.namePlural?.[locale];
		if (basePlural === undefined) {
			continue;
		}
		const plural = compound(prefixName, basePlural, baseName);
		namePlural[locale] = plural;
		description[locale] = DESCRIBERS[locale]({
			name: singular,
			namePlural: plural,
			base: baseName.toLocaleLowerCase(locale),
			basePlural: basePlural.toLocaleLowerCase(locale),
			prefix: prefixName.toLocaleLowerCase(locale),
			exponent,
			identityTex,
		});
	}
	const input: Record<string, unknown> = {
		name,
		symbol,
		prefixOf: { prefix: prefixSlug, base: baseSlug },
		aliases: derivedAliases(prefix, base),
	};
	if (SOURCE_LOCALE in namePlural) {
		input.namePlural = namePlural;
		input.description = description;
	}
	const inherited = base as unknown as Record<string, unknown>;
	for (const field of INHERITED_FIELDS) {
		if (inherited[field] !== undefined) {
			input[field] = inherited[field];
		}
	}
	return input;
}

/**
 * Hand fields win: localized fields merge per locale, aliases are unioned
 * (hand notation added to the derived spellings), every other authored
 * key replaces the generated one. Keys the hand file did not author —
 * schema defaults included — keep their generated value.
 */
function mergeOverride(
	generated: Record<string, unknown>,
	authored: Record<string, unknown>,
): Record<string, unknown> {
	const merged: Record<string, unknown> = { ...generated };
	for (const [key, value] of Object.entries(authored)) {
		const generatedValue = generated[key];
		if (LOCALIZED_UNIT_FIELDS.has(key) && isRecord(generatedValue) && isRecord(value)) {
			merged[key] = { ...generatedValue, ...value };
		} else if (key === 'aliases' && Array.isArray(generatedValue) && Array.isArray(value)) {
			merged[key] = uniqueCaseless([...generatedValue, ...value]);
		} else {
			merged[key] = value;
		}
	}
	return merged;
}

interface Candidate {
	prefix: string;
	base: string;
	input: Record<string, unknown>;
}

function pairKey(prefix: string, base: string): string {
	return `${prefix} ${base}`;
}

/**
 * Stage 2b (ADR 0007): expands every base unit's `prefixes` into generated
 * `<prefix><base>` units. A hand file of a generated slug is its override
 * when it is authored as `prefixOf` the same pair; `authored` supplies the
 * raw (pre-default) data of hand files so only the fields a file actually
 * writes win. A unit missing from `authored` counts as authoring every
 * field. Errors: prefixes on an affine base, an unknown or non-power-of-ten
 * prefix, two pairs producing one slug, a hand file of a generated slug
 * that is not its override, and a `prefixOf` file for an undeclared pair
 * or under a slug other than the generated one. Nested prefixes and
 * prefixes on nonConvertible units are schema errors and never get here.
 */
export function expandPrefixedUnits(
	units: ReadonlyMap<string, Unit>,
	prefixes: ReadonlyMap<string, Prefix>,
	authored: ReadonlyMap<string, unknown>,
): PrefixExpansion {
	const issues: Issue[] = [];
	const candidates = new Map<string, Candidate>();
	for (const [baseSlug, base] of units) {
		if (base.prefixes.length === 0) {
			continue;
		}
		const file = fileOf('units', baseSlug);
		if (base.toBase !== undefined && !ratIsZero(ratFromExact(base.toBase.offset))) {
			issues.push(
				issue(
					'error',
					'expand',
					file,
					'prefixes on an affine unit (offset ≠ 0) are meaningless; remove its prefixes',
				),
			);
			continue;
		}
		for (const prefixSlug of base.prefixes) {
			const prefix = prefixes.get(prefixSlug);
			if (prefix === undefined) {
				issues.push(
					issue('error', 'expand', file, `prefixes: unknown prefixes ref '${prefixSlug}'`),
				);
				continue;
			}
			const exponent = powerOfTenExponent(prefix.value);
			if (exponent === null) {
				issues.push(
					issue(
						'error',
						'expand',
						file,
						`prefixes: '${prefixSlug}' (${prefix.value}) is not a nonzero power of ten; generated units take decimal prefixes only`,
					),
				);
				continue;
			}
			const slug = `${prefixSlug}${baseSlug}`;
			const clash = candidates.get(slug);
			if (clash !== undefined) {
				issues.push(
					issue(
						'error',
						'expand',
						file,
						`generated slug '${slug}' (${prefixSlug} × ${baseSlug}) collides with ${clash.prefix} × ${clash.base}`,
					),
				);
				continue;
			}
			candidates.set(slug, {
				prefix: prefixSlug,
				base: baseSlug,
				input: generatedUnitInput(prefixSlug, prefix, baseSlug, base, exponent),
			});
		}
	}

	const slugByPair = new Map<string, string>(
		[...candidates].map(([slug, candidate]) => [pairKey(candidate.prefix, candidate.base), slug]),
	);
	const expanded = new Map<string, Unit>();
	const generated = new Set<string>();
	const overridden = new Set<string>();

	for (const [slug, unit] of units) {
		const file = fileOf('units', slug);
		const candidate = candidates.get(slug);
		if (candidate === undefined) {
			if (unit.prefixOf !== undefined) {
				const { prefix, base } = unit.prefixOf;
				const target = slugByPair.get(pairKey(prefix, base));
				issues.push(
					issue(
						'error',
						'expand',
						file,
						target === undefined
							? `prefixOf ${prefix} × ${base} is not declared: add '${prefix}' to the prefixes of units/${base}.yaml, and this file becomes the override of the generated '${prefix}${base}'`
							: `duplicates the generated unit '${target}' (${prefix} × ${base}); rename this file to ${target}.yaml to override it`,
					),
				);
			}
			expanded.set(slug, unit);
			continue;
		}
		if (unit.prefixOf?.prefix !== candidate.prefix || unit.prefixOf.base !== candidate.base) {
			issues.push(
				issue(
					'error',
					'expand',
					file,
					`collides with the unit generated from ${candidate.prefix} × ${candidate.base} (units/${candidate.base}.yaml prefixes); a hand file of this slug must be its override, authored as prefixOf: { prefix: '${candidate.prefix}', base: '${candidate.base}' }`,
				),
			);
			expanded.set(slug, unit);
			continue;
		}
		const raw = authored.get(slug);
		const merged = unitSchema.safeParse(
			mergeOverride(
				candidate.input,
				isRecord(raw) ? raw : (unit as unknown as Record<string, unknown>),
			),
		);
		if (!merged.success) {
			for (const zodIssue of merged.error.issues) {
				const at = zodIssue.path.length > 0 ? zodIssue.path.join('.') : '(root)';
				issues.push(issue('error', 'expand', file, `override: ${at}: ${zodIssue.message}`));
			}
			expanded.set(slug, unit);
			continue;
		}
		expanded.set(slug, merged.data);
		overridden.add(slug);
	}

	for (const [slug, candidate] of candidates) {
		if (units.has(slug)) {
			continue;
		}
		const parsed = unitSchema.safeParse(candidate.input);
		if (!parsed.success) {
			for (const zodIssue of parsed.error.issues) {
				const at = zodIssue.path.length > 0 ? zodIssue.path.join('.') : '(root)';
				issues.push(
					issue(
						'error',
						'expand',
						fileOf('units', candidate.base),
						`generated unit '${slug}': ${at}: ${zodIssue.message}`,
					),
				);
			}
			continue;
		}
		expanded.set(slug, parsed.data);
		generated.add(slug);
	}

	return { units: expanded, generated, overridden, issues };
}

/**
 * `expandPrefixedUnits` over a validated corpus, reading authored keys from
 * the loaded (sidecar-merged, pre-validation) unit files. Returns a new
 * corpus; the input is not mutated.
 */
export function expandCorpus(corpus: Corpus, loaded: LoadedContent): CorpusExpansion {
	const authored = new Map<string, unknown>(
		(loaded.byCollection.get('units') ?? []).map((entry) => [entry.file.slug, entry.data]),
	);
	const expansion = expandPrefixedUnits(corpus.units, corpus.prefixes, authored);
	return {
		corpus: { ...corpus, units: expansion.units },
		generated: expansion.generated,
		overridden: expansion.overridden,
		issues: expansion.issues,
	};
}
