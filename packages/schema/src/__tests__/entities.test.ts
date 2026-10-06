import { describe, expect, it } from 'vitest';
import {
	branch,
	category,
	constant,
	equation,
	magnitude,
	path,
	prefix,
	unit,
} from '../entities.js';

describe('unit', () => {
	it('accepts a primitive affine unit (fahrenheit)', () => {
		const parsed = unit.parse({
			name: { en: 'Fahrenheit', es: 'Fahrenheit' },
			symbol: { tex: '°F' },
			unitOf: ['thermodynamic-temperature'],
			system: 'uscs',
			toBase: {
				factor: { num: '5', den: '9' },
				offset: { num: '45967', den: '180' },
			},
		});
		expect(parsed.toBase?.exact).toBe(true);
		expect(parsed.nonConvertible).toBe(false);
	});

	it('rejects a numeric rational (float64 truncation path)', () => {
		const result = unit.safeParse({
			name: { en: 'Fahrenheit' },
			symbol: { tex: '°F' },
			unitOf: ['thermodynamic-temperature'],
			toBase: { factor: { num: 5, den: 9 } },
		});
		expect(result.success).toBe(false);
	});

	it('accepts a prefixed unit (kilometre)', () => {
		const parsed = unit.parse({
			name: { en: 'Kilometre' },
			symbol: { tex: 'km' },
			unitOf: ['length'],
			system: 'si',
			prefixOf: { prefix: 'kilo', base: 'metre' },
		});
		expect(parsed.prefixOf?.base).toBe('metre');
	});

	it('accepts a composed unit with the default coefficient (joule per kelvin)', () => {
		const parsed = unit.parse({
			name: { en: 'Joule per kelvin' },
			symbol: { tex: '\\frac{J}{K}' },
			unitOf: ['entropy'],
			system: 'si-derived',
			compose: {
				of: [
					{ unit: 'joule', exp: 1 },
					{ unit: 'kelvin', exp: -1 },
				],
			},
		});
		expect(parsed.compose?.of).toHaveLength(2);
		expect(parsed.compose?.factor).toBe('1');
	});

	it('accepts a composed unit with an exact rational coefficient (arcminute)', () => {
		const parsed = unit.parse({
			name: { en: 'Arcminute' },
			symbol: { tex: "'" },
			unitOf: ['plane-angle'],
			compose: { factor: { num: '1', den: '60' }, of: [{ unit: 'degree', exp: '1' }] },
		});
		expect(parsed.compose?.factor).toEqual({ num: '1', den: '60' });
		expect(parsed.compose?.of[0]?.exp).toBe(1);
	});

	it('rejects the pre-coefficient array form of compose', () => {
		const result = unit.safeParse({
			name: { en: 'Square metre' },
			symbol: { tex: 'm^{2}' },
			unitOf: ['area'],
			compose: [{ unit: 'metre', exp: 2 }],
		});
		expect(result.success).toBe(false);
	});

	it('accepts a base unit with no derivation form (metre)', () => {
		const parsed = unit.parse({
			name: { en: 'Metre' },
			symbol: { tex: 'm' },
			unitOf: ['length'],
			system: 'si',
		});
		expect(parsed.toBase).toBeUndefined();
	});

	it('accepts a nonConvertible wiki-only unit (decibel)', () => {
		const parsed = unit.parse({
			name: { en: 'Decibel' },
			symbol: { tex: 'dB' },
			unitOf: ['dimensionless'],
			nonConvertible: 'true',
		});
		expect(parsed.nonConvertible).toBe(true);
	});

	it('rejects a nonConvertible unit that also authors a derivation form', () => {
		const result = unit.safeParse({
			name: { en: 'Decibel' },
			symbol: { tex: 'dB' },
			unitOf: ['dimensionless'],
			nonConvertible: true,
			toBase: { factor: '0.1' },
		});
		expect(result.success).toBe(false);
	});

	it('rejects a unit authored in two forms at once', () => {
		const result = unit.safeParse({
			name: { en: 'Broken' },
			symbol: { tex: 'x' },
			unitOf: ['length'],
			toBase: { factor: '2' },
			prefixOf: { prefix: 'kilo', base: 'metre' },
		});
		expect(result.success).toBe(false);
	});

	it('rejects composition exponent 0', () => {
		const result = unit.safeParse({
			name: { en: 'Broken' },
			symbol: { tex: 'x' },
			unitOf: ['length'],
			compose: { of: [{ unit: 'metre', exp: 0 }] },
		});
		expect(result.success).toBe(false);
	});
});

