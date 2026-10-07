/**
 * Bumped whenever the extracted text for the same page would change, so the
 * reference cache refetches pages read by an older extractor instead of
 * comparing against stale text.
 */
export const EXTRACTOR_VERSION = 1;

const TAG_PATTERN =
	/<!--[\s\S]*?(?:-->|$)|<!\[CDATA\[[\s\S]*?(?:\]\]>|$)|<[!?][^>]*>|<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/
		.source;

/**
 * Elements whose content the HTML parser reads as raw text up to their end
 * tag; none of it is prose.
 */
const RAW_TEXT_ELEMENTS = new Set([
	'iframe',
	'noembed',
	'noframes',
	'noscript',
	'script',
	'style',
	'textarea',
	'title',
	'xmp',
]);

/**
 * Elements dropped with everything inside them: page chrome (navigation,
 * sidebars), document metadata, inert templates, and SVG and MathML, which
 * mirror `stripMath` on the description side so math never joins a run.
 */
const DROPPED_ELEMENTS = new Set(['aside', 'head', 'math', 'nav', 'svg', 'template']);

/**
 * Dropped only outside `article`, `main` and `section`: there they are the
 * page banner and footer, inside they introduce or close that content
 * (the HTML-AAM mapping of `banner` and `contentinfo`).
 */
const SCOPED_ELEMENTS = new Set(['footer', 'header']);
const SECTIONING_ELEMENTS = new Set(['article', 'main', 'section']);

/**
 * ARIA landmark roles that mark a generic element as the same chrome as
 * `nav`, `header`, `footer` and `aside`.
 */
const CHROME_ROLES = new Set(['banner', 'complementary', 'contentinfo', 'navigation']);

/**
 * Elements a browser renders inline, so their tags join the text around them
 * (`<b>co</b>sine` reads "cosine"); every other tag separates words.
 */
const INLINE_ELEMENTS = new Set([
	'a',
	'abbr',
	'b',
	'bdi',
	'bdo',
	'big',
	'cite',
	'code',
	'data',
	'del',
	'dfn',
	'em',
	'font',
	'i',
	'ins',
	'kbd',
	'mark',
	'nobr',
	'q',
	's',
	'samp',
	'small',
	'span',
	'strong',
	'sub',
	'sup',
	'time',
	'tt',
	'u',
	'var',
	'wbr',
]);

/**
 * HTML 4 Latin-1 entity names in code-point order from U+00A0.
 */
const LATIN1_NAMES =
	'nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml';

/**
 * Greek entity names in code-point order from U+0391 (capitals) and U+03B1
 * (lowercase); `Sigmaf` holds the unassigned capital slot of final sigma.
 */
const GREEK_NAMES =
	'Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota Kappa Lambda Mu Nu Xi Omicron Pi Rho Sigmaf Sigma Tau Upsilon Phi Chi Psi Omega';

/**
 * Named character references that decode to letters or to characters that
 * must vanish inside a word. Any other name only ever stands for
 * punctuation, a symbol or a space, which normalization turns into a word
 * break, so it decodes to a space.
 */
const NAMED_REFERENCES = new Map([
	['amp', '&'],
	['lt', '<'],
	['gt', '>'],
	['quot', '"'],
	['apos', "'"],
	['OElig', 'Œ'],
	['oelig', 'œ'],
	['Scaron', 'Š'],
	['scaron', 'š'],
	['Yuml', 'Ÿ'],
	['fnof', 'ƒ'],
	['thetasym', 'ϑ'],
	['upsih', 'ϒ'],
	['piv', 'ϖ'],
	['zwnj', '\u{200C}'],
	['zwj', '\u{200D}'],
	['lrm', '\u{200E}'],
	['rlm', '\u{200F}'],
	...LATIN1_NAMES.split(' ').map((name, index) => [name, String.fromCodePoint(0xa0 + index)]),
	...GREEK_NAMES.split(' ').flatMap((name, index) => [
		...(name === 'Sigmaf' ? [] : [[name, String.fromCodePoint(0x391 + index)]]),
		[name.toLowerCase(), String.fromCodePoint(0x3b1 + index)],
	]),
]);

