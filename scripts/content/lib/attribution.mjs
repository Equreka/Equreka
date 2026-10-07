/**
 * Characters MediaWiki leaves unescaped in article URLs (`wfUrlencode`), so
 * a generated link reads like the one a browser shows.
 */
const MEDIAWIKI_SAFE = /%(3B|40|24|21|2A|28|29|2C|2F|7E|3A)/g;

/**
 * Canonical article URL for a Wikimedia site id (`enwiki`, `eswiki`) and an
 * article title as the API returns it (spaces, not underscores).
 */
export function articleUrl(site, title) {
	const language = site.replace(/wiki$/, '');
	const path = encodeURIComponent(title.replaceAll(' ', '_')).replace(MEDIAWIKI_SAFE, (encoded) =>
		decodeURIComponent(encoded),
	);
	return `https://${language}.wikipedia.org/wiki/${path}`;
}

/**
 * The `textSources` entry crediting one Wikipedia article. English and
 * Spanish Wikipedia publish their text under CC BY-SA 4.0 (each site's
 * `rightsinfo`), and the check compares against the current revision.
 */
export function wikipediaTextSource(site, title) {
	return { title: `Wikipedia: ${title}`, url: articleUrl(site, title), license: 'CC-BY-SA-4.0' };
}

function comparableUrl(url) {
	try {
		return decodeURI(url).replaceAll(' ', '_');
	} catch {
		return url;
	}
}

/**
 * Whether an authored `textSources` list already credits `url`, comparing
 * percent-decoded forms so an authored Unicode URL matches its escaped
 * equivalent.
 */
export function isAttributed(textSources, url) {
	const target = comparableUrl(url);
	return (textSources ?? []).some(
		(source) => typeof source?.url === 'string' && comparableUrl(source.url) === target,
	);
}

function quoted(value) {
	return `'${value.replaceAll("'", "''")}'`;
}

function itemLines(source) {
	return [
		`  - title: ${quoted(source.title)}`,
		`    url: ${quoted(source.url)}`,
		`    license: ${quoted(source.license)}`,
	];
}

/**
 * Entity YAML text with `sources` added to its top-level `textSources`
 * list, by text edit rather than a parse/print round trip so every other
 * byte (prose folding, quoting) is untouched. A missing key is appended as
 * a new block at the end; an existing block list is extended in place; an
 * inline `textSources: []` becomes a block. Callers re-parse the result.
 */
export function appendTextSources(text, sources) {
	if (sources.length === 0) {
		return text;
	}
	const items = sources.flatMap(itemLines);
	const lines = text.replace(/\n+$/, '').split('\n');
	const keyIndex = lines.findIndex((line) => /^textSources:/.test(line));
	if (keyIndex === -1) {
		return `${[...lines, 'textSources:', ...items].join('\n')}\n`;
	}
	if (/^textSources:\s*\[\s*\]\s*$/.test(lines[keyIndex])) {
		return `${[...lines.slice(0, keyIndex), 'textSources:', ...items, ...lines.slice(keyIndex + 1)].join('\n')}\n`;
	}
	const nextKey = lines.findIndex((line, index) => index > keyIndex && /^[^\s-]/.test(line));
	const end = nextKey === -1 ? lines.length : nextKey;
	return `${[...lines.slice(0, end), ...items, ...lines.slice(end)].join('\n')}\n`;
}