describe('decimal-string discipline', () => {
	it('rejects a numeric constant value (silent float64 truncation path)', () => {
		const result = constant.safeParse({
			name: { en: 'Speed of light' },
			symbol: { tex: 'c' },
			value: 299792458,
			unit: 'metre-per-second',
		});
		expect(result.success).toBe(false);
	});

	it('accepts full-precision decimal strings (pi to 105 digits)', () => {
		const digits = `3.${'14159265358979323846264338327950288419716939937510'.repeat(2)}`.slice(
			0,
			107,
		);
		const parsed = constant.parse({
			name: { en: 'Pi' },
			symbol: { tex: '\\pi' },
			value: digits,
			unit: 'unitless',
			exact: false,
			irrational: true,
		});
		expect(parsed.value).toBe(digits);
	});

	it('keeps authored constant approximations verbatim and leaves them absent by default', () => {
		const base = {
			name: { en: 'Speed of light' },
			symbol: { tex: 'c' },
			value: '299792458',
			unit: 'metre-per-second',
			exact: 'true',
		};
		expect(constant.parse({ ...base, approximations: ['3e+8'] }).approximations).toEqual(['3e+8']);
		expect(constant.parse(base)).not.toHaveProperty('approximations');
	});

	it('rejects numeric, empty and repeated constant approximations', () => {
		const base = {
			name: { en: 'Pi' },
			symbol: { tex: '\\pi' },
			value: '3.14159',
			unit: 'unitless',
		};
		expect(constant.safeParse({ ...base, approximations: [300000000] }).success).toBe(false);
		expect(constant.safeParse({ ...base, approximations: ['≈3.14'] }).success).toBe(false);
		expect(constant.safeParse({ ...base, approximations: [] }).success).toBe(false);
		expect(constant.safeParse({ ...base, approximations: ['3.14', '3.14'] }).success).toBe(false);
	});

	it('accepts scientific notation strings (elementary charge)', () => {
		const parsed = prefix.parse({
			name: { en: 'Quecto' },
			symbol: { tex: 'q' },
			value: '1e-30',
		});
		expect(parsed.value).toBe('1e-30');
	});
});

describe('equation', () => {
	it('accepts mass-energy equivalence with terms and solutions', () => {
		const parsed = equation.parse({
			name: { en: 'Mass-energy equivalence' },
			expression: '\\mag{E} = \\mag{m} \\const{c}^{2}',
			terms: {
				E: { kind: 'magnitude', ref: 'energy' },
				m: { kind: 'magnitude', ref: 'mass' },
				c: { kind: 'constant', ref: 'speed-of-light' },
			},
			solutions: {
				E: 'm * c^2',
				m: 'E / c^2',
			},
			calculator: { enabled: true },
		});
		expect(parsed.kind).toBe('equation');
		expect(Object.keys(parsed.solutions)).toEqual(['E', 'm']);
	});

	it('accepts equation-local symbol terms with and without a unit', () => {
		const parsed = equation.parse({
			name: { en: 'Area of a circle' },
			kind: 'formula',
			expression: '\\mag{A} = \\const{\\pi} \\var{r}^{2}',
			terms: {
				A: { kind: 'magnitude', ref: 'area' },
				'\\pi': { kind: 'constant', ref: 'pi' },
				r: { kind: 'symbol', label: { en: 'Radius' }, unit: 'metre' },
			},
		});
		expect(parsed.calculator.enabled).toBe(false);
		expect(parsed.terms.r).toEqual({ kind: 'symbol', label: { en: 'Radius' }, unit: 'metre' });
		const unitless = equation.parse({
			name: { en: 'Pythagorean theorem' },
			expression: '\\var{a}^{2}+\\var{b}^{2}=\\var{c}^{2}',
			terms: {
				a: { kind: 'symbol', label: { en: 'Leg' } },
				b: { kind: 'symbol', label: { en: 'Leg' } },
				c: { kind: 'symbol', label: { en: 'Hypotenuse' } },
			},
		});
		expect(unitless.terms.c).toEqual({ kind: 'symbol', label: { en: 'Hypotenuse' } });
	});

	it('rejects a symbol term carrying a ref, and a variable term carrying a label', () => {
		const base = {
			name: { en: 'Broken' },
			expression: '\\var{x}=\\var{y}',
		};
		expect(
			equation.safeParse({
				...base,
				terms: {
					x: { kind: 'symbol', label: { en: 'x' }, ref: 'radius' },
					y: { kind: 'symbol', label: { en: 'y' } },
				},
			}).success,
		).toBe(false);
		expect(
			equation.safeParse({
				...base,
				terms: {
					x: { kind: 'variable', ref: 'radius', label: { en: 'x' } },
					y: { kind: 'symbol', label: { en: 'y' } },
				},
			}).success,
		).toBe(false);
	});

	it('rejects the retired hand-maintained units[] list', () => {
		const result = equation.safeParse({
			name: { en: 'Square area' },
			expression: '\\mag{A}=\\var{l}^{2}',
			terms: {
				A: { kind: 'magnitude', ref: 'area' },
				l: { kind: 'symbol', label: { en: 'Side length' }, unit: 'metre' },
			},
			units: ['metre'],
		});
		expect(result.success).toBe(false);
	});
});

