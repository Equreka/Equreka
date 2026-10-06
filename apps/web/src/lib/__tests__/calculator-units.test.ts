import engineArtifact from '@equreka/content/artifact/engine.json';
import { solutions } from '@equreka/content/artifact/solutions.js';
import { createCalculatorUnits, solveInUnits } from '@equreka/core/hooks/use-calculator-units';
import { formatSigFigs } from '@equreka/engine/format';
import { createUnitRegistry } from '@equreka/engine/units';
import type { CompiledEquationMeta, EngineSlice } from '@equreka/schema';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { buildConverterPayload } from '../../integrations/equreka-assets';
import CalculatorIsland from '../../islands/calculator-island';
import { calculatorField } from '../calculator-fields';
import { calculatorUnitSourceOf } from '../calculator-units';

const slice = engineArtifact as unknown as EngineSlice;
const source = calculatorUnitSourceOf(buildConverterPayload(slice, 'en'));
const C = slice.constants['speed-of-light']?.value ?? '';

function meta(slug: string): CompiledEquationMeta {
	const equation = slice.equations[slug];
	if (equation === undefined) throw new Error(`missing equation ${slug}`);
	return equation;
}

const slugs = (units: readonly { slug: string }[]): string[] => units.map((u) => u.slug).sort();

const fullRegistry = createUnitRegistry(slice);

const fullSliceKindFamily = (magnitude: string): string[] =>
	slugs(fullRegistry.unitsForMagnitude(magnitude).filter((unit) => !unit.affine));

describe('calculator units over the client converter payload', () => {
	it('offers the kind family of each magnitude term from the trimmed payload', () => {
		const units = createCalculatorUnits(meta('mass-energy-equivalence'), source);
		const energyFamily = slugs(units.options('E', false).units);
		expect(energyFamily).toEqual(fullSliceKindFamily('energy'));
		expect(energyFamily).toEqual(expect.arrayContaining(['erg', 'foot-pound', 'joule']));
		expect(units.options('m', false).units.map((unit) => unit.slug)).toContain('gram');
		expect(units.options('c', false).units).toEqual([]);
	});

	it('solves mass-energy from grams and shows the energy in erg', () => {
		const equation = meta('mass-energy-equivalence');
		const units = createCalculatorUnits(equation, source);
		const run = (selected: Record<string, string>) =>
			solveInUnits(
				equation,
				solutions,
				{ fields: ['E', 'm'], raw: { m: '1' }, constants: { c: C }, selected },
				units,
			).outcome;

		const joules = run({ m: 'gram' });
		if (joules?.ok !== true) throw new Error('expected a solution');
		expect(formatSigFigs(joules.value.value)).toBe(formatSigFigs(0.001 * Number(C) ** 2));
		expect(joules.value.exact).toBe(true);

		const ergs = run({ m: 'gram', E: 'erg' });
		if (ergs?.ok !== true) throw new Error('expected a solution');
		expect(ergs.value.unit).toBe('erg');
		expect(formatSigFigs(ergs.value.value)).toBe('898755000000000000000');
		expect(ergs.value.exact).toBe(true);
	});

	it('converts a symbol term with a unit (area of a square from centimetres)', () => {
		const equation = meta('area-square');
		const units = createCalculatorUnits(equation, source);
		const areaFamily = slugs(units.options('A', false).units);
		expect(areaFamily).toContain('square-metre');
		expect(areaFamily).toEqual(fullSliceKindFamily('area'));
		expect(units.options('l', false).units.map((unit) => unit.slug)).toContain('centimetre');
		const outcome = solveInUnits(
			equation,
			solutions,
			{ fields: ['A', 'l'], raw: { l: '250' }, constants: {}, selected: { l: 'centimetre' } },
			units,
		).outcome;
		if (outcome?.ok !== true) throw new Error('expected a solution');
		expect(outcome.value.value).toBeCloseTo(6.25, 12);
	});

	it('orders the mass picker from smallest to largest scale factor', () => {
		const units = createCalculatorUnits(meta('mass-energy-equivalence'), source).options(
			'm',
			false,
		);
		const factors = units.units.map((unit) => Number(unit.factor));
		const sorted = [...factors].sort((a, b) => a - b);
		expect(factors).toEqual(sorted);
		const order = units.units.map((unit) => unit.slug);
		expect(order.indexOf('gram')).toBeLessThan(order.indexOf('kilogram'));
		expect(order.indexOf('microgram')).toBeLessThan(order.indexOf('gram'));
		expect(order.indexOf('long-ton')).toBeGreaterThan(order.indexOf('kilogram'));
	});
});

describe('CalculatorIsland server render', () => {
	it('labels each field with its base unit and renders no picker before the payload arrives', () => {
		const html = renderToString(
			createElement(CalculatorIsland, {
				meta: meta('mass-energy-equivalence'),
				fields: [
					{ key: 'E', label: 'Energy', symbolText: 'E', unitSymbol: 'J', solvable: true },
					{ key: 'm', label: 'Mass', symbolText: 'm', unitSymbol: 'kg', solvable: true },
				],
				constants: [
					{ key: 'c', name: 'Speed of light', symbolText: 'c', value: C, unitSymbol: 'm/s' },
				],
				nonNegative: ['m'],
			}),
		);
		const text = html.replaceAll('<!-- -->', '');
		expect(text).toContain('>Energy (J)</label>');
		expect(text).toContain('>Mass (kg)</label>');
		expect(html).not.toContain('<select');
		expect(html).toContain('type="submit"');
		expect(html).toContain('role="status"');
		expect(html).not.toContain('aria-required');
		expect(text).not.toContain('only: fill in every other field');
	});

	it('marks a field outside the solvable set as required and names the solvable terms', () => {
		const equation = { ...meta('mass-energy-equivalence'), solvable: ['E'] };
		const html = renderToString(
			createElement(CalculatorIsland, {
				meta: equation,
				fields: [
					calculatorField(equation, 'E', 'Energy', 'J'),
					calculatorField(equation, 'm', 'Mass', 'kg'),
				],
				constants: [],
				nonNegative: [],
			}),
		);
		expect(html.replaceAll('<!-- -->', '')).toContain(
			'This calculator solves for E only: fill in every other field.',
		);
		expect(html.match(/aria-required="true"/g)).toHaveLength(1);
	});

	it('draws the build-rendered expression as an aria-hidden backdrop', () => {
		const html = renderToString(
			createElement(
				CalculatorIsland,
				{ meta: meta('mass-energy-equivalence'), fields: [], constants: [], nonNegative: [] },
				createElement('span', { className: 'katex' }, 'E=mc2'),
			),
		);
		expect(html).toContain(
			'<div class="eq-calc-backdrop" aria-hidden="true"><span class="katex">E=mc2</span></div>',
		);
	});
});
