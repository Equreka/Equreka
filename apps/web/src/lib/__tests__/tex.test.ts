import equationsPresentation from '@equreka/content/artifact/presentation/equations.json';
import unitsPresentation from '@equreka/content/artifact/presentation/units.json';
import type { LocalizedSegments } from '@equreka/content/rich-text';
import { describe, expect, it } from 'vitest';
import { renderRichTextHtml, renderSegmentsHtml, type TermAnnotation } from '../tex';

interface DescribedEntity {
	description: Record<string, string>;
	descriptionSegments: LocalizedSegments;
	terms?: Record<string, TermAnnotation>;
}

const units = unitsPresentation as unknown as Record<string, DescribedEntity>;

const equations = equationsPresentation as unknown as Record<string, DescribedEntity>;

function entity(slice: Record<string, DescribedEntity>, slug: string): DescribedEntity {
	const found = slice[slug];
	if (found === undefined) {
		throw new Error(`presentation slice has no entry "${slug}"`);
	}
	return found;
}

function segmentsOf(described: DescribedEntity, locale: string) {
	const segments = described.descriptionSegments[locale];
	if (segments === undefined) {
		throw new Error(`no ${locale} descriptionSegments`);
	}
	return segments;
}

describe('renderRichTextHtml', () => {
	it('renders a unit description identically from raw text and from the slice segments', () => {
		const ampere = entity(units, 'ampere');
		const fromText = renderRichTextHtml(ampere.description.en ?? '');
		expect(fromText).toBe(renderSegmentsHtml(segmentsOf(ampere, 'en')));
		expect(fromText).toContain('katex');
		expect(fromText).toContain('The ampere, symbol ');
	});

	it('renders an equation description identically from raw text and from the slice segments', () => {
		const areaCircle = entity(equations, 'area-circle');
		const fromText = renderRichTextHtml(areaCircle.description.en ?? '', areaCircle.terms);
		expect(fromText).toBe(renderSegmentsHtml(segmentsOf(areaCircle, 'en')));
		expect(fromText).toContain('katex');
	});

	it('expands annotation macros to term spans, which canonical segments cannot carry', () => {
		const massEnergy = entity(equations, 'mass-energy-equivalence');
		const fromText = renderRichTextHtml(massEnergy.description.en ?? '', massEnergy.terms);
		expect(fromText).toContain('data-term="magnitude:');
		expect(fromText).toContain('data-term="constant:');
		expect(renderSegmentsHtml(segmentsOf(massEnergy, 'en'))).not.toContain('data-term=');
	});

	it('degrades a failing fragment to its delimited literal TeX', () => {
		expect(renderRichTextHtml('bad $\\undefinedmacro$ here')).toBe(
			'bad <code>$\\undefinedmacro$</code> here',
		);
	});
});
