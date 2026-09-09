import { describe, expect, it } from 'vitest';
import { category, constant, equation, magnitude, prefix, unit } from '../entities.js';

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