describe('magnitude', () => {
	it('accepts a dimension vector with the synthetic angle dimension', () => {
		const parsed = magnitude.parse({
			name: { en: 'Angular velocity' },
			symbol: { tex: '\\omega' },
			baseUnit: 'radian-per-second',
			dimension: { A: 1, T: -1 },
		});
		expect(parsed.dimension.A).toBe(1);
		expect(parsed.nonNegative).toBe(false);
	});

	it('takes an optional kindOf slug naming the broader quantity kind', () => {
		const work = {
			name: { en: 'Work' },
			symbol: { tex: 'W' },
			baseUnit: 'joule',
			dimension: { L: '2', M: '1', T: '-2' },
		};
		expect(magnitude.parse(work).kindOf).toBeUndefined();
		expect(magnitude.parse({ ...work, kindOf: 'energy' }).kindOf).toBe('energy');
		expect(magnitude.safeParse({ ...work, kindOf: 'Energy' }).success).toBe(false);
		expect(magnitude.safeParse({ ...work, kindOf: ['energy'] }).success).toBe(false);
	});
});

describe('failsafe-parse coercions (every YAML scalar arrives as a string)', () => {
	it('coerces string booleans and string integers to native types', () => {
		const parsed = magnitude.parse({
			name: { en: 'Angular velocity' },
			symbol: { tex: '\\omega' },
			baseUnit: 'radian-per-second',
			dimension: { A: '1', T: '-1' },
			nonNegative: 'true',
		});
		expect(parsed.dimension.A).toBe(1);
		expect(parsed.dimension.T).toBe(-1);
		expect(parsed.nonNegative).toBe(true);
	});

	it("rejects YAML 1.1 boolean spellings ('yes' must not coerce)", () => {
		const result = constant.safeParse({
			name: { en: 'Pi' },
			symbol: { tex: '\\pi' },
			value: '3.14159',
			unit: 'unitless',
			exact: 'yes',
		});
		expect(result.success).toBe(false);
	});

	it('coerces string exponents in compose and rejects non-integer strings', () => {
		const parsed = unit.parse({
			name: { en: 'Metre per second' },
			symbol: { tex: '\\frac{m}{s}' },
			unitOf: ['speed'],
			compose: {
				of: [
					{ unit: 'metre', exp: '1' },
					{ unit: 'second', exp: '-1' },
				],
			},
		});
		expect(parsed.compose?.of.map((operand) => operand.exp)).toEqual([1, -1]);
		const bad = unit.safeParse({
			name: { en: 'Broken' },
			symbol: { tex: 'x' },
			unitOf: ['length'],
			compose: { of: [{ unit: 'metre', exp: '1.5' }] },
		});
		expect(bad.success).toBe(false);
	});

	it('rejects unsafe-range integer strings', () => {
		const result = category.safeParse({
			name: { en: 'Broken' },
			order: '9007199254740993',
		});
		expect(result.success).toBe(false);
	});

	it('accepts string-rational toBase (the failsafe form of authored num/den)', () => {
		const parsed = unit.parse({
			name: { en: 'Rankine' },
			symbol: { tex: '°R' },
			unitOf: ['thermodynamic-temperature'],
			toBase: { factor: { num: '5', den: '9' }, exact: 'true' },
		});
		expect(parsed.toBase?.factor).toEqual({ num: '5', den: '9' });
		expect(parsed.toBase?.exact).toBe(true);
	});
});

