import type { SolutionsModule } from '@equreka/engine/solutions';
import { createUnitRegistry } from '@equreka/engine/units';
import type {
	CompiledDimension,
	CompiledEquationMeta,
	CompiledMagnitude,
	CompiledUnit,
	EngineSlice,
} from '@equreka/schema';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
	type CalculatorInputs,
	type CalculatorUnitSource,
	createCalculatorUnits,
	solveInUnits,
	useCalculatorUnits,
} from '../hooks/use-calculator-units';

afterEach(cleanup);

const ENERGY: CompiledDimension = [2, 1, -2, 0, 0, 0, 0, 0];
const MASS: CompiledDimension = [0, 1, 0, 0, 0, 0, 0, 0];
const TEMPERATURE: CompiledDimension = [0, 0, 0, 0, 1, 0, 0, 0];

function unit(
	slug: string,
	magnitudes: string[],
	dimension: CompiledDimension,
	factor: string,
	options: { offset?: string; exact?: boolean } = {},
): CompiledUnit {
	const offset = options.offset ?? '0';
	return {
		slug,
		name: { en: slug },
		symbolTex: slug,
		symbolText: slug,
		magnitudes,
		system: 'other',
		dimension,
		factor,
		offset,
		exact: options.exact ?? true,
		affine: offset !== '0',
	};
}

function magnitude(
	slug: string,
	baseUnit: string,
	dimension: CompiledDimension,
	kindOf?: string,
): CompiledMagnitude {
	return {
		slug,
		name: { en: slug },
		symbolTex: slug,
		baseUnit,
		dimension,
		...(kindOf === undefined ? {} : { kindOf }),
		nonNegative: false,
	};
}

function equation(slug: string, terms: CompiledEquationMeta['terms']): CompiledEquationMeta {
	return {
		slug,
		kind: 'equation',
		name: { en: slug },
		calculatorEnabled: true,
		terms,
		solvable: Object.entries(terms)
			.filter(([, term]) => term.kind !== 'constant')
			.map(([key]) => key),
	};
}

const MASS_ENERGY = equation('mass-energy', {
	E: { kind: 'magnitude', ref: 'energy', identifier: 'E' },
	m: { kind: 'magnitude', ref: 'mass', identifier: 'm' },
	c: { kind: 'constant', ref: 'speed-of-light', identifier: 'c' },
});

const MIXED = equation('mixed', {
	W: { kind: 'magnitude', ref: 'work', identifier: 'W' },
	T: { kind: 'magnitude', ref: 'temperature', identifier: 'T' },
	k: { kind: 'symbol', unit: 'newton-metre-compound', identifier: 'k' },
	x: { kind: 'variable', ref: 'heat-amount', identifier: 'x' },
	n: { kind: 'symbol', identifier: 'n' },
});

const SLICE: EngineSlice = {
	schemaVersion: 2,
	contentHash: 'calculator-units-test',
	magnitudes: {
		energy: magnitude('energy', 'joule', ENERGY),
		work: magnitude('work', 'joule', ENERGY, 'energy'),
		heat: magnitude('heat', 'joule', ENERGY, 'energy'),
		torque: magnitude('torque', 'newton-metre', ENERGY),
		mass: magnitude('mass', 'kilogram', MASS),
		temperature: magnitude('temperature', 'kelvin', TEMPERATURE),
	},
	units: {
		joule: unit('joule', ['energy', 'work', 'heat'], ENERGY, '1'),
		erg: unit('erg', ['energy'], ENERGY, '0.0000001'),
		calorie: unit('calorie', ['heat'], ENERGY, '4.184'),
		'newton-metre': unit('newton-metre', ['torque'], ENERGY, '1'),
		'newton-metre-compound': unit('newton-metre-compound', [], ENERGY, '1'),
		kilogram: unit('kilogram', ['mass'], MASS, '1'),
		gram: unit('gram', ['mass'], MASS, '0.001'),
		'rough-pound': unit('rough-pound', ['mass'], MASS, '0.45', { exact: false }),
		kelvin: unit('kelvin', ['temperature'], TEMPERATURE, '1'),
		celsius: unit('celsius', ['temperature'], TEMPERATURE, '1', { offset: '273.15' }),
		rankine: unit(
			'rankine',
			['temperature'],
			TEMPERATURE,
			'0.555555555555555555555555555555555556',
			{
				exact: false,
			},
		),
	},
	prefixes: {},
	constants: {},
	equations: {},
};

