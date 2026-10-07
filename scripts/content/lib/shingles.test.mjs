import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	compareTexts,
	isFlagged,
	isStrongMatch,
	longestCommonRun,
	longestSharedRun,
	normalizeText,
	SHINGLE_SIZE,
	shinglesOf,
	THRESHOLDS,
	wordsOf,
} from './shingles.mjs';

const ARTICLE =
	'The metre (or meter in US spelling; symbol: m) is the base unit of length in the International System of Units (SI). Since 2019, the metre has been defined as the length of the path travelled by light in vacuum during a time interval of 1/299792458 of a second.';

describe('normalizeText', () => {
	it('drops inline and display TeX, punctuation and case, and collapses whitespace', () => {
		assert.equal(
			normalizeText('The $\\frac{1}{2}$ ratio,  is  $$x^2$$ SQUARED!'),
			'the ratio is squared',
		);
	});

	it('folds diacritics so an accent edit does not hide a copy', () => {
		assert.equal(
			normalizeText('Metro — unidad básica de longitud'),
			'metro unidad basica de longitud',
		);
		assert.equal(normalizeText('mètre'), normalizeText('metre'));
	});

	it('keeps non-Latin letters and digits as words', () => {
		assert.deepEqual(wordsOf('μέτρον, 299792458 m/s'), ['μετρον', '299792458', 'm', 's']);
	});

	it('yields no words for text that is only math or punctuation', () => {
		assert.deepEqual(wordsOf('$E = mc^2$ — !'), []);
	});
});

describe('shinglesOf', () => {
	it('builds every run of size consecutive words', () => {
		assert.deepEqual([...shinglesOf(['a', 'b', 'c', 'd'], 3)], ['a b c', 'b c d']);
	});

	it('is empty when the text is shorter than one shingle', () => {
		assert.equal(shinglesOf(['a', 'b'], 3).size, 0);
		assert.equal(SHINGLE_SIZE, 8);
	});
});

describe('longestSharedRun', () => {
	it('finds the longest common run of words', () => {
		assert.equal(longestSharedRun(['x', 'a', 'b', 'c', 'y'], ['a', 'b', 'c', 'z', 'a', 'b']), 3);
	});

	it('locates the first longest run in the left list', () => {
		assert.deepEqual(longestCommonRun(['x', 'a', 'b', 'c', 'y', 'a', 'b', 'c'], ['a', 'b', 'c']), {
			length: 3,
			start: 1,
		});
		assert.deepEqual(longestCommonRun(['a'], ['b']), { length: 0, start: 0 });
	});

	it('is 0 without a shared word', () => {
		assert.equal(longestSharedRun(['a'], ['b']), 0);
		assert.equal(longestSharedRun([], ['b']), 0);
	});
});

describe('compareTexts', () => {
	it('reports a verbatim copy as full overlap', () => {
		const comparison = compareTexts(
			'The metre has been defined as the length of the path travelled by light in vacuum.',
			ARTICLE,
		);
		assert.equal(comparison.overlap, 1);
		assert.equal(comparison.sharedShingles, comparison.shingles);
		assert.ok(comparison.longestRun >= 12);
		assert.equal(
			comparison.run,
			'the metre has been defined as the length of the path travelled by light in vacuum',
		);
		assert.equal(comparison.run.split(' ').length, comparison.longestRun);
		assert.equal(isFlagged(comparison), true);
	});

	it('sees through TeX and punctuation edits to the copied prose', () => {
		const comparison = compareTexts(
			'The $metre$ — is the base unit of length in the International System of Units.',
			ARTICLE,
		);
		assert.ok(comparison.longestRun >= THRESHOLDS.minRun);
	});

	it('does not flag original prose that shares only short phrases', () => {
		const comparison = compareTexts(
			'A metre is how far light goes in a tiny fraction of a second; the SI builds every length from it.',
			ARTICLE,
		);
		assert.equal(comparison.sharedShingles, 0);
		assert.ok(comparison.longestRun < THRESHOLDS.minRun);
		assert.equal(isFlagged(comparison), false);
	});

	it('flags on the overlap ratio alone when the run threshold is raised', () => {
		const comparison = { words: 20, shingles: 10, sharedShingles: 2, longestRun: 9, overlap: 0.2 };
		assert.equal(isFlagged(comparison, { minRun: 50, minOverlap: 0.15 }), true);
		assert.equal(isFlagged(comparison, { minRun: 50, minOverlap: 0.25 }), false);
	});

	it('requires both rules for a strong match, so one stock phrase is not enough', () => {
		const stockPhrase = {
			words: 60,
			shingles: 53,
			sharedShingles: 1,
			longestRun: 8,
			overlap: 1 / 53,
		};
		assert.equal(isFlagged(stockPhrase), true);
		assert.equal(isStrongMatch(stockPhrase), false);
		const copiedPassage = {
			words: 60,
			shingles: 53,
			sharedShingles: 20,
			longestRun: 27,
			overlap: 20 / 53,
		};
		assert.equal(isStrongMatch(copiedPassage), true);
	});

	it('reports zero overlap for a description shorter than one shingle', () => {
		const comparison = compareTexts('The metre.', ARTICLE);
		assert.equal(comparison.shingles, 0);
		assert.equal(comparison.overlap, 0);
	});
});
