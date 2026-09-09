import katex from 'katex';

const TRUSTED_COMMANDS = ['\\htmlClass', '\\htmlData'];

const MACRO_RE = /\\(mag|const|var)\{([^{}]*)\}/g;

const FRAGMENT_RE = /\$\$([^$]+)\$\$|\$([^$\n]+)\$/g;

const DASH_RE = /[–—−]/g;

/**
 * ADR 0002 name-validation patterns for the KaTeX HTML extension: anything
 * headed for \htmlClass or \htmlData must match before rendering, so a bad
 * term annotation fails the build instead of shipping markup.
 */
const CLASS_NAME_RE = /^[a-z][a-z0-9- ]*$/;

const DATA_VALUE_RE = /^[a-z-]+:[A-Za-z0-9_-]+$/;

/**
 * `\var{}` annotates both wiki-backed variables and equation-local symbols;
 * the other macros are one-to-one with their term kind.
 */
const MACRO_KINDS: Record<string, readonly TermAnnotation['kind'][]> = {
	mag: ['magnitude'],
	const: ['constant'],
	var: ['variable', 'symbol'],
};

/**
 * KaTeX strict handling: everything stays 'error' per ADR 0002 except the
 * htmlExtension notice, which fires for \htmlClass/\htmlData before the
 * trust callback is even consulted — trust remains the sole gate for them.
 */
const strictAllowHtmlExtension = (errorCode: string): 'ignore' | 'error' =>
	errorCode === 'htmlExtension' ? 'ignore' : 'error';

/**
 * Structural subset of one authored equation term (@equreka/schema
 * equationTerm): wiki-backed kinds carry `ref`; equation-local symbols have
 * none and key their highlighting on the term identifier instead.
 */
export interface TermAnnotation {
	kind: 'magnitude' | 'constant' | 'variable' | 'symbol';
	ref?: string;
}

const HTML_ESCAPES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;',
};

export function escapeHtml(text: string): string {
	return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

/**
 * Reduces the pipeline's annotation macros (\mag{}/\const{}/\var{}) to their
 * brace-grouped arguments — used wherever no terms map is in scope, so plain
 * KaTeX never sees unknown macros.
 */
export function stripSemanticMacros(tex: string): string {
	return tex.replace(MACRO_RE, (_whole, _kind: string, arg: string) => `{${arg}}`);
}

/**
 * Canonical data-term value for one term — the equation page's expression
 * spans, terms-table rows, and the base layout's highlighting script all key
 * off this exact string. Symbol terms use the key's identifier form (the
 * same normalization as the pipeline's solution identifiers).
 */
export function termDataValue(key: string, term: TermAnnotation): string {
	if (term.ref !== undefined) {
		return `${term.kind}:${term.ref}`;
	}
	const identifier = key.replace(/[^A-Za-z0-9_]/g, '');
	if (identifier === '') {
		throw new Error(`term key ${JSON.stringify(key)} normalizes to an empty identifier`);
	}
	return `${term.kind}:${identifier}`;
}

/**
 * Expands each annotation macro to
 * \htmlClass{eq-term eq-<kind>}{\htmlData{term=<kind>:<ref>}{<arg>}} using
 * the entry's terms map, enabling cross-highlighting between the rendered
 * expression and any element carrying the same data-term. Throws (failing
 * the build) on a macro argument missing from the terms map, a macro whose
 * command disagrees with the term's kind, or a class/data value outside the
 * ADR validation patterns.
 */
export function expandSemanticMacros(tex: string, terms: Record<string, TermAnnotation>): string {
	return tex.replace(MACRO_RE, (whole, macro: string, arg: string) => {
		const term = terms[arg];
		if (term === undefined) {
			throw new Error(`tex macro ${whole} has no matching term key "${arg}"`);
		}
		if (!(MACRO_KINDS[macro] ?? []).includes(term.kind)) {
			throw new Error(`tex macro ${whole} disagrees with term kind "${term.kind}"`);
		}
		const className = `eq-term eq-${term.kind}`;
		const dataValue = termDataValue(arg, term);
		if (!CLASS_NAME_RE.test(className)) {
			throw new Error(`invalid \\htmlClass name "${className}"`);
		}
		if (!DATA_VALUE_RE.test(dataValue)) {
			throw new Error(`invalid \\htmlData value "${dataValue}"`);
		}
		return `\\htmlClass{${className}}{\\htmlData{term=${dataValue}}{${arg}}}`;
	});
}

function renderFragment(
	tex: string,
	displayMode: boolean,
	terms?: Record<string, TermAnnotation>,
): string {
	const dashless = tex.replace(DASH_RE, '-');
	const normalized =
		terms === undefined ? stripSemanticMacros(dashless) : expandSemanticMacros(dashless, terms);
	return katex.renderToString(normalized, {
		strict: strictAllowHtmlExtension,
		throwOnError: true,
		trust: (context) => TRUSTED_COMMANDS.includes(context.command),
		output: 'htmlAndMathml',
		displayMode,
	});
}

/**
 * KaTeX for an authored symbol. Symbols are not covered by the pipeline's
 * TeX lint, and a few legacy ones are Unicode that strict math mode rejects
 * (°Ré, °Rø) — those retry in \text mode; anything still failing falls back
 * to the escaped plain-text symbol so a page never breaks on a symbol.
 */
export function renderSymbolHtml(symbolTex: string, symbolText: string): string {
	try {
		return renderFragment(symbolTex, false);
	} catch {
		try {
			return renderFragment(`\\text{${symbolTex}}`, false);
		} catch {
			return `<span class="symbol-fallback">${escapeHtml(symbolText)}</span>`;
		}
	}
}

/**
 * An equation's expression as display-mode KaTeX with term annotations
 * expanded for cross-highlighting. Unlike prose rendering this never
 * degrades: an expression that fails to render fails the build.
 */
export function renderExpressionHtml(
	expression: string,
	terms: Record<string, TermAnnotation>,
): string {
	return renderFragment(expression, true, terms);
}

/**
 * Description prose with inline $...$ / display $$...$$ segments rendered at
 * build time. With a terms map the annotation macros expand to highlightable
 * spans; without one they reduce to plain arguments. Fragments are
 * strict-linted by the content pipeline; a fragment that still fails
 * (tex-allowlist escape hatch) degrades to escaped literal TeX instead of
 * failing the whole build.
 */
export function renderRichTextHtml(text: string, terms?: Record<string, TermAnnotation>): string {
	let html = '';
	let cursor = 0;
	for (const match of text.matchAll(FRAGMENT_RE)) {
		html += escapeHtml(text.slice(cursor, match.index));
		const display = match[1] !== undefined;
		const tex = match[1] ?? match[2] ?? '';
		try {
			html += renderFragment(tex, display, terms);
		} catch {
			html += `<code>${escapeHtml(match[0])}</code>`;
		}
		cursor = match.index + match[0].length;
	}
	html += escapeHtml(text.slice(cursor));
	return html;
}
