import type { Symbol as AuthoredSymbol } from '@equreka/schema';
import { termIdentifier, termMacroPattern } from '../rich-text.js';
import { RESERVED_FUNCTION_NAMES } from './solution-parser.js';

export interface MacroUse {
	kind: 'magnitude' | 'constant' | 'variable';
	arg: string;
}

const MACRO_KINDS: Record<string, MacroUse['kind']> = {
	mag: 'magnitude',
	const: 'constant',
	var: 'variable',
};

export function macroUses(tex: string): MacroUse[] {
	const uses: MacroUse[] = [];
	for (const match of tex.matchAll(termMacroPattern())) {
		const kind = MACRO_KINDS[match[1] ?? ''];
		if (kind !== undefined) {
			uses.push({ kind, arg: match[2] ?? '' });
		}
	}
	return uses;
}

export { canonicalTex, stripMacros } from '../rich-text.js';

export function stripMacrosWith(tex: string, replaceArg: (arg: string) => string): string {
	return tex.replace(
		termMacroPattern(),
		(_whole, _kind: string, arg: string) => `{${replaceArg(arg)}}`,
	);
}

/**
 * True when an annotation macro can carry `key` whole: `\var{<key>}` must
 * match the macro pattern with exactly `key` as its argument, so unbalanced
 * braces or nesting deeper than one level fail here instead of leaving the
 * term silently unmatched in every expression.
 */
export function isCarriableTermKey(key: string): boolean {
	const match = termMacroPattern().exec(`\\var{${key}}`);
	return match?.index === 0 && match[2] === key;
}

const DASH_RE = /[–—−]/g;

/**
 * En dash, em dash, and Unicode minus all render as a minus in math mode but
 * fail strict KaTeX; the legacy corpus authored them freely (e.g. ampere).
 */
export function normalizeDashes(text: string): { text: string; changed: boolean } {
	if (!DASH_RE.test(text)) {
		return { text, changed: false };
	}
	return { text: text.replace(DASH_RE, '-'), changed: true };
}

export interface TexFragment {
	tex: string;
	display: boolean;
}

const FRAGMENT_RE = /\$\$([^$]+)\$\$|\$([^$\n]+)\$/g;

export function extractTexFragments(text: string): TexFragment[] {
	const fragments: TexFragment[] = [];
	for (const match of text.matchAll(FRAGMENT_RE)) {
		if (match[1] !== undefined) {
			fragments.push({ tex: match[1], display: true });
		} else if (match[2] !== undefined) {
			fragments.push({ tex: match[2], display: false });
		}
	}
	return fragments;
}

export function stripTexForSearch(text: string): string {
	return text
		.replace(/\$\$[^$]+\$\$/g, ' ')
		.replace(/\$[^$\n]+\$/g, ' ')
		.replace(/\\[a-zA-Z]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Plain-text symbol fallback per the engine-slice contract: authored `text`
 * wins; otherwise a lossy strip of TeX control characters — good enough for
 * search tokens, and units with non-trivial TeX author `text` explicitly.
 */
export function symbolText(symbol: AuthoredSymbol): string {
	if (symbol.text !== undefined) {
		return symbol.text;
	}
	return symbol.tex
		.replace(/\\[ ,;!]/g, ' ')
		.replace(/[\\{}]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

const IDENTIFIER_RE = /^[A-Za-z][A-Za-z0-9_]*$/;

const RESERVED_FUNCTIONS: ReadonlySet<string> = new Set(RESERVED_FUNCTION_NAMES);

const PROTOTYPE_NAMES: ReadonlySet<string> = new Set(Object.getOwnPropertyNames(Object.prototype));

/**
 * A plain-object lookup resolves these through the prototype chain
 * (`env.constructor` is a function, not undefined) and assigning
 * `__proto__` replaces the prototype, so neither a term key nor an
 * identifier may equal one: records are indexed by both on every platform.
 */
export function isPrototypeName(name: string): boolean {
	return PROTOTYPE_NAMES.has(name);
}

export interface IdentityTerm {
	kind: 'magnitude' | 'constant' | 'variable' | 'symbol';
	ref?: string | undefined;
	identifier?: string | undefined;
}

export interface IdentifierMap {
	byTermKey: ReadonlyMap<string, string>;
	errors: string[];
}

/**
 * Maps term keys to effective identifiers (`termIdentifier`) under the
 * identity contract of ADR 0009: identifier syntax, uniqueness within the
 * equation, no grammar function name, no Object.prototype property, and
 * `pi` only on the constant term whose ref is `pi` — the grammar reads
 * `pi` as Math.PI, so the identifier is shadowed and only correct where the
 * values coincide. A term that breaks a rule is left out of `byTermKey`.
 */
export function buildIdentifierMap(terms: Readonly<Record<string, IdentityTerm>>): IdentifierMap {
	const byTermKey = new Map<string, string>();
	const errors: string[] = [];
	const keyByIdentifier = new Map<string, string>();
	for (const [key, term] of Object.entries(terms)) {
		const identifier = termIdentifier(key, term.identifier);
		const source =
			term.identifier === undefined
				? `term key '${key}' derives identifier '${identifier}'`
				: `term '${key}' declares identifier '${identifier}'`;
		if (!IDENTIFIER_RE.test(identifier)) {
			errors.push(
				`${source}, which is not a valid identifier (letter, then letters, digits or _); author an identifier override`,
			);
			continue;
		}
		if (RESERVED_FUNCTIONS.has(identifier)) {
			errors.push(
				`${source}, which is reserved for the solution function ${identifier}(); author an identifier override`,
			);
			continue;
		}
		if (isPrototypeName(identifier)) {
			errors.push(
				`${source}, which is an Object.prototype property name; author an identifier override`,
			);
			continue;
		}
		if (identifier === 'pi' && !(term.kind === 'constant' && term.ref === 'pi')) {
			errors.push(
				`${source}, which the solution grammar reads as the constant pi; only the constant term with ref 'pi' may use it`,
			);
			continue;
		}
		const previous = keyByIdentifier.get(identifier);
		if (previous !== undefined) {
			errors.push(
				`term keys '${previous}' and '${key}' share identifier '${identifier}'; author an identifier override on one of them`,
			);
			continue;
		}
		keyByIdentifier.set(identifier, key);
		byTermKey.set(key, identifier);
	}
	return { byTermKey, errors };
}

/**
 * Upright groups (`\mathrm{}`, `\text{}`, `\operatorname{}`, one level of
 * nested braces) whose letters typeset as one word.
 */
const UPRIGHT_GROUP_RE = /\\(?:mathrm|text|operatorname)\s*\{(?:[^{}]|\{[^{}]*\})*\}/g;

/**
 * The first run of two or more ASCII letters a term key typesets as
 * separate italic factors (`KE` reads as K times E), or undefined. Letters
 * inside upright groups and control words (`\Delta`) are exempt.
 */
export function italicLetterRun(key: string): string | undefined {
	const stripped = key.replace(UPRIGHT_GROUP_RE, ' ').replace(/\\[A-Za-z]+/g, ' ');
	return /[A-Za-z]{2,}/.exec(stripped)?.[0];
}
