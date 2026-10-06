import { describe, expect, it } from 'vitest';
import {
	buildIdentifierMap,
	isCarriableTermKey,
	italicLetterRun,
	macroUses,
	stripMacrosWith,
	stripTexForSearch,
} from '../tex.js';

describe('stripTexForSearch', () => {
	it('folds hard line breaks and paragraph breaks to single spaces', () => {
		expect(stripTexForSearch('in use.\n- $M$ is used\n\nBecause')).toBe(
			'in use. - is used Because',
		);
	});

	it('never glues the words on either side of a break that follows math', () => {
		expect(stripTexForSearch('squared $(\\const{c}^{2})$.\nBecause')).toBe('squared . Because');
		expect(stripTexForSearch('mass\n$$E$$\nenergy')).toBe('mass energy');
	});
});

describe('annotation macros', () => {
	it('carry keys with one level of nested braces', () => {
		expect(
			macroUses('\\var{K}=\\var{[\\mathrm{H}^{+}]}\\var{[\\mathrm{OH}^{-}]}\\mag{v_{0}}'),
		).toEqual([
			{ kind: 'variable', arg: 'K' },
			{ kind: 'variable', arg: '[\\mathrm{H}^{+}]' },
			{ kind: 'variable', arg: '[\\mathrm{OH}^{-}]' },
			{ kind: 'magnitude', arg: 'v_{0}' },
		]);
		expect(stripMacrosWith('\\mag{E}=\\var{v_{0}}^{2}', (arg) => `<${arg}>`)).toBe(
			'{<E>}={<v_{0}>}^{2}',
		);
	});

	it('decide carriability from the macro pattern itself', () => {
		expect(isCarriableTermKey('v_{0}')).toBe(true);
		expect(isCarriableTermKey('t_{1/2}')).toBe(true);
		expect(isCarriableTermKey('[\\mathrm{H}^{+}]')).toBe(true);
		expect(isCarriableTermKey('x_{a_{b}}')).toBe(false);
		expect(isCarriableTermKey('x}')).toBe(false);
		expect(isCarriableTermKey('{x')).toBe(false);
	});
});

describe('buildIdentifierMap', () => {
	it('derives identifiers from keys, lets overrides win, and keys the map by term key', () => {
		const map = buildIdentifierMap({
			'\\pi': { kind: 'constant', ref: 'pi' },
			'v_{0}': { kind: 'symbol' },
			'[\\mathrm{H}^{+}]': { kind: 'symbol', identifier: 'cH' },
		});
		expect(map.errors).toEqual([]);
		expect([...map.byTermKey]).toEqual([
			['\\pi', 'pi'],
			['v_{0}', 'v_0'],
			['[\\mathrm{H}^{+}]', 'cH'],
		]);
	});
});

describe('italicLetterRun', () => {
	it('finds a bare multi-letter run', () => {
		expect(italicLetterRun('KE')).toBe('KE');
		expect(italicLetterRun('E_{kin}')).toBe('kin');
	});

	it('exempts upright groups, control words and single letters', () => {
		for (const key of [
			'\\mathrm{KE}',
			'\\text{pH}',
			'\\operatorname{Re}',
			'\\Delta x',
			'\\varepsilon_0',
			'R_\\infty',
			'v_{0}',
			't_{1/2}',
			'[\\mathrm{H}^{+}]',
			'\\bar{x}',
			'E_{\\mathrm{k}}',
		]) {
			expect(italicLetterRun(key), key).toBeUndefined();
		}
	});
});
