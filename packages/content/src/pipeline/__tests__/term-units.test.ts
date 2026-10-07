import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadContent } from '../load.js';
import { resolveUnits } from '../resolve.js';
import { checkTermAnchors } from '../term-units.js';
import { validateContent } from '../validate.js';
import { corpusWith } from './corpus-with.js';

const CONTENT_DIR = fileURLToPath(new URL('../../../content/', import.meta.url));

const magnitude = (baseUnit: string, dimension: Record<string, string>) => ({
	name: { en: baseUnit },
	symbol: { tex: 'x' },
	baseUnit,
	dimension,
});

const unit = (unitOf: string, extra: Record<string, unknown> = {}) => ({
	name: { en: unitOf },
	symbol: { tex: 'u' },
	unitOf: [unitOf],
	...extra,
});

const MAGNITUDES = {
	'plane-angle': magnitude('radian', { A: '1' }),
	energy: magnitude('joule', { L: '2', M: '1', T: '-2' }),
	temperature: magnitude('kelvin', { Th: '1' }),
	ratio: magnitude('unitless', {}),
};

const UNITS = {
	radian: unit('plane-angle'),
	degree: unit('plane-angle', { toBase: { factor: '0.0174532925199432957692369076848861271' } }),
	joule: unit('energy'),
	electronvolt: unit('energy', { toBase: { factor: '1.602176634e-19' } }),
	kelvin: unit('temperature'),
	celsius: unit('temperature', { toBase: { factor: '1', offset: '273.15' } }),
	unitless: unit('ratio'),
	percent: unit('ratio', { toBase: { factor: '0.01' } }),
	decibel: unit('ratio', { nonConvertible: true }),
};

const CONSTANTS = {
	'electron-charge-energy': {
		name: { en: 'One electronvolt' },
		symbol: { tex: 'E_{e}' },
		value: '1',
		unit: 'electronvolt',
		exact: true,
	},
	'joule-energy': {
		name: { en: 'One joule' },
		symbol: { tex: 'E_{J}' },
		value: '1',
		unit: 'joule',
		exact: true,
	},
};

const VARIABLES = {
	'room-temperature': {
		name: { en: 'Room temperature' },
		symbol: { tex: 'T' },
		defaultUnit: 'celsius',
	},
	temperature: { name: { en: 'Temperature' }, symbol: { tex: 'T' }, defaultUnit: 'kelvin' },
};

function anchorMessages(terms: Record<string, unknown>): string[] {
	const corpus = corpusWith({
		magnitudes: MAGNITUDES,
		units: UNITS,
		constants: CONSTANTS,
		variables: VARIABLES,
		equations: {
			sample: {
				name: { en: 'Sample' },
				level: 'intro',
				algebraic: false,
				expression: Object.keys(terms)
					.map((key) => `\\var{${key}}`)
					.join('='),
				terms,
			},
		},
	});
	const resolution = resolveUnits(corpus);
	expect(resolution.issues).toEqual([]);
	return checkTermAnchors(corpus, resolution.resolved).map((entry) => {
		expect(entry).toMatchObject({
			severity: 'error',
			stage: 'anchors',
			file: 'equations/sample.yaml',
		});
		return entry.message;
	});
}

const symbol = (unitSlug: string) => ({ kind: 'symbol', label: { en: 'Term' }, unit: unitSlug });

describe('checkTermAnchors', () => {
	it('accepts a radian-anchored angle and rejects a degree-anchored one', () => {
		expect(anchorMessages({ '\\theta': symbol('radian') })).toEqual([]);
		expect(anchorMessages({ '\\theta': symbol('degree') })).toEqual([
			"term '\\theta': unit 'degree', which resolves to factor 0.0174532925199432957692369076848861271 offset 0; a term anchors on the SI-coherent unit of its dimension (factor 1, offset 0), because the calculator solves in anchor units",
		]);
	});

	it('rejects a constant authored in a non-coherent unit, which the calculator injects raw', () => {
		expect(anchorMessages({ E: { kind: 'constant', ref: 'joule-energy' } })).toEqual([]);
		expect(anchorMessages({ E: { kind: 'constant', ref: 'electron-charge-energy' } })).toEqual([
			expect.stringMatching(
				/^term 'E': constant 'electron-charge-energy' is in 'electronvolt', which resolves to factor [0-9.e-]+ offset 0;/,
			),
		]);
	});

	it('rejects a variable whose defaultUnit carries an affine offset', () => {
		expect(anchorMessages({ T: { kind: 'variable', ref: 'temperature' } })).toEqual([]);
		expect(anchorMessages({ T: { kind: 'variable', ref: 'room-temperature' } })).toEqual([
			expect.stringMatching(
				/^term 'T': variable 'room-temperature' has defaultUnit 'celsius', which resolves to factor 1 offset 273\.15;/,
			),
		]);
	});

	it('rejects a dimensionless symbol scaled by its unit and one anchored on a nonConvertible unit', () => {
		expect(anchorMessages({ x: symbol('unitless') })).toEqual([]);
		expect(anchorMessages({ x: symbol('percent') })).toEqual([
			expect.stringMatching(/^term 'x': unit 'percent', which resolves to factor 0\.01 offset 0;/),
		]);
		expect(anchorMessages({ x: symbol('decibel') })).toEqual([
			"term 'x': unit 'decibel', which is nonConvertible; a term anchors on a convertible SI-coherent unit",
		]);
	});

	it('leaves magnitude terms and unitless symbol terms alone', () => {
		expect(
			anchorMessages({
				E: { kind: 'magnitude', ref: 'energy' },
				n: { kind: 'symbol', label: { en: 'Count' } },
			}),
		).toEqual([]);
	});

	it('passes the real corpus', () => {
		const { corpus } = validateContent(loadContent(CONTENT_DIR));
		expect(checkTermAnchors(corpus, resolveUnits(corpus).resolved)).toEqual([]);
	});
});