const CHARACTER_REFERENCE = /&(?:#(\d{1,8})|#[xX]([0-9a-fA-F]{1,7})|([A-Za-z][A-Za-z0-9]{1,31}));/g;

/**
 * Soft hyphen, zero-width and directional marks, word joiner and BOM: a
 * browser renders them as nothing, so removing them keeps `co&shy;sine` one
 * word.
 */
const INVISIBLE = /[\u{AD}\u{200B}-\u{200F}\u{2060}\u{FEFF}]/gu;

/**
 * MathJax `\(...\)` and `\[...\]` spans left in page text, bounded so a
 * stray opening delimiter cannot swallow the prose after it. Removed for the
 * same reason as MathML.
 */
const MATHJAX_TEX = /\\\([\s\S]{0,1000}?\\\)|\\\[[\s\S]{0,1000}?\\\]/g;

const WINDOWS_1252 = new TextDecoder('windows-1252');

/**
 * The character a numeric reference stands for, with the HTML parser's
 * repairs: C1 controls read as windows-1252, and NUL, surrogates and values
 * past U+10FFFF become U+FFFD.
 */
function numericReference(codePoint) {
	if (codePoint >= 0x80 && codePoint <= 0x9f) {
		return WINDOWS_1252.decode(Uint8Array.of(codePoint));
	}
	if (codePoint === 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
		return '\u{FFFD}';
	}
	return String.fromCodePoint(codePoint);
}

export function decodeCharacterReferences(text) {
	return text.replace(CHARACTER_REFERENCE, (_, decimal, hex, name) => {
		if (name !== undefined) {
			return NAMED_REFERENCES.get(name) ?? ' ';
		}
		return numericReference(decimal === undefined ? Number.parseInt(hex, 16) : Number(decimal));
	});
}

/**
 * Text with invisible characters removed and every whitespace run, no-break
 * spaces included, collapsed to one space.
 */
export function plainText(text) {
	return text.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim();
}

function endTagPattern(name) {
	return new RegExp(`<(/?)${name}(?=[\\s/>])(?:[^>"']|"[^"]*"|'[^']*')*>`, 'gi');
}

/**
 * Index just past the end tag closing a raw-text element opened before
 * `from`; an unclosed one runs to the end of the document, as in a browser.
 */
function endOfRawText(html, name, from) {
	const pattern = endTagPattern(name);
	pattern.lastIndex = from;
	for (let match = pattern.exec(html); match !== null; match = pattern.exec(html)) {
		if (match[1] === '/') {
			return pattern.lastIndex;
		}
	}
	return html.length;
}

/**
 * Index just past the end tag matching an element opened before `from`,
 * counting nested elements of the same name, or -1 when it never closes:
 * an unclosed element is kept rather than dropping the rest of the page.
 */
function endOfElement(html, name, from) {
	const pattern = endTagPattern(name);
	pattern.lastIndex = from;
	let depth = 1;
	for (let match = pattern.exec(html); match !== null; match = pattern.exec(html)) {
		if (match[1] === '/') {
			depth -= 1;
			if (depth === 0) {
				return pattern.lastIndex;
			}
		} else if (!match[0].endsWith('/>')) {
			depth += 1;
		}
	}
	return -1;
}

function isChrome(name, attributes, sectioningDepth) {
	if (SCOPED_ELEMENTS.has(name)) {
		return sectioningDepth === 0;
	}
	if (DROPPED_ELEMENTS.has(name)) {
		return true;
	}
	const role = /(?:^|\s)role\s*=\s*["']?\s*([a-zA-Z]+)/.exec(attributes)?.[1];
	return role !== undefined && CHROME_ROLES.has(role.toLowerCase());
}

/**
 * The readable text of an HTML document: raw-text elements and page chrome
 * dropped, comments and tags removed (inline tags join their neighbours,
 * every other tag separates words), character references decoded, MathJax
 * TeX removed and whitespace collapsed. Main-content selectors are
 * deliberately not used:
 * a page that misplaces its prose outside `<main>` would hide a copy, and a
 * missed copy is the failure that matters.
 */
export function htmlToText(html) {
	const tag = new RegExp(TAG_PATTERN, 'g');
	const parts = [];
	let cursor = 0;
	let sectioningDepth = 0;
	for (let match = tag.exec(html); match !== null; match = tag.exec(html)) {
		parts.push(html.slice(cursor, match.index));
		cursor = tag.lastIndex;
		const [whole, closing, rawName, attributes] = match;
		if (rawName === undefined) {
			continue;
		}
		const name = rawName.toLowerCase();
		parts.push(INLINE_ELEMENTS.has(name) ? '' : ' ');
		if (closing === '/') {
			if (SECTIONING_ELEMENTS.has(name)) {
				sectioningDepth = Math.max(0, sectioningDepth - 1);
			}
			continue;
		}
		if (whole.endsWith('/>')) {
			continue;
		}
		const end = RAW_TEXT_ELEMENTS.has(name)
			? endOfRawText(html, name, cursor)
			: isChrome(name, attributes, sectioningDepth)
				? endOfElement(html, name, cursor)
				: -1;
		if (end !== -1) {
			cursor = end;
			tag.lastIndex = end;
		} else if (SECTIONING_ELEMENTS.has(name)) {
			sectioningDepth += 1;
		}
	}
	parts.push(html.slice(cursor));
	return plainText(decodeCharacterReferences(parts.join('')).replace(MATHJAX_TEX, ' '));
}

/**
 * Character encoding of a response body, by the HTML sniffing order: a byte
 * order mark, then the Content-Type charset, then a `<meta>` declaration in
 * the first 1024 bytes, else UTF-8.
 */
export function charsetOf(contentType, bytes) {
	if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
		return 'utf-8';
	}
	if (bytes[0] === 0xff && bytes[1] === 0xfe) {
		return 'utf-16le';
	}
	if (bytes[0] === 0xfe && bytes[1] === 0xff) {
		return 'utf-16be';
	}
	const declared = /charset\s*=\s*["']?([\w.:-]+)/i.exec(contentType ?? '')?.[1];
	if (declared !== undefined) {
		return declared.toLowerCase();
	}
	const head = new TextDecoder('windows-1252').decode(bytes.subarray(0, 1024));
	return /<meta[^>]*?charset\s*=\s*["']?([\w.:-]+)/i.exec(head)?.[1]?.toLowerCase() ?? 'utf-8';
}

/**
 * A response body as text in its declared encoding; an encoding label
 * TextDecoder does not know falls back to UTF-8.
 */
export function decodeBody(bytes, contentType) {
	try {
		return new TextDecoder(charsetOf(contentType, bytes)).decode(bytes);
	} catch {
		return new TextDecoder().decode(bytes);
	}
}
