import katex from 'katex';

const TRUSTED_COMMANDS = ['\\htmlClass', '\\htmlData'];

const MACRO_RE = /\\(?:mag|const|var)\{([^{}]*)\}/g;

const FRAGMENT_RE = /\$\$([^$]+)\$\$|\$([^$\n]+)\$/g;

const DASH_RE = /[–—−]/g;

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
 * brace-grouped arguments — term highlighting arrives with equations in P5;
 * until then plain KaTeX must not see unknown macros.
 */
export function stripSemanticMacros(tex: string): string {
	return tex.replace(MACRO_RE, (_whole, arg: string) => `{${arg}}`);
}

function renderFragment(tex: string, displayMode: boolean): string {
	const normalized = stripSemanticMacros(tex.replace(DASH_RE, '-'));
	return katex.renderToString(normalized, {
		strict: 'error',
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
 * Description prose with inline $...$ / display $$...$$ segments rendered at
 * build time. Fragments are strict-linted by the content pipeline; a
 * fragment that still fails (tex-allowlist escape hatch) degrades to escaped
 * literal TeX instead of failing the whole build.
 */
export function renderRichTextHtml(text: string): string {
	let html = '';
	let cursor = 0;
	for (const match of text.matchAll(FRAGMENT_RE)) {
		html += escapeHtml(text.slice(cursor, match.index));
		const display = match[1] !== undefined;
		const tex = match[1] ?? match[2] ?? '';
		try {
			html += renderFragment(tex, display);
		} catch {
			html += `<code>${escapeHtml(match[0])}</code>`;
		}
		cursor = match.index + match[0].length;
	}
	html += escapeHtml(text.slice(cursor));
	return html;
}
