import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parse } from 'yaml';
import {
	appendTextSources,
	articleUrl,
	isAttributed,
	wikipediaTextSource,
} from './attribution.mjs';

describe('articleUrl', () => {
	it('underscores spaces and keeps MediaWiki-safe characters', () => {
		assert.equal(
			articleUrl('enwiki', 'Speed of light'),
			'https://en.wikipedia.org/wiki/Speed_of_light',
		);
		assert.equal(
			articleUrl('enwiki', 'Mercury (planet)'),
			'https://en.wikipedia.org/wiki/Mercury_(planet)',
		);
	});

	it('percent-encodes non-ASCII titles on the language subdomain', () => {
		assert.equal(articleUrl('eswiki', 'Ángulo'), 'https://es.wikipedia.org/wiki/%C3%81ngulo');
	});
});

describe('isAttributed', () => {
	it('matches an authored URL in decoded or encoded form', () => {
		const url = articleUrl('eswiki', 'Ángulo');
		assert.equal(isAttributed([{ url: 'https://es.wikipedia.org/wiki/Ángulo' }], url), true);
		assert.equal(isAttributed([{ url }], url), true);
		assert.equal(isAttributed([], url), false);
		assert.equal(isAttributed(undefined, url), false);
	});
});

describe('appendTextSources', () => {
	const source = wikipediaTextSource('enwiki', "Ohm's law");
	const entity = "name:\n  en: 'Ohm'\ndescription:\n  en: >-\n    Prose stays byte-identical.\n";

	it('appends a block list at the end and leaves every other byte untouched', () => {
		const text = appendTextSources(entity, [source]);
		assert.ok(text.startsWith(entity));
		assert.deepEqual(parse(text).textSources, [source]);
	});

	it('extends an existing block list in place, before the next key', () => {
		const existing = wikipediaTextSource('eswiki', 'Ohmio');
		const first = appendTextSources("name:\n  en: 'Ohm'\n", [existing]);
		const text = appendTextSources(`${first}aliases:\n  - 'ohm'\n`, [source]);
		const parsed = parse(text);
		assert.deepEqual(parsed.textSources, [existing, source]);
		assert.deepEqual(parsed.aliases, ['ohm']);
	});

	it('turns an inline empty list into a block list', () => {
		const text = appendTextSources("textSources: []\nname:\n  en: 'Ohm'\n", [source]);
		assert.deepEqual(parse(text).textSources, [source]);
	});

	it('returns the text unchanged when there is nothing to add', () => {
		assert.equal(appendTextSources(entity, []), entity);
	});
});
