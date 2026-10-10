import assert from 'node:assert/strict';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { EXTRACTOR_VERSION } from './html-text.mjs';
import {
	CACHE_MAX_AGE_DAYS,
	compareSource,
	contentKind,
	fetchableUrl,
	isCredited,
	isFreshRecord,
	MIN_READABLE_WORDS,
	needsAction,
	REFERENCE_VIA,
	referenceCachePath,
	referenceKey,
	referenceRecord,
	strongestSource,
	unreadableRecord,
} from './references.mjs';
import { isStrongMatch } from './shingles.mjs';

const URL_A = 'https://openstax.org/books/example/pages/10-2-law-of-cosines';
const DAY_MS = 24 * 60 * 60 * 1000;

const SOURCE_PROSE =
	'Suppose two sides of a triangle and the angle between them are known. The third side then follows from a relation that generalizes the Pythagorean theorem, and the same relation recovers any angle once all three sides are measured. Surveyors and navigators used it long before calculators existed, because it turns two distances and a bearing into a third distance.';

const COPIED_DESCRIPTION =
	'The law of cosines gives the third side of a triangle from two sides and their angle; it generalizes the Pythagorean theorem, and the same relation recovers any angle once all three sides are measured.';

const encode = (text) => new TextEncoder().encode(text);

describe('reference cache keys', () => {
	it('fetches and caches a page once whatever fragment a link carries', () => {
		assert.equal(fetchableUrl(`${URL_A}#fs-id1167794`), URL_A);
		assert.equal(referenceKey(`${URL_A}#a`), referenceKey(URL_A));
		assert.match(referenceKey(URL_A), /^[0-9a-f]{64}$/);
		assert.notEqual(referenceKey(URL_A), referenceKey(`${URL_A}?print=1`));
	});

	it('keys the cache file by the URL hash inside the cache directory', () => {
		const dir = join('repo', '.cache', 'originality');
		assert.equal(referenceCachePath(dir, URL_A), join(dir, `${referenceKey(URL_A)}.json`));
	});

	it('leaves a string that is not a URL unchanged', () => {
		assert.equal(fetchableUrl('not a url'), 'not a url');
	});
});

describe('isFreshRecord', () => {
	const now = Date.parse('2026-10-07T12:00:00Z');
	const record = (fields) => ({
		version: EXTRACTOR_VERSION,
		url: URL_A,
		fetchedAt: new Date(now - DAY_MS).toISOString(),
		text: SOURCE_PROSE,
		reason: null,
		...fields,
	});

	it('reuses a record of this URL and extractor within the maximum age', () => {
		assert.equal(isFreshRecord(record({}), `${URL_A}#section`, now), true);
		const edge = new Date(now - CACHE_MAX_AGE_DAYS * DAY_MS).toISOString();
		assert.equal(isFreshRecord(record({ fetchedAt: edge }), URL_A, now), true);
	});

	it('refetches an old, foreign, corrupt or older-extractor record', () => {
		const old = new Date(now - (CACHE_MAX_AGE_DAYS + 1) * DAY_MS).toISOString();
		assert.equal(isFreshRecord(record({ fetchedAt: old }), URL_A, now), false);
		assert.equal(isFreshRecord(record({ url: 'https://example.org/' }), URL_A, now), false);
		assert.equal(isFreshRecord(record({ version: EXTRACTOR_VERSION - 1 }), URL_A, now), false);
		assert.equal(isFreshRecord(record({ fetchedAt: 'yesterday' }), URL_A, now), false);
		assert.equal(isFreshRecord(null, URL_A, now), false);
		assert.equal(isFreshRecord('garbage', URL_A, now), false);
	});
});

describe('contentKind', () => {
	it('reads HTML, XHTML and plain text, and HTML when the type is missing', () => {
		assert.deepEqual(contentKind('text/html; charset=UTF-8'), { kind: 'html', reason: null });
		assert.deepEqual(contentKind('application/xhtml+xml'), { kind: 'html', reason: null });
		assert.deepEqual(contentKind(null), { kind: 'html', reason: null });
		assert.deepEqual(contentKind('text/plain'), { kind: 'text', reason: null });
	});

	it('refuses PDFs and other types with the reason', () => {
		assert.deepEqual(contentKind('application/pdf'), { kind: null, reason: 'PDF document' });
		assert.deepEqual(contentKind('image/png'), {
			kind: null,
			reason: 'non-HTML response (image/png)',
		});
	});
});