describe('path', () => {
	const steps = [
		{ id: 'metre', kind: 'entry', ref: { collection: 'units', slug: 'metre' } },
		{ id: 'bridge', kind: 'prose', body: { en: 'Now the kilogram.' } },
		{
			id: 'check-1',
			kind: 'check',
			prompt: { en: 'How many SI base units are there?' },
			answer: { en: 'Seven.' },
		},
	];

	it('accepts the three step kinds, a level, prerequisites, and a string estimate', () => {
		const parsed = path.parse({
			name: { en: 'SI base units' },
			level: 'intro',
			prerequisites: ['temperature-scales'],
			estimatedMinutes: '12',
			steps,
		});
		expect(parsed.level).toBe('intro');
		expect(parsed.estimatedMinutes).toBe(12);
		expect(parsed.prerequisites).toEqual(['temperature-scales']);
		expect(parsed.steps.map((step) => step.kind)).toEqual(['entry', 'prose', 'check']);
	});

	it('defaults prerequisites to empty and leaves the estimate undefined', () => {
		const parsed = path.parse({ name: { en: 'Circles' }, level: 'intro', steps });
		expect(parsed.prerequisites).toEqual([]);
		expect(parsed.estimatedMinutes).toBeUndefined();
	});

	it('requires a level and rejects unknown levels', () => {
		expect(path.safeParse({ name: { en: 'Circles' }, steps }).success).toBe(false);
		expect(path.safeParse({ name: { en: 'Circles' }, level: 'expert', steps }).success).toBe(false);
	});

	it('rejects duplicate step ids, repeated prerequisites, and a non-positive estimate', () => {
		const base = { name: { en: 'Circles' }, level: 'intro' };
		expect(path.safeParse({ ...base, steps: [steps[0], steps[0]] }).success).toBe(false);
		expect(path.safeParse({ ...base, prerequisites: ['a', 'a'], steps }).success).toBe(false);
		expect(path.safeParse({ ...base, estimatedMinutes: '0', steps }).success).toBe(false);
	});

	it('rejects a check step without an answer, an entry into paths or categories, and a flat entry', () => {
		const base = { name: { en: 'Circles' }, level: 'intro' };
		expect(
			path.safeParse({
				...base,
				steps: [{ id: 'q', kind: 'check', prompt: { en: 'Why?' } }],
			}).success,
		).toBe(false);
		expect(
			path.safeParse({
				...base,
				steps: [{ id: 'p', kind: 'entry', ref: { collection: 'paths', slug: 'si-base-units' } }],
			}).success,
		).toBe(false);
		expect(
			path.safeParse({
				...base,
				steps: [{ id: 'c', kind: 'entry', ref: { collection: 'categories', slug: 'physics' } }],
			}).success,
		).toBe(false);
		expect(
			path.safeParse({
				...base,
				steps: [{ id: 'm', kind: 'entry', collection: 'units', slug: 'metre' }],
			}).success,
		).toBe(false);
	});
});

describe('magnitude-less compound units', () => {
	const newtonMetre = {
		name: { en: 'Newton metre' },
		symbol: { tex: 'N\\cdot m' },
		compose: {
			of: [
				{ unit: 'newton', exp: '1' },
				{ unit: 'metre', exp: '1' },
			],
		},
	};

	it('accepts an empty or omitted unitOf when compose is present', () => {
		expect(unit.parse({ ...newtonMetre, unitOf: [] }).unitOf).toEqual([]);
		expect(unit.parse(newtonMetre).unitOf).toEqual([]);
	});

	it('rejects an empty or omitted unitOf without compose', () => {
		const furlong = {
			name: { en: 'Furlong' },
			symbol: { tex: 'fur' },
			toBase: { factor: '201.168' },
		};
		expect(unit.safeParse({ ...furlong, unitOf: [] }).success).toBe(false);
		expect(unit.safeParse(furlong).success).toBe(false);
		expect(
			unit.safeParse({ name: { en: 'Metre' }, symbol: { tex: 'm' }, unitOf: [] }).success,
		).toBe(false);
	});
});

