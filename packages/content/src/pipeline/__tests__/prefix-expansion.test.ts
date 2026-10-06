import {
	type Prefix,
	prefix as prefixSchema,
	type Unit,
	unit as unitSchema,
} from '@equreka/schema';
import { describe, expect, it } from 'vitest';
import { expandPrefixedUnits, powerOfTenExponent } from '../prefix-expansion.js';

const PREFIXES: Record<string, Record<string, unknown>> = {
	kilo: { name: { en: 'Kilo', es: 'Kilo' }, symbol: { tex: 'k' }, value: '1e3' },
	milli: { name: { en: 'Milli', es: 'Mili' }, symbol: { tex: 'm' }, value: '1e-3' },
	micro: {
		name: { en: 'Micro', es: 'Micro' },
		symbol: { tex: 'μ' },
		value: '1e-6',
		aliases: ['mu', 'u', 'mc'],
	},
	mega: { name: { en: 'Mega' }, symbol: { tex: 'M' }, value: '1e6' },
	kibi: { name: { en: 'Kibi' }, symbol: { tex: 'Ki' }, value: '1024', system: 'binary' },
};

const METRE = {
	name: { en: 'Metre', es: 'Metro' },
	namePlural: { en: 'metres', es: 'metros' },
	symbol: { tex: 'm' },
	unitOf: ['length'],
	system: 'si',
	categories: ['physics'],
	aliases: ['meter', 'metres', 'meters'],
	prefixes: ['kilo', 'milli'],
	status: 'reviewed',
};

const LITRE = {
	name: { en: 'Litre', es: 'Litro' },
	namePlural: { en: 'litres', es: 'litros' },
	symbol: { tex: 'l' },
	unitOf: ['volume'],
	system: 'other',
	toBase: { factor: '0.001' },
	aliases: ['liter', 'L'],
	prefixes: ['milli', 'micro'],
};

const OHM = {
	name: { en: 'Ohm', es: 'Ohmio' },
	namePlural: { en: 'ohms', es: 'ohmios' },
	symbol: { tex: '\\Omega', text: 'Ω' },
	unitOf: ['electrical-resistance'],
	system: 'si-derived',
	compose: { of: [{ unit: 'volt', exp: 1 }] },
	prefixes: ['kilo', 'mega'],
};

function prefixMap(): Map<string, Prefix> {
	return new Map(Object.entries(PREFIXES).map(([slug, raw]) => [slug, prefixSchema.parse(raw)]));
}

/**
 * Raw unit files as the loader would hand them over: parsed for the unit
 * map, kept verbatim for the authored-keys map.
 */
function expand(raw: Record<string, Record<string, unknown>>) {
	const units = new Map<string, Unit>(
		Object.entries(raw).map(([slug, data]) => [slug, unitSchema.parse(data)]),
	);
	return expandPrefixedUnits(units, prefixMap(), new Map(Object.entries(raw)));
}

const messages = (result: ReturnType<typeof expand>): string[] =>
	result.issues.map((entry) => `${entry.file}: ${entry.message}`);

describe('powerOfTenExponent', () => {
	it('reads exact powers of ten in any decimal spelling', () => {
		expect(powerOfTenExponent('1e3')).toBe(3);
		expect(powerOfTenExponent('1000')).toBe(3);
		expect(powerOfTenExponent('1e-6')).toBe(-6);
		expect(powerOfTenExponent('0.01')).toBe(-2);
	});

	it('rejects non-powers of ten and 10^0', () => {
		expect(powerOfTenExponent('1024')).toBeNull();
		expect(powerOfTenExponent('2e3')).toBeNull();
		expect(powerOfTenExponent('1')).toBeNull();
	});
});