describe('referenceRecord', () => {
	const meta = (contentType) => ({
		url: `${URL_A}#top`,
		finalUrl: URL_A,
		contentType,
		fetchedAt: '2026-10-07T12:00:00.000Z',
	});

	it('stores the readable text of an HTML page under its fetchable URL', () => {
		const record = referenceRecord(
			meta('text/html'),
			encode(`<nav>Contents</nav><main><p>${SOURCE_PROSE}</p></main>`),
		);
		assert.equal(record.url, URL_A);
		assert.equal(record.version, EXTRACTOR_VERSION);
		assert.equal(record.text, SOURCE_PROSE);
		assert.equal(record.reason, null);
	});

	it('reads a plain-text body as is', () => {
		const record = referenceRecord(meta('text/plain; charset=utf-8'), encode(SOURCE_PROSE));
		assert.equal(record.text, SOURCE_PROSE);
	});

	it('marks a PDF not checkable even when the server calls it HTML', () => {
		const record = referenceRecord(meta('text/html'), encode('%PDF-1.7\n%binary'));
		assert.equal(record.text, null);
		assert.equal(record.reason, 'PDF document');
	});

	it('marks a non-HTML type not checkable without reading the body', () => {
		const record = referenceRecord(meta('application/pdf'), new Uint8Array());
		assert.deepEqual(
			{ text: record.text, reason: record.reason },
			{ text: null, reason: 'PDF document' },
		);
	});

	it('marks a script shell not checkable rather than reporting an unread page as checked', () => {
		const shell =
			'<html><body><div id="root"></div><noscript>You need to enable JavaScript to run this app.</noscript><script src="/app.js"></script></body></html>';
		const record = referenceRecord(meta('text/html'), encode(shell));
		assert.equal(record.text, null);
		assert.equal(record.reason, 'too little readable text (0 words)');
		assert.ok(MIN_READABLE_WORDS > 10);
	});

	it('builds a failure record with the same shape', () => {
		assert.deepEqual(unreadableRecord(meta(null), 'HTTP 403'), {
			version: EXTRACTOR_VERSION,
			url: URL_A,
			finalUrl: URL_A,
			fetchedAt: '2026-10-07T12:00:00.000Z',
			contentType: null,
			text: null,
			reason: 'HTTP 403',
		});
	});
});

describe('the reference flag rule', () => {
	const reference = { via: REFERENCE_VIA, site: null, title: 'Example textbook 10.2', url: URL_A };
	const article = {
		via: 'wikidata',
		site: 'enwiki',
		title: 'Law of cosines',
		url: 'https://en.wikipedia.org/wiki/Law_of_cosines',
	};

	it('flags a copied run from a cited reference even when textSources lists that URL', () => {
		const textSources = [{ title: 'Example', url: URL_A, license: 'CC-BY-4.0' }];
		const source = compareSource(reference, COPIED_DESCRIPTION, SOURCE_PROSE, textSources);
		assert.ok(source.longestRun >= 12);
		assert.equal(
			source.run,
			'generalizes the pythagorean theorem and the same relation recovers any angle once all three sides are measured',
		);
		assert.equal(source.flagged, true);
		assert.equal(source.attributed, false);
		assert.equal(isCredited(reference, textSources), false);
		assert.equal(needsAction(source), true);
	});

	it('lets a textSources credit cover a Wikipedia copy, as before', () => {
		const textSources = [{ title: 'Wikipedia: Law of cosines', url: article.url }];
		const source = compareSource(article, COPIED_DESCRIPTION, SOURCE_PROSE, textSources);
		assert.equal(source.flagged, true);
		assert.equal(source.attributed, true);
		assert.equal(needsAction(source), false);
	});

	it("flags a reference on the run rule alone, the bar for an entry's own sources", () => {
		const stock = compareSource(
			reference,
			'An original sentence that only shares the third side then follows from a relation, nothing more, and goes on with a long tail of its own wording here.',
			SOURCE_PROSE,
			[],
		);
		assert.ok(stock.longestRun >= 8);
		assert.ok(stock.overlap < 0.15);
		assert.equal(stock.flagged, true);
		assert.equal(isStrongMatch(stock), false);
	});

	it('does not flag original prose', () => {
		const source = compareSource(
			reference,
			'Given two lengths and the opening between them, a triangle has exactly one closing edge; squaring it subtracts a cosine term from the Pythagorean sum.',
			SOURCE_PROSE,
			[],
		);
		assert.equal(source.flagged, false);
		assert.equal(needsAction(source), false);
	});
});

describe('strongestSource', () => {
	const checked = (fields) => ({
		via: 'wikidata',
		status: 'checked',
		flagged: false,
		attributed: false,
		overlap: 0,
		longestRun: 0,
		...fields,
	});

	it('names an uncredited reference copy before a stronger credited Wikipedia copy', () => {
		const credited = checked({ flagged: true, attributed: true, overlap: 0.9, longestRun: 60 });
		const copied = checked({ via: REFERENCE_VIA, flagged: true, overlap: 0.05, longestRun: 12 });
		assert.equal(strongestSource([credited, copied]), copied);
	});

	it('otherwise names the flagged, then the strongest, source', () => {
		const weak = checked({ overlap: 0, longestRun: 6 });
		const flagged = checked({ via: REFERENCE_VIA, flagged: true, overlap: 0.02, longestRun: 8 });
		const stronger = checked({ via: REFERENCE_VIA, flagged: true, overlap: 0.3, longestRun: 20 });
		assert.equal(strongestSource([weak, flagged]), flagged);
		assert.equal(strongestSource([flagged, stronger]), stronger);
		assert.equal(strongestSource([weak, checked({ longestRun: 7 })]).longestRun, 7);
	});

	it('ignores sources that could not be read, and is null without any', () => {
		const unread = { via: REFERENCE_VIA, status: 'not-checkable', reason: 'PDF document' };
		assert.equal(strongestSource([unread]), null);
		assert.equal(strongestSource([]), null);
		const weak = checked({ longestRun: 3 });
		assert.equal(strongestSource([unread, weak]), weak);
	});
});
