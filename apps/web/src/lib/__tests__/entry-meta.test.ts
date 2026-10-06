import engineArtifact from '@equreka/content/artifact/engine.json';
import unitsPresentation from '@equreka/content/artifact/presentation/units.json';
import type { EngineSlice } from '@equreka/schema';
import { describe, expect, it } from 'vitest';
import {
	converterMagnitudeOf,
	definedTermJsonLd,
	externalLinks,
	isDraft,
	serializeJsonLd,
} from '../entry-meta';

const slice = engineArtifact as unknown as EngineSlice;

const units = unitsPresentation as unknown as Record<string, { status: 'draft' | 'reviewed' }>;

describe('isDraft', () => {
	it('shows the draft badge for draft and unstated status, hides it for reviewed', () => {
		expect(isDraft('draft')).toBe(true);
		expect(isDraft(undefined)).toBe(true);
		expect(isDraft('reviewed')).toBe(false);
	});

	it('follows the status the pipeline emits (stone reviewed, metre draft)', () => {
		expect(isDraft(units.stone?.status)).toBe(false);
		expect(isDraft(units.metre?.status)).toBe(true);
	});
});

describe('externalLinks', () => {
	it('is empty without identifiers and orders Wikidata before QUDT', () => {
		expect(externalLinks(undefined)).toEqual([]);
		expect(externalLinks({})).toEqual([]);
		expect(externalLinks({ qudt: 'http://qudt.org/vocab/unit/M', wikidata: 'Q11573' })).toEqual([
			{ label: 'Wikidata', href: 'https://www.wikidata.org/entity/Q11573' },
			{ label: 'QUDT', href: 'http://qudt.org/vocab/unit/M' },
		]);
	});
});

describe('definedTermJsonLd', () => {
	const base = { name: 'Metre', url: 'https://equreka.com/units/metre/', inLanguage: 'en' };

	it('omits sameAs when no identifier is authored', () => {
		const jsonLd = definedTermJsonLd(base);
		expect(jsonLd).toEqual({
			'@context': 'https://schema.org',
			'@type': 'DefinedTerm',
			name: 'Metre',
			url: 'https://equreka.com/units/metre/',
			inLanguage: 'en',
		});
	});

	it('adds sameAs from the Wikidata QID and QUDT IRI', () => {
		const jsonLd = definedTermJsonLd({
			...base,
			description: 'SI base unit of length.',
			externalIds: { wikidata: 'Q11573', qudt: 'http://qudt.org/vocab/unit/M' },
		});
		expect(jsonLd.sameAs).toEqual([
			'https://www.wikidata.org/entity/Q11573',
			'http://qudt.org/vocab/unit/M',
		]);
		expect(jsonLd.description).toBe('SI base unit of length.');
	});

	it('serializes without a raw < so authored text cannot close the script element', () => {
		const text = serializeJsonLd(definedTermJsonLd({ ...base, name: '</script><b>x' }));
		expect(text).not.toContain('<');
		expect(JSON.parse(text).name).toBe('</script><b>x');
	});
});

describe('converterMagnitudeOf', () => {
	it('uses the first authored magnitude', () => {
		expect(converterMagnitudeOf('newton', ['force', 'weight'], slice)).toBe('force');
	});

	it('offers no converter for reciprocal-mole, whose dimension no magnitude shares', () => {
		expect(slice.units['reciprocal-mole']?.magnitudes).toEqual([]);
		expect(converterMagnitudeOf('reciprocal-mole', [], slice)).toBeUndefined();
	});

	it('falls back to the first magnitude sharing a compound unit dimension', () => {
		const joule = slice.units.joule;
		expect(joule).toBeDefined();
		const withNewtonMetre = {
			magnitudes: slice.magnitudes,
			units:
				joule === undefined
					? slice.units
					: { ...slice.units, 'newton-metre': { ...joule, slug: 'newton-metre', magnitudes: [] } },
		};
		expect(converterMagnitudeOf('newton-metre', [], withNewtonMetre)).toBe('energy');
	});
});