const SOURCE: CalculatorUnitSource = {
	registry: createUnitRegistry(SLICE),
	magnitudes: SLICE.magnitudes,
	variables: { 'heat-amount': { defaultUnit: 'joule' } },
};

const C = 299792458;

const FNS: SolutionsModule = {
	'mass-energy': {
		E: ({ m, c }) => (m ?? Number.NaN) * (c ?? Number.NaN) ** 2,
		m: ({ E, c }) => (E ?? Number.NaN) / (c ?? Number.NaN) ** 2,
	},
};

const slugs = (units: readonly CompiledUnit[]): string[] => units.map((u) => u.slug).sort();

function inputs(
	raw: Record<string, string>,
	selected: Record<string, string> = {},
): CalculatorInputs {
	return { fields: ['E', 'm'], raw, constants: { c: String(C) }, selected };
}

describe('createCalculatorUnits', () => {
	const mixed = createCalculatorUnits(MIXED, SOURCE);

	it('resolves each term kind to the base unit solveEquation expects', () => {
		const units = createCalculatorUnits(MASS_ENERGY, SOURCE);
		expect(units.baseUnit('E')).toBe('joule');
		expect(units.baseUnit('m')).toBe('kilogram');
		expect(units.baseUnit('c')).toBe('');
		expect(mixed.baseUnit('k')).toBe('newton-metre-compound');
		expect(mixed.baseUnit('x')).toBe('joule');
		expect(mixed.baseUnit('n')).toBe('');
		expect(mixed.baseUnit('missing')).toBe('');
	});

	it('lists the kind family and counts what the dimension toggle adds', () => {
		const energy = createCalculatorUnits(MASS_ENERGY, SOURCE).options('E', false);
		expect(slugs(energy.units)).toEqual(['calorie', 'erg', 'joule']);
		expect(energy.hiddenByKind).toBe(2);

		const work = mixed.options('W', false);
		expect(slugs(work.units)).toEqual(['erg', 'joule']);
		expect(work.hiddenByKind).toBe(3);
		expect(slugs(mixed.options('W', true).units)).toEqual([
			'calorie',
			'erg',
			'joule',
			'newton-metre',
			'newton-metre-compound',
		]);
	});

	it('scopes a unit-anchored term by its anchor unit magnitudes', () => {
		expect(slugs(mixed.options('x', false).units)).toEqual(['calorie', 'erg', 'joule']);
		const compound = mixed.options('k', false);
		expect(slugs(compound.units)).toEqual(['newton-metre-compound']);
		expect(compound.hiddenByKind).toBe(4);
		expect(mixed.options('n', false)).toEqual({ units: [], hiddenByKind: 0 });
	});

	it('orders options from the smallest unit to the largest', () => {
		const mass = createCalculatorUnits(MASS_ENERGY, SOURCE).options('m', false);
		expect(mass.units.map((u) => u.slug)).toEqual(['gram', 'rough-pound', 'kilogram']);
	});

	it('never offers affine units, in either scope', () => {
		expect(slugs(mixed.options('T', false).units)).toEqual(['kelvin', 'rankine']);
		expect(slugs(mixed.options('T', true).units)).toEqual(['kelvin', 'rankine']);
	});

	it('converts in and out of the base unit and flags inexact factors', () => {
		const units = createCalculatorUnits(MASS_ENERGY, SOURCE);
		const toBase = units.toBase('m', 250, 'gram');
		expect(toBase.ok && toBase.value).toBeCloseTo(0.25, 15);
		const fromBase = units.fromBase('E', 1, 'erg');
		expect(fromBase.ok && fromBase.value).toBeCloseTo(1e7, 6);
		expect(units.toBase('m', 3, 'kilogram')).toEqual({ ok: true, value: 3 });
		expect(units.isExact('m', 'gram')).toBe(true);
		expect(units.isExact('m', 'rough-pound')).toBe(false);
		expect(units.isExact('m', 'kilogram')).toBe(true);
		const rejected = units.toBase('m', 1, 'joule');
		expect(rejected.ok ? null : rejected.error.code).toBe('units/incompatible-dimensions');
	});
});

