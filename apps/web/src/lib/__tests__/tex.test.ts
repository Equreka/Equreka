import equationsPresentation from '@equreka/content/artifact/presentation/equations.json';
import unitsPresentation from '@equreka/content/artifact/presentation/units.json';
import { type LocalizedSegments, splitRichText } from '@equreka/content/rich-text';
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

function termsOf(described: DescribedEntity): Record<string, TermAnnotation> {
	if (described.terms === undefined) {
		throw new Error('entity has no terms');
	}
	return described.terms;
}

describe('renderSegmentsHtml', () => {
	it('renders slice segments identically to the raw text for macro-free prose', () => {
		const ampere = entity(units, 'ampere');
		const fromSegments = renderSegmentsHtml(segmentsOf(ampere, 'en'));
		expect(fromSegments).toBe(renderRichTextHtml(ampere.description.en ?? ''));
		expect(fromSegments).toContain('katex');
		expect(fromSegments).toContain('The ampere, symbol ');
	});

	it('expands annotation macros from raw into term spans when given a terms map', () => {
		const massEnergy = entity(equations, 'mass-energy-equivalence');
		const segments = segmentsOf(massEnergy, 'en');
		const annotated = renderSegmentsHtml(segments, termsOf(massEnergy));
		expect(annotated).toContain('data-term="magnitude:');
		expect(annotated).toContain('data-term="constant:');
		expect(renderSegmentsHtml(segments)).not.toContain('data-term=');
	});

	it('renders canonical tex and expanded raw the same way for macro-free segments', () => {
		const areaCircle = entity(equations, 'area-circle');
		const segments = segmentsOf(areaCircle, 'en').filter(
			(segment) => segment.t === 'text' || segment.raw === segment.tex,
		);
		expect(renderSegmentsHtml(segments, termsOf(areaCircle))).toBe(renderSegmentsHtml(segments));
	});

	it('fails the build on a raw macro whose argument is not a term', () => {
		const segments = splitRichText('energy $\\mag{E}$');
		expect(() => renderSegmentsHtml(segments, {})).toThrow(/no matching term key "E"/);
		expect(renderSegmentsHtml(segments)).toContain('katex');
	});

	it('degrades a failing fragment to its delimited canonical TeX', () => {
		expect(renderSegmentsHtml(splitRichText('bad $\\undefinedmacro$ here'))).toBe(
			'bad <code>$\\undefinedmacro$</code> here',
		);
	});
});

describe('renderRichTextHtml', () => {
	it('reduces annotation macros to their arguments without a terms map', () => {
		const html = renderRichTextHtml('where $\\mag{E}$ is energy');
		expect(html).toContain('katex');
		expect(html).not.toContain('data-term=');
	});
});
