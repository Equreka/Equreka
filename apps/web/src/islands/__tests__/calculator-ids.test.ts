/** @vitest-environment jsdom */
import engineArtifact from '@equreka/content/artifact/engine.json';
import type { CompiledEquationMeta, EngineSlice } from '@equreka/schema';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildConverterPayload } from '../../integrations/equreka-assets';
import { calculatorField } from '../../lib/calculator-fields';
import CalculatorIsland from '../calculator-island';

const payload = buildConverterPayload(engineArtifact as unknown as EngineSlice, 'en');

const TEX_KEYS: CompiledEquationMeta = {
	slug: 'synthetic-tex-term-keys',
	kind: 'equation',
	name: { en: 'TeX term keys' },
	calculatorEnabled: true,
	terms: {
		'\\gamma': { kind: 'magnitude', ref: 'plane-angle', identifier: 'gamma' },
		'v_{0}': { kind: 'magnitude', ref: 'speed', identifier: 'v_0' },
		'E_\\mathrm{k}': { kind: 'magnitude', ref: 'energy', identifier: 'E_k' },
		'[\\mathrm{H}^{+}]': {
			kind: 'symbol',
			label: { en: 'Hydrogen ion concentration' },
			unit: 'mole-per-cubic-metre',
			identifier: 'cH',
		},
	},
	solvable: ['E_\\mathrm{k}', '\\gamma', 'v_{0}'],
};

const FIELDS = [
	calculatorField(TEX_KEYS, '\\gamma', 'Angle', 'rad'),
	calculatorField(TEX_KEYS, 'v_{0}', 'Initial speed', 'm/s'),
	calculatorField(TEX_KEYS, 'E_\\mathrm{k}', 'Kinetic energy', 'J'),
	calculatorField(TEX_KEYS, '[\\mathrm{H}^{+}]', 'Hydrogen ion concentration', 'mol/m³'),
	calculatorField(TEX_KEYS, 'x^{\\prime}', 'Uncompiled term', ''),
];

const SAFE_ID = /^[A-Za-z0-9_:-]+$/;

let root: Root | undefined;

afterEach(() => {
	root?.unmount();
	root = undefined;
	document.body.replaceChildren();
	vi.unstubAllGlobals();
});

describe('CalculatorIsland element ids', () => {
	it('derives selector-safe, unique, resolvable ids from TeX term keys', async () => {
		vi.stubGlobal('fetch', async () => Response.json(payload));
		const container = document.createElement('div');
		document.body.append(container);
		root = createRoot(container);
		root.render(
			createElement(CalculatorIsland, {
				meta: TEX_KEYS,
				fields: FIELDS,
				constants: [],
				nonNegative: [],
			}),
		);
		await vi.waitFor(() => {
			expect(container.querySelector('select')).not.toBeNull();
			expect(container.querySelector('[aria-describedby]')).not.toBeNull();
		});

		const ids = [...container.querySelectorAll('[id]')].map((element) => element.id);
		expect(ids.length).toBeGreaterThan(FIELDS.length);
		for (const id of ids) expect(id).toMatch(SAFE_ID);
		expect(new Set(ids).size).toBe(ids.length);

		const inputs = [...container.querySelectorAll('input[type="text"]')];
		const labelled = [...container.querySelectorAll<HTMLLabelElement>('label[for]')].map((label) =>
			document.getElementById(label.htmlFor),
		);
		expect(inputs).toHaveLength(FIELDS.length);
		expect(labelled).toHaveLength(inputs.length);
		inputs.forEach((input, index) => {
			expect(labelled[index]).toBe(input);
			expect(container.querySelector(`#${input.id}`)).toBe(input);
		});

		const references = [...container.querySelectorAll('[aria-describedby], [aria-labelledby]')];
		expect(references.length).toBeGreaterThan(0);
		for (const element of references) {
			const tokens = ['aria-describedby', 'aria-labelledby'].flatMap(
				(name) => element.getAttribute(name)?.split(/\s+/).filter(Boolean) ?? [],
			);
			for (const token of tokens) expect(document.getElementById(token)).not.toBeNull();
		}
	});
});