describe('solveInUnits', () => {
	const units = createCalculatorUnits(MASS_ENERGY, SOURCE);

	it('returns no outcome before any input', () => {
		expect(solveInUnits(MASS_ENERGY, FNS, inputs({}), units).outcome).toBeNull();
	});

	it('converts a gram input to kilograms before solving and reports base-unit literals', () => {
		const run = solveInUnits(MASS_ENERGY, FNS, inputs({ m: '1' }, { m: 'gram' }), units);
		expect(run.outcome?.ok).toBe(true);
		if (run.outcome?.ok !== true) return;
		expect(run.outcome.value.symbol).toBe('E');
		expect(run.outcome.value.unit).toBe('joule');
		expect(run.outcome.value.value).toBeCloseTo(0.001 * C ** 2, 0);
		expect(run.outcome.value.exact).toBe(true);
		expect(run.literals).toEqual({ m: '0.001', c: String(C) });
	});

	it('displays the result in the selected unit, keeping the base value', () => {
		const run = solveInUnits(MASS_ENERGY, FNS, inputs({ m: '1' }, { m: 'gram', E: 'erg' }), units);
		if (run.outcome?.ok !== true) throw new Error('expected a solution');
		expect(run.outcome.value.unit).toBe('erg');
		expect(run.outcome.value.baseValue).toBeCloseTo(0.001 * C ** 2, 0);
		expect(run.outcome.value.value / run.outcome.value.baseValue).toBeCloseTo(1e7, 6);
	});

	it('marks the result approximate when any conversion on the path is inexact', () => {
		const run = solveInUnits(MASS_ENERGY, FNS, inputs({ m: '1' }, { m: 'rough-pound' }), units);
		expect(run.outcome?.ok === true && run.outcome.value.exact).toBe(false);
	});

	it('keeps the engine error contract for bad input and bad counts', () => {
		const nan = solveInUnits(MASS_ENERGY, FNS, inputs({ m: 'abc' }, { m: 'gram' }), units);
		expect(nan.outcome?.ok === false && nan.outcome.error.code).toBe('inputs/not-a-number');
		const nanBase = solveInUnits(MASS_ENERGY, FNS, inputs({ m: 'abc' }), units);
		expect(nanBase.outcome?.ok === false && nanBase.outcome.error.code).toBe('inputs/not-a-number');
		const both = solveInUnits(MASS_ENERGY, FNS, inputs({ m: '1', E: '2' }), units);
		expect(both.outcome?.ok === false && both.outcome.error.code).toBe('inputs/overdetermined');
	});

	it('solves in base units when no registry is available', () => {
		const run = solveInUnits(MASS_ENERGY, FNS, inputs({ m: '2' }), null);
		if (run.outcome?.ok !== true) throw new Error('expected a solution');
		expect(run.outcome.value.value).toBeCloseTo(2 * C ** 2, 0);
		expect(run.outcome.value.unit).toBe('');
		expect(run.outcome.value.exact).toBe(true);
	});
});

describe('useCalculatorUnits', () => {
	it('defaults every term to its base unit and records explicit choices', () => {
		const { result } = renderHook(() => useCalculatorUnits(MASS_ENERGY, SOURCE));
		expect(result.current.unitFor('m')).toBe('kilogram');
		act(() => result.current.select('m', 'gram'));
		expect(result.current.unitFor('m')).toBe('gram');
		expect(result.current.selected).toEqual({ m: 'gram' });
	});

	it('widens and narrows the scope, dropping a choice the kind scope no longer offers', () => {
		const { result } = renderHook(() => useCalculatorUnits(MIXED, SOURCE));
		expect(slugs(result.current.optionsFor('W').units)).toEqual(['erg', 'joule']);
		act(() => result.current.setShowAll('W', true));
		expect(result.current.showAllFor('W')).toBe(true);
		act(() => result.current.select('W', 'calorie'));
		act(() => result.current.select('x', 'erg'));
		act(() => result.current.setShowAll('W', false));
		expect(result.current.unitFor('W')).toBe('joule');
		expect(result.current.unitFor('x')).toBe('erg');
	});

	it('has no options and base-less units until a source exists', () => {
		const { result } = renderHook(() => useCalculatorUnits(MASS_ENERGY, null));
		expect(result.current.units).toBeNull();
		expect(result.current.optionsFor('E')).toEqual({ units: [], hiddenByKind: 0 });
		expect(result.current.unitFor('E')).toBe('');
	});
});
