import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { isAttributed } from './attribution.mjs';
import { decodeBody, EXTRACTOR_VERSION, htmlToText, plainText } from './html-text.mjs';
import { compareTexts, isFlagged, wordsOf } from './shingles.mjs';

/**
 * The originality check's pass over an entry's cited `references` (ADR
 * 0011): the cache record of a fetched page, and the rules that compare a
 * description with it and rank it against the Wikipedia pass. I/O-free; the
 * fetching lives in `originality.mjs`.
 */
export const REFERENCE_VIA = 'reference';

export const CACHE_MAX_AGE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Fewest normalized words a page must yield to count as read. Below it the
 * body is a script shell or an error stub ("You need to enable JavaScript"),
 * and comparing against it would report an unread source as checked.
 */
export const MIN_READABLE_WORDS = 40;

/**
 * The URL a reference is fetched and cached under: the fragment never
 * reaches the server, so `#section` links to one page share one fetch.
 */
export function fetchableUrl(url) {
	try {
		const parsed = new URL(url);
		parsed.hash = '';
		return parsed.href;
	} catch {
		return url;
	}
}

export function referenceKey(url) {
	return createHash('sha256').update(fetchableUrl(url)).digest('hex');
}

export function referenceCachePath(cacheDir, url) {
	return join(cacheDir, `${referenceKey(url)}.json`);
}

/**
 * Whether a cache record can stand in for a fetch: written by the current
 * extractor, for this URL (guarding against a corrupt or foreign file), and
 * at most `CACHE_MAX_AGE_DAYS` old.
 */
export function isFreshRecord(record, url, now = Date.now()) {
	const fetchedAt = Date.parse(record?.fetchedAt ?? '');
	return (
		record?.version === EXTRACTOR_VERSION &&
		record.url === fetchableUrl(url) &&
		Number.isFinite(fetchedAt) &&
		now - fetchedAt <= CACHE_MAX_AGE_DAYS * DAY_MS
	);
}

/**
 * How a response is read, from its Content-Type alone, so a PDF is refused
 * before its body is downloaded. A missing type is read as HTML, as a
 * browser would sniff it.
 */
export function contentKind(contentType) {
	const mime = (contentType ?? '').split(';')[0].trim().toLowerCase();
	if (mime === '' || mime === 'text/html' || mime === 'application/xhtml+xml') {
		return { kind: 'html', reason: null };
	}
	if (mime === 'text/plain') {
		return { kind: 'text', reason: null };
	}
	return {
		kind: null,
		reason: mime === 'application/pdf' ? 'PDF document' : `non-HTML response (${mime})`,
	};
}

function isPdf(bytes) {
	return new TextDecoder('windows-1252').decode(bytes.subarray(0, 5)) === '%PDF-';
}

/**
 * Cache record of a reference with no comparable text, and the `reason`.
 */
export function unreadableRecord({ url, finalUrl = null, contentType = null, fetchedAt }, reason) {
	return {
		version: EXTRACTOR_VERSION,
		url: fetchableUrl(url),
		finalUrl,
		fetchedAt,
		contentType,
		text: null,
		reason,
	};
}

/**
 * Cache record of one answered request: `text` is the page's readable text,
 * or null with the `reason` it is not checkable (a PDF, another non-HTML
 * type, or too little text to be the cited page).
 */
export function referenceRecord(meta, bytes) {
	const { kind, reason } = contentKind(meta.contentType);
	if (reason !== null) {
		return unreadableRecord(meta, reason);
	}
	if (isPdf(bytes)) {
		return unreadableRecord(meta, 'PDF document');
	}
	const body = decodeBody(bytes, meta.contentType);
	const text = kind === 'html' ? htmlToText(body) : plainText(body);
	const words = wordsOf(text).length;
	return words < MIN_READABLE_WORDS
		? unreadableRecord(meta, `too little readable text (${words} words)`)
		: { ...unreadableRecord(meta, null), text };
}

/**
 * Whether `textSources` credits a compared source. A cited reference never
 * is: references are where facts come from, not CC BY-SA text an entry may
 * adapt, so a copy from one is rewritten even when the same URL also sits
 * in `textSources`.
 */
export function isCredited(source, textSources) {
	return source.via !== REFERENCE_VIA && isAttributed(textSources, source.url);
}

/**
 * One description compared with one source text. `flagged` applies either
 * threshold rule, the bar for the entry's own sources (its Wikidata-linked
 * article and its references); a phrase-search hit is kept only when it
 * also meets both (`isStrongMatch`).
 */
export function compareSource(origin, description, text, textSources) {
	const comparison = compareTexts(description, text);
	return {
		...origin,
		status: 'checked',
		reason: null,
		...comparison,
		flagged: isFlagged(comparison),
		attributed: isCredited(origin, textSources),
	};
}

/**
 * A flagged source no credit covers: `--check` fails on it.
 */
export function needsAction(source) {
	return source.flagged && !source.attributed;
}

/**
 * The checked source a description's report row names: the strongest match
 * that needs action, else the strongest match, so a credited Wikipedia copy
 * never hides an uncredited copy from a reference. Null when no source was
 * read.
 */
export function strongestSource(sources) {
	return (
		sources
			.filter((source) => source.status === 'checked')
			.toSorted(
				(left, right) =>
					Number(needsAction(right)) - Number(needsAction(left)) ||
					Number(right.flagged) - Number(left.flagged) ||
					right.overlap - left.overlap ||
					right.longestRun - left.longestRun,
			)[0] ?? null
	);
}