describe('editorial state and provenance', () => {
	const stone = {
		name: { en: 'Stone' },
		symbol: { tex: 'st' },
		unitOf: ['mass'],
		system: 'imperial',
	};

	it('defaults status to draft and accepts reviewed', () => {
		expect(unit.parse({ ...stone, toBase: { factor: '6.35029318' } }).status).toBe('draft');
		expect(
			magnitude.parse({
				name: { en: 'Mass' },
				symbol: { tex: 'm' },
				baseUnit: 'kilogram',
				dimension: { M: '1' },
				status: 'reviewed',
			}).status,
		).toBe('reviewed');
	});

	it('rejects an unknown status', () => {
		expect(
			unit.safeParse({ ...stone, toBase: { factor: '6.35029318' }, status: 'final' }).success,
		).toBe(false);
	});

	it('accepts a toBase source with name, ref and url', () => {
		const parsed = unit.parse({
			...stone,
			toBase: {
				factor: '6.35029318',
				source: {
					name: 'NIST SP 811',
					ref: 'B.8',
					url: 'https://www.nist.gov/pml/special-publication-811',
				},
			},
		});
		expect(parsed.toBase?.source).toEqual({
			name: 'NIST SP 811',
			ref: 'B.8',
			url: 'https://www.nist.gov/pml/special-publication-811',
		});
	});

	it('rejects a source without a name, with a bad url, or with unknown keys', () => {
		const withSource = (source: unknown) =>
			unit.safeParse({ ...stone, toBase: { factor: '6.35029318', source } }).success;
		expect(withSource({ ref: 'B.8' })).toBe(false);
		expect(withSource({ name: 'NIST SP 811', url: 'not a url' })).toBe(false);
		expect(withSource({ name: 'NIST SP 811', page: '52' })).toBe(false);
	});

	it('accepts a locator ref on a constant source', () => {
		const parsed = constant.parse({
			name: { en: 'Speed of light' },
			symbol: { tex: 'c' },
			value: '299792458',
			unit: 'metre-per-second',
			source: { name: 'CODATA 2018', ref: 'c' },
		});
		expect(parsed.source?.ref).toBe('c');
	});
});

describe('external identifiers', () => {
	const metre = { name: { en: 'Metre' }, symbol: { tex: 'm' }, unitOf: ['length'] };

	it('is optional and accepts a Wikidata QID and a QUDT IRI', () => {
		expect(unit.parse(metre).externalIds).toBeUndefined();
		const parsed = unit.parse({
			...metre,
			externalIds: { wikidata: 'Q11573', qudt: 'http://qudt.org/vocab/unit/M' },
		});
		expect(parsed.externalIds).toEqual({
			wikidata: 'Q11573',
			qudt: 'http://qudt.org/vocab/unit/M',
		});
	});

	it('rejects a malformed QID, a non-IRI qudt value, and unknown vocabularies', () => {
		const withIds = (externalIds: unknown) => unit.safeParse({ ...metre, externalIds }).success;
		expect(withIds({ wikidata: '11573' })).toBe(false);
		expect(withIds({ wikidata: 'Q11573a' })).toBe(false);
		expect(withIds({ wikidata: 'Q0' })).toBe(false);
		expect(withIds({ qudt: 'https://example.org/vocab/unit/M' })).toBe(false);
		expect(withIds({ qudt: 'unit:M' })).toBe(false);
		expect(withIds({ dbpedia: 'Metre' })).toBe(false);
	});
});

describe('branch', () => {
	it('accepts a failsafe-parsed branch and coerces its order', () => {
		const parsed = branch.parse({
			name: { en: 'Thermodynamics' },
			category: 'physics',
			order: '2',
		});
		expect(parsed).toEqual({
			name: { en: 'Thermodynamics' },
			category: 'physics',
			order: 2,
			aliases: [],
		});
	});

	it('names exactly one category and rejects entity fields', () => {
		expect(branch.safeParse({ name: { en: 'Optics' }, order: '0' }).success).toBe(false);
		expect(
			branch.safeParse({ name: { en: 'Optics' }, category: 'physics', order: '-1' }).success,
		).toBe(false);
		expect(
			branch.safeParse({
				name: { en: 'Optics' },
				category: 'physics',
				categories: ['physics'],
				order: '0',
			}).success,
		).toBe(false);
	});

	it('takes optional externalIds on branches and categories', () => {
		const ids = { wikidata: 'Q41217' };
		const branchBase = { name: { en: 'Mechanics' }, category: 'physics', order: '0' };
		expect(branch.parse(branchBase).externalIds).toBeUndefined();
		expect(branch.parse({ ...branchBase, externalIds: ids }).externalIds).toEqual(ids);
		expect(
			branch.safeParse({ ...branchBase, externalIds: { wikidata: 'mechanics' } }).success,
		).toBe(false);
		const categoryBase = { name: { en: 'Physics' }, order: '2' };
		expect(category.parse(categoryBase).externalIds).toBeUndefined();
		expect(
			category.parse({ ...categoryBase, externalIds: { wikidata: 'Q413' } }).externalIds,
		).toEqual({ wikidata: 'Q413' });
	});

	it('is listed on entities as slug refs, defaulting to none', () => {
		const base = { name: { en: 'Kilo' }, symbol: { tex: 'k' }, value: '1e3' };
		expect(prefix.parse(base).branches).toEqual([]);
		expect(prefix.parse({ ...base, branches: ['si-system'] }).branches).toEqual(['si-system']);
		expect(prefix.safeParse({ ...base, branches: ['SI System'] }).success).toBe(false);
	});
});
