import { describe, expect, it } from 'vitest';
import { checkElements } from '../elements.js';
import { resolveUnits } from '../resolve.js';
import { corpusWith } from './corpus-with.js';

const SOURCE = { name: 'Test source', ref: 'Table 1' };

const MAGNITUDES = {
	energy: {
		name: { en: 'Energy' },
		symbol: { tex: 'E' },
		baseUnit: 'joule',
		dimension: { L: '2', M: '1', T: '-2' },
	},
	'thermodynamic-temperature': {
		name: { en: 'Thermodynamic temperature' },
		symbol: { tex: 'T' },
		baseUnit: 'kelvin',
		dimension: { Th: '1' },
	},
	density: {
		name: { en: 'Density' },
		symbol: { tex: '\\rho' },
		baseUnit: 'kilogram-per-cubic-metre',
		dimension: { M: '1', L: '-3' },
	},
	length: {
		name: { en: 'Length' },
		symbol: { tex: 'l' },
		baseUnit: 'metre',
		dimension: { L: '1' },
	},
};

const UNITS = {
	joule: { name: { en: 'Joule' }, symbol: { tex: 'J' }, unitOf: ['energy'] },
	electronvolt: {
		name: { en: 'Electronvolt' },
		symbol: { tex: 'eV' },
		unitOf: ['energy'],
		toBase: { factor: '1.602176634e-19' },
	},
	kelvin: { name: { en: 'Kelvin' }, symbol: { tex: 'K' }, unitOf: ['thermodynamic-temperature'] },
	celsius: {
		name: { en: 'Degree Celsius' },
		symbol: { tex: '^{\\circ}C' },
		unitOf: ['thermodynamic-temperature'],
		toBase: { factor: '1', offset: '273.15' },
	},
	'kilogram-per-cubic-metre': {
		name: { en: 'Kilogram per cubic metre' },
		symbol: { tex: 'kg/m^{3}' },
		unitOf: ['density'],
	},
	metre: { name: { en: 'Metre' }, symbol: { tex: 'm' }, unitOf: ['length'] },
	decibel: {
		name: { en: 'Decibel' },
		symbol: { tex: 'dB' },
		unitOf: ['energy'],
		nonConvertible: true,
	},
};

function quantity(value: string, unit: string): Record<string, unknown> {
	return { value, unit, source: SOURCE };
}

/**
 * A coherent element with atomic number `z`; `fields` replace or add
 * properties.
 */
function element(
	symbol: string,
	z: number,
	configuration: string,
	fields: Record<string, unknown> = {},
): Record<string, unknown> {
	return {
		name: { en: symbol },
		symbol,
		atomicNumber: String(z),
		atomicWeight: { kind: 'value', value: '1', uncertainty: '0.1', source: SOURCE },
		electronConfiguration: { value: configuration, source: SOURCE },
		...fields,
	};
}

function messages(elements: Record<string, Record<string, unknown>>): string[] {
	const corpus = corpusWith({ magnitudes: MAGNITUDES, units: UNITS, elements });
	return checkElements(corpus, resolveUnits(corpus).resolved).map(
		(entry) => `${entry.file}: ${entry.message}`,
	);
}

