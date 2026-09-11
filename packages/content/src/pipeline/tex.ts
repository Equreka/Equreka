import type { Symbol as AuthoredSymbol } from '@equreka/schema';

const MACRO_RE = /\\(mag|const|var)\{([^{}]*)\}/g;

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
	for (const match of tex.matchAll(MACRO_RE)) {
		const kind = MACRO_KINDS[match[1] ?? ''];
		if (kind !== undefined) {
			uses.push({ kind, arg: match[2] ?? '' });
		}
	}
	return uses;
}

export { canonicalTex, stripMacros } from '../rich-text.js';

export function stripMacrosWith(tex: string, replaceArg: (arg: string) => string): string {
	return tex.replace(MACRO_RE, (_whole, _kind: string, arg: string) => `{${replaceArg(arg)}}`);
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

export interface IdentifierMap {
	byTermKey: Record<string, string>;
	errors: string[];
}

/**
 * Maps authored term keys (which may be TeX like `\pi`) to plain
 * identifiers shared by the solution grammar, the codegen'd solutions
 * module, and `meta.terms[].identifier` — one mapping, three consumers.
 */
export function buildIdentifierMap(termKeys: readonly string[]): IdentifierMap {
	const byTermKey: Record<string, string> = {};
	const errors: string[] = [];
	const seen = new Map<string, string>();
	for (const key of termKeys) {
		const identifier = key.replace(/[^A-Za-z0-9_]/g, '');
		if (!IDENTIFIER_RE.test(identifier)) {
			errors.push(`term key ${JSON.stringify(key)} normalizes to invalid identifier`);
			continue;
		}
		const previous = seen.get(identifier);
		if (previous !== undefined && previous !== key) {
			errors.push(
				`term keys ${JSON.stringify(previous)} and ${JSON.stringify(key)} collide on identifier '${identifier}'`,
			);
			continue;
		}
		seen.set(identifier, key);
		byTermKey[key] = identifier;
	}
	return { byTermKey, errors };
}
