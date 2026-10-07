import { readFileSync } from 'node:fs';
import equationsPresentation from '@equreka/content/artifact/presentation/equations.json';
import unitsPresentation from '@equreka/content/artifact/presentation/units.json';
import { splitRichText } from '@equreka/content/rich-text';
import { describe, expect, it } from 'vitest';
import {
	renderExpressionHtml,
	renderRichTextHtml,
	renderSegmentsHtml,
	type TermAnnotation,
	termDataValue,
} from '../tex';

interface DescribedEntity {
	description: Record<string, string>;
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
	const text = described.description[locale];
	if (text === undefined) {
		throw new Error(`no ${locale} description`);
	}
	return splitRichText(text);
}

function termsOf(described: DescribedEntity): Record<string, TermAnnotation> {
	if (described.terms === undefined) {
		throw new Error('entity has no terms');
	}
	return described.terms;
}

describe('renderSegmentsHtml', () => {
	it('renders macro-free prose with its math through KaTeX and its text escaped', () => {
		const fromSegments = renderSegmentsHtml(segmentsOf(entity(units, 'ampere'), 'en'));
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

describe('term annotations', () => {
	it('key symbol terms by their effective identifier, override included', () => {
		expect(termDataValue('v_{0}', { kind: 'symbol' })).toBe('symbol:v_0');
		expect(termDataValue('[\\mathrm{H}^{+}]', { kind: 'symbol', identifier: 'cH' })).toBe(
			'symbol:cH',
		);
		expect(termDataValue('E', { kind: 'magnitude', ref: 'energy' })).toBe('magnitude:energy');
	});

	it('expand macros whose keys carry nested braces', () => {
		const html = renderExpressionHtml('\\var{K}=\\var{[\\mathrm{H}^{+}]}\\var{v_{0}}', {
			K: { kind: 'symbol' },
			'[\\mathrm{H}^{+}]': { kind: 'symbol', identifier: 'cH' },
			'v_{0}': { kind: 'symbol' },
		});
		expect(html).toContain('data-term="symbol:cH"');
		expect(html).toContain('data-term="symbol:v_0"');
		expect(html).toContain('data-term="symbol:K"');
	});
});

describe('renderRichTextHtml', () => {
	it('reduces annotation macros to their arguments without a terms map', () => {
		const html = renderRichTextHtml('where $\\mag{E}$ is energy');
		expect(html).toContain('katex');
		expect(html).not.toContain('data-term=');
	});
});

describe('authored hard line breaks', () => {
	it('survive KaTeX segment rendering as a raw newline in the text after the math', () => {
		const equation = entity(equations, 'mass-energy-equivalence');
		const authored = splitRichText(
			'Rest energy is $(\\const{c}^{2})$.\nBecause the speed of light is large, so is the energy.',
		);
		const html = renderSegmentsHtml(authored, termsOf(equation));
		expect(html).toMatch(/<\/span>\.\nBecause the speed of light/);
		expect(html.split('\n').filter((line) => line.startsWith('Because')).length).toBe(1);
		const plain = renderRichTextHtml('First paragraph ends here.\nSecond paragraph starts here.');
		expect(plain).toContain('ends here.\nSecond paragraph');
	});

	it('render as visible breaks because every description container is pre-line', () => {
		const containers: Record<string, string> = {
			'pages-content.css': '.eq-prose',
			'pages-interactive.css': '.eq-reader-description',
		};
		for (const [file, selector] of Object.entries(containers)) {
			const css = readFileSync(new URL(`../../styles/${file}`, import.meta.url), 'utf8');
			const escaped = selector.replace(/[.]/g, '\\.');
			const rule = new RegExp(`\\n\\s*${escaped} \\{([^}]*)\\}`).exec(css);
			expect(rule?.[1], selector).toMatch(/white-space: pre-line;/);
		}
	});
});
