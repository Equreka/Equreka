import constantsPresentation from '@equreka/content/artifact/presentation/constants.json';
import type { Constant } from '@equreka/schema';
import { describe, expect, it } from 'vitest';
import { constantValueCards } from '../constant-values';

const constants = constantsPresentation as unknown as Record<
	string,
	Pick<Constant, 'value' | 'approximations'>
>;

describe('constantValueCards', () => {
	it('puts the authored approximations before the precision card, verbatim', () => {
		expect(constantValueCards(constants['speed-of-light'] ?? { value: '' })).toEqual([
			{ kind: 'approximate', values: ['3e+8'] },
			{ kind: 'precision', values: ['299792458'] },
		]);
		expect(constantValueCards(constants.pi ?? { value: '' })[0]).toEqual({
			kind: 'approximate',
			values: ['3.1416'],
		});
	});

	it('leaves the precision card alone for every constant without approximations', () => {
		const single = Object.entries(constants)
			.filter(([, constant]) => constantValueCards(constant).length === 1)
			.map(([slug]) => slug)
			.sort();
		expect(single).toEqual([
			'avogadro-constant',
			'boltzmann-constant',
			'elementary-charge',
			'hyperfine-transition-frequency-of-caesium',
			'luminous-efficacy-of-radiation',
			'planck-constant',
		]);
		for (const slug of single) {
			expect(constantValueCards(constants[slug] ?? { value: '' })).toEqual([
				{ kind: 'precision', values: [constants[slug]?.value] },
			]);
		}
	});
});
