import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadContent } from '../load.js';
import { deriveRelatedUnits } from '../related-units.js';
import { validateContent } from '../validate.js';

const CONTENT_DIR = fileURLToPath(new URL('../../../content/', import.meta.url));

describe('deriveRelatedUnits', () => {
	const { corpus } = validateContent(loadContent(CONTENT_DIR));

	it('lists the units behind each term kind once, in term order', () => {
		const areaCircle = corpus.equations.get('area-circle');
		const massEnergy = corpus.equations.get('mass-energy-equivalence');
		const pythagorean = corpus.equations.get('pythagorean-theorem');
		expect(areaCircle).toBeDefined();
		expect(massEnergy).toBeDefined();
		expect(pythagorean).toBeDefined();
		if (areaCircle === undefined || massEnergy === undefined || pythagorean === undefined) {
			return;
		}
		expect(deriveRelatedUnits(areaCircle.terms, corpus)).toEqual([
			'square-metre',
			'unitless',
			'metre',
		]);
		expect(deriveRelatedUnits(massEnergy.terms, corpus)).toEqual([
			'joule',
			'kilogram',
			'metre-per-second',
		]);
		expect(deriveRelatedUnits(pythagorean.terms, corpus)).toEqual([]);
	});

	it('follows a variable term to its defaultUnit and dedupes', () => {
		expect(
			deriveRelatedUnits(
				{
					r: { kind: 'variable', ref: 'radius', integer: false },
					l: { kind: 'symbol', label: { en: 'Side' }, unit: 'metre', integer: false },
					x: { kind: 'symbol', label: { en: 'Ratio' }, integer: false },
				},
				corpus,
			),
		).toEqual(['metre']);
	});
});
