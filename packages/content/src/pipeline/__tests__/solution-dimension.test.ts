import { fileURLToPath } from 'node:url';
import { collectionSchemas } from '@equreka/schema';
import { describe, expect, it } from 'vitest';
import { loadContent } from '../load.js';
import { checkSolutionDimensions, dimensionOf } from '../solution-dimension.js';
import { parseSolution } from '../solution-parser.js';
import { type Corpus, validateContent } from '../validate.js';

const CONTENT_DIR = fileURLToPath(new URL('../../../content/', import.meta.url));

function realCorpus(): Corpus {
	const validated = validateContent(loadContent(CONTENT_DIR));
	expect(validated.issues).toEqual([]);
	return validated.corpus;
}

describe('checkSolutionDimensions over the real corpus', () => {
	it('passes every authored solution of every equation', () => {
		const corpus = realCorpus();
		expect(corpus.equations.size).toBe(4);
		expect(checkSolutionDimensions(corpus)).toEqual([]);
	});

	it('fails a wrong solved form, naming equation and symbol', () => {
		const corpus = realCorpus();
		const massEnergy = corpus.equations.get('mass-energy-equivalence');
		expect(massEnergy).toBeDefined();
		corpus.equations.set(
			'mass-energy-equivalence',
			collectionSchemas.equations.parse({
				...massEnergy,
				solutions: { E: 'm * c', m: 'E / c^2' },
			}),
		);
		expect(checkSolutionDimensions(corpus)).toEqual([
			{
				severity: 'error',
				stage: 'dimensions',
				file: 'equations/mass-energy-equivalence.yaml',
				message:
					"solution for 'E' has dimension [1, 1, -1, 0, 0, 0, 0, 0] but the term has [2, 1, -2, 0, 0, 0, 0, 0]",
			},
		]);
	});

	it('fails a solution whose radicand has odd dimension exponents', () => {
		const corpus = realCorpus();
		const areaSquare = corpus.equations.get('area-square');
		corpus.equations.set(
			'area-square',
			collectionSchemas.equations.parse({ ...areaSquare, solutions: { A: 'sqrt(l^3)' } }),
		);
		expect(checkSolutionDimensions(corpus).map((entry) => entry.message)).toEqual([
			expect.stringContaining("solution for 'A': sqrt of [3, 0, 0, 0, 0, 0, 0, 0]"),
		]);
	});
});

describe('dimensionOf', () => {
	const L: [number, number, number, number, number, number, number, number] = [
		1, 0, 0, 0, 0, 0, 0, 0,
	];
	const T: [number, number, number, number, number, number, number, number] = [
		0, 0, 1, 0, 0, 0, 0, 0,
	];
	const env = { x: L, y: L, t: T, k: [0, 0, 0, 0, 0, 0, 0, 0] as typeof L };
	const dim = (source: string) => dimensionOf(parseSolution(source), env);

	it('applies product, quotient, power, and root algebra', () => {
		expect(dim('x * y')).toEqual([2, 0, 0, 0, 0, 0, 0, 0]);
		expect(dim('x / t^2')).toEqual([1, 0, -2, 0, 0, 0, 0, 0]);
		expect(dim('sqrt(x * y)')).toEqual(L);
		expect(dim('(x * y)^0.5')).toEqual(L);
		expect(dim('x^-1')).toEqual([-1, 0, 0, 0, 0, 0, 0, 0]);
		expect(dim('abs(x - y)')).toEqual(L);
		expect(dim('2 * pi * k')).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
	});

	it('rejects incompatible sums, dimensioned transcendental arguments, and non-literal exponents', () => {
		expect(() => dim('x + t')).toThrow(/combines incompatible dimensions/);
		expect(() => dim('sin(x)')).toThrow(/requires a dimensionless argument/);
		expect(() => dim('x^k')).toThrow(/non-literal exponent/);
		expect(() => dim('sqrt(x)')).toThrow(/non-integral/);
		expect(dim('k^k')).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
	});
});