describe('expandPrefixedUnits', () => {
	it('generates one prefixOf unit per declared prefix, inheriting base fields', () => {
		const result = expand({ metre: METRE });
		expect(result.issues).toEqual([]);
		expect([...result.generated].sort()).toEqual(['kilometre', 'millimetre']);
		expect(result.overridden.size).toBe(0);
		expect(result.units.get('kilometre')).toMatchObject({
			prefixOf: { prefix: 'kilo', base: 'metre' },
			symbol: { tex: 'km' },
			unitOf: ['length'],
			system: 'si',
			categories: ['physics'],
			status: 'reviewed',
			prefixes: [],
		});
		expect(result.units.get('metre')).toEqual(unitSchema.parse(METRE));
	});

	it('composes names and plurals per locale, stressing Spanish metre compounds', () => {
		const result = expand({ metre: METRE, litre: LITRE });
		expect(result.units.get('kilometre')?.name).toEqual({ en: 'Kilometre', es: 'Kilómetro' });
		expect(result.units.get('millimetre')?.namePlural).toEqual({
			en: 'millimetres',
			es: 'milímetros',
		});
		expect(result.units.get('millilitre')?.name).toEqual({ en: 'Millilitre', es: 'Mililitro' });
		expect(result.units.get('microlitre')?.namePlural).toEqual({
			en: 'microlitres',
			es: 'microlitros',
		});
	});

	it('writes a multiple description that counts base units in the plural', () => {
		const description = expand({ metre: METRE }).units.get('kilometre')?.description;
		expect(description).toEqual({
			en: 'The kilometre is a decimal multiple of the metre, formed with the SI prefix kilo: 1 kilometre equals 1000 metres ($1\\ \\mathrm{km} = 10^{3}\\ \\mathrm{m}$).',
			es: 'Múltiplo decimal de la unidad metro, formado con el prefijo SI kilo: 1 kilómetro equivale a 1000 metros ($1\\ \\mathrm{km} = 10^{3}\\ \\mathrm{m}$).',
		});
	});

	it('writes a submultiple description that counts generated units, in TeX past 10^3', () => {
		const description = expand({ litre: LITRE }).units.get('microlitre')?.description;
		expect(description).toEqual({
			en: 'The microlitre is a decimal submultiple of the litre, formed with the SI prefix micro: 1 litre equals $10^{6}$ microlitres ($1\\ \\mathrm{μl} = 10^{-6}\\ \\mathrm{l}$).',
			es: 'Submúltiplo decimal de la unidad litro, formado con el prefijo SI micro: 1 litro equivale a $10^{6}$ microlitros ($1\\ \\mathrm{μl} = 10^{-6}\\ \\mathrm{l}$).',
		});
	});

	it('omits a locale the prefix does not name, so it falls back as untranslated', () => {
		const megaohm = expand({ ohm: OHM }).units.get('megaohm');
		expect(megaohm?.name).toEqual({ en: 'Megaohm' });
		expect(megaohm?.description?.es).toBeUndefined();
		expect(megaohm?.description?.en).toContain('1 megaohm equals $10^{6}$ ohms');
	});

	it('composes symbols and derives aliases from spellings, notations and ASCII prefixes', () => {
		const result = expand({ metre: METRE, litre: LITRE, ohm: OHM });
		expect(result.units.get('kiloohm')?.symbol).toEqual({ tex: 'k\\Omega', text: 'kΩ' });
		expect(result.units.get('millimetre')?.aliases).toEqual([
			'millimeter',
			'millimetres',
			'millimeters',
		]);
		expect(result.units.get('microlitre')?.aliases).toEqual(['microliter', 'μL', 'ul']);
	});

	it('merges a hand override over the generated unit, hand fields winning', () => {
		const result = expand({
			metre: METRE,
			kilometre: {
				name: { en: 'Kilometre' },
				symbol: { tex: 'km' },
				unitOf: ['length'],
				prefixOf: { prefix: 'kilo', base: 'metre' },
				aliases: ['klick'],
				description: { en: 'Hand prose.' },
			},
		});
		expect(result.issues).toEqual([]);
		expect(result.overridden).toEqual(new Set(['kilometre']));
		expect(result.generated.has('kilometre')).toBe(false);
		const kilometre = result.units.get('kilometre');
		expect(kilometre?.name).toEqual({ en: 'Kilometre', es: 'Kilómetro' });
		expect(kilometre?.description?.en).toBe('Hand prose.');
		expect(kilometre?.description?.es).toContain('1 kilómetro equivale a 1000 metros');
		expect(kilometre?.aliases).toEqual(['kilometer', 'kilometres', 'kilometers', 'klick']);
		expect(kilometre?.system).toBe('si');
		expect(kilometre?.status).toBe('reviewed');
	});

	it('lets an override replace a non-localized field it authors', () => {
		const result = expand({
			metre: METRE,
			kilometre: {
				name: { en: 'Kilometre' },
				symbol: { tex: 'km' },
				unitOf: ['length'],
				prefixOf: { prefix: 'kilo', base: 'metre' },
				status: 'draft',
				categories: ['universal'],
			},
		});
		expect(result.units.get('kilometre')).toMatchObject({
			status: 'draft',
			categories: ['universal'],
		});
	});

	it('rejects a hand file of a generated slug with a different meaning', () => {
		const result = expand({
			metre: METRE,
			kilometre: {
				name: { en: 'Kilometre' },
				symbol: { tex: 'km' },
				unitOf: ['length'],
				toBase: { factor: '999' },
			},
		});
		expect(messages(result)).toEqual([
			expect.stringContaining(
				'units/kilometre.yaml: collides with the unit generated from kilo × metre',
			),
		]);
		expect(result.units.get('kilometre')?.toBase?.factor).toBe('999');
	});

	it('rejects a prefixOf file for a pair its base does not declare', () => {
		const result = expand({
			metre: METRE,
			megametre: {
				name: { en: 'Megametre' },
				symbol: { tex: 'Mm' },
				unitOf: ['length'],
				prefixOf: { prefix: 'mega', base: 'metre' },
			},
		});
		expect(messages(result)).toEqual([
			expect.stringContaining(
				"units/megametre.yaml: prefixOf mega × metre is not declared: add 'mega' to the prefixes of units/metre.yaml",
			),
		]);
	});

	it('rejects a prefixOf file duplicating a generated pair under another slug', () => {
		const result = expand({
			metre: METRE,
			'kilo-metre': {
				name: { en: 'Kilometre' },
				symbol: { tex: 'km' },
				unitOf: ['length'],
				prefixOf: { prefix: 'kilo', base: 'metre' },
			},
		});
		expect(messages(result)).toEqual([
			expect.stringContaining(
				"units/kilo-metre.yaml: duplicates the generated unit 'kilometre' (kilo × metre)",
			),
		]);
	});

	it('rejects prefixes on an affine unit and generates nothing from it', () => {
		const result = expand({
			celsius: {
				name: { en: 'Degree Celsius' },
				namePlural: { en: 'degrees Celsius' },
				symbol: { tex: '^{\\circ}C' },
				unitOf: ['thermodynamic-temperature'],
				toBase: { factor: '1', offset: '273.15' },
				prefixes: ['milli'],
			},
		});
		expect(messages(result)).toEqual([
			'units/celsius.yaml: prefixes on an affine unit (offset ≠ 0) are meaningless; remove its prefixes',
		]);
		expect(result.generated.size).toBe(0);
	});

	it('rejects unknown and non-decimal prefixes', () => {
		const result = expand({ metre: { ...METRE, prefixes: ['kilo', 'kibi', 'hella'] } });
		expect(messages(result)).toEqual([
			expect.stringContaining("units/metre.yaml: prefixes: 'kibi' (1024) is not a nonzero power"),
			"units/metre.yaml: prefixes: unknown prefixes ref 'hella'",
		]);
		expect([...result.generated]).toEqual(['kilometre']);
	});
});