describe('elements stage', () => {
	it('accepts coherent elements whose properties mix units of one dimension', () => {
		expect(
			messages({
				oxygen: element('O', 8, '[He] 2s2 2p4', {
					atomicWeight: { kind: 'interval', low: '15.99903', high: '15.99977', source: SOURCE },
					ionizationEnergies: {
						'1': quantity('13.618055', 'electronvolt'),
						'2': quantity('5.627e-18', 'joule'),
						'8': quantity('871.4099138', 'electronvolt'),
					},
					meltingPoint: quantity('-218.79', 'celsius'),
					boilingPoint: quantity('90.188', 'kelvin'),
					density: quantity('1.3088', 'kilogram-per-cubic-metre'),
					covalentRadius: quantity('6.6e-11', 'metre'),
					standardState: { value: 'gas', source: SOURCE },
				}),
				mercury: element('Hg', 80, '[Xe] 4f14 5d10 6s2', {
					meltingPoint: quantity('234.32', 'kelvin'),
					boilingPoint: quantity('356.62', 'celsius'),
					standardState: { value: 'liquid', source: SOURCE },
				}),
				carbon: element('C', 6, '1s2 2s2 2p2', {
					standardState: { value: 'solid', source: SOURCE },
				}),
				lithium: element('Li', 3, '[He] 2s1', {
					meltingPoint: quantity('453.69', 'kelvin'),
					standardState: { value: 'solid', source: SOURCE },
				}),
			}),
		).toEqual([]);
	});

	it('requires unique atomic numbers and symbols across the collection', () => {
		expect(
			messages({
				helium: element('He', 2, '1s2'),
				heliumtwo: element('He', 2, '1s2'),
			}),
		).toEqual([
			'elements/helium.yaml: atomicNumber: 2 is also the atomicNumber of elements/heliumtwo',
			'elements/heliumtwo.yaml: atomicNumber: 2 is also the atomicNumber of elements/helium',
			'elements/helium.yaml: symbol: He is also the symbol of elements/heliumtwo',
			'elements/heliumtwo.yaml: symbol: He is also the symbol of elements/helium',
		]);
	});

	it('requires a configuration that parses and holds atomicNumber electrons', () => {
		expect(
			messages({
				oxygen: element('O', 8, '[He] 2s2 2p3'),
				fluorine: element('F', 9, '[He] 2s2 2p7'),
				neon: element('Ne', 10, '[Ne] 3s1'),
			}),
		).toEqual([
			"elements/fluorine.yaml: electronConfiguration.value '[He] 2s2 2p7': 2p holds 1 to 6 electrons, not 7",
			"elements/neon.yaml: electronConfiguration.value '[Ne] 3s1' holds 11 electrons; atomic number 10 needs 10",
			"elements/oxygen.yaml: electronConfiguration.value '[He] 2s2 2p3' holds 7 electrons; atomic number 8 needs 8",
		]);
	});

	it('requires an atomic-weight interval to run from low to high', () => {
		const interval = (low: string, high: string) => ({
			atomicWeight: { kind: 'interval', low, high, source: SOURCE },
		});
		expect(
			messages({
				hydrogen: element('H', 1, '1s1', interval('1.00811', '1.00784')),
				boron: element('B', 5, '[He] 2s2 2p1', interval('10.806', '10.8060')),
				carbon: element('C', 6, '[He] 2s2 2p2', interval('12.0096', '12.0116')),
			}),
		).toEqual([
			'elements/boron.yaml: atomicWeight: the interval low 10.806 must be below its high 10.8060',
			'elements/hydrogen.yaml: atomicWeight: the interval low 1.00811 must be below its high 1.00784',
		]);
	});

	it('requires every quantity in a known, convertible unit of its property dimension', () => {
		expect(
			messages({
				neon: element('Ne', 10, '[He] 2s2 2p6', {
					density: quantity('0.82441', 'kelvin'),
					boilingPoint: quantity('27.1', 'kelvins'),
					covalentRadius: quantity('58', 'decibel'),
					ionizationEnergies: { '1': quantity('21.564541', 'metre') },
				}),
			}),
		).toEqual([
			"elements/neon.yaml: ionizationEnergies.1.unit: 'metre' has dimension [1, 0, 0, 0, 0, 0, 0, 0], not [2, 1, -2, 0, 0, 0, 0, 0] (energy)",
			"elements/neon.yaml: covalentRadius.unit: 'decibel' has no conversion to base units",
			"elements/neon.yaml: density.unit: 'kelvin' has dimension [0, 0, 0, 0, 1, 0, 0, 0], not [-3, 1, 0, 0, 0, 0, 0, 0] (density)",
			"elements/neon.yaml: boilingPoint.unit: unknown units ref 'kelvins'",
		]);
	});

	it('requires ionization energies up to atomicNumber, rising with n across units', () => {
		expect(
			messages({
				helium: element('He', 2, '1s2', {
					ionizationEnergies: {
						'1': quantity('24.587389011', 'electronvolt'),
						'2': quantity('3.9e-18', 'joule'),
						'3': quantity('100', 'electronvolt'),
					},
				}),
			}),
		).toEqual([
			'elements/helium.yaml: ionizationEnergies.2: removing electron 2 must cost more than removing electron 1',
			'elements/helium.yaml: ionizationEnergies.3: atomic number 2 leaves only 2 electrons to remove',
		]);
	});

	it('requires the boiling point above the melting point, whatever their units', () => {
		expect(
			messages({
				lithium: element('Li', 3, '[He] 2s1', {
					meltingPoint: quantity('453.69', 'kelvin'),
					boilingPoint: quantity('180.54', 'celsius'),
				}),
			}),
		).toEqual([
			'elements/lithium.yaml: boilingPoint: an element boils above the temperature at which it melts',
		]);
	});

	it('requires the standard state the melting and boiling points imply at 298.15 K', () => {
		expect(
			messages({
				beryllium: element('Be', 4, '[He] 2s2', {
					meltingPoint: quantity('1560', 'kelvin'),
					standardState: { value: 'gas', source: SOURCE },
				}),
				nitrogen: element('N', 7, '[He] 2s2 2p3', {
					boilingPoint: quantity('77.355', 'kelvin'),
					standardState: { value: 'solid', source: SOURCE },
				}),
				bromine: element('Br', 35, '[Ar] 3d10 4s2 4p5', {
					meltingPoint: quantity('-7.2', 'celsius'),
					boilingPoint: quantity('58.8', 'celsius'),
					standardState: { value: 'gas', source: SOURCE },
				}),
			}),
		).toEqual([
			"elements/beryllium.yaml: standardState.value: 'gas' contradicts the melting and boiling points, which make the element a solid at 298.15 K",
			"elements/bromine.yaml: standardState.value: 'gas' contradicts the melting and boiling points, which make the element a liquid at 298.15 K",
			"elements/nitrogen.yaml: standardState.value: 'solid' contradicts the melting and boiling points, which make the element a gas at 298.15 K",
		]);
	});
});