describe('unit schema prefix rules', () => {
	const issuesOf = (data: Record<string, unknown>): string[] => {
		const parsed = unitSchema.safeParse(data);
		return parsed.success ? [] : parsed.error.issues.map((entry) => entry.message);
	};

	it('rejects prefixes on a prefixed unit (no nested prefixes)', () => {
		expect(
			issuesOf({
				name: { en: 'Kilometre' },
				namePlural: { en: 'kilometres' },
				symbol: { tex: 'km' },
				unitOf: ['length'],
				prefixOf: { prefix: 'kilo', base: 'metre' },
				prefixes: ['milli'],
			}),
		).toEqual(['a prefixed unit takes no further prefixes; declare them on its base unit']);
	});

	it('rejects prefixes on a nonConvertible unit', () => {
		expect(
			issuesOf({
				name: { en: 'Bel' },
				namePlural: { en: 'bels' },
				symbol: { tex: 'B' },
				unitOf: ['level'],
				nonConvertible: true,
				prefixes: ['deci'],
			}),
		).toEqual(['a nonConvertible unit has no factor for a prefix to scale']);
	});

	it('requires namePlural with prefixes and rejects repeats', () => {
		expect(issuesOf({ ...METRE, namePlural: undefined, prefixes: ['kilo', 'kilo'] })).toEqual([
			'prefixes must not repeat',
			'namePlural is required with prefixes: generated names and descriptions count in the plural',
		]);
	});
});
