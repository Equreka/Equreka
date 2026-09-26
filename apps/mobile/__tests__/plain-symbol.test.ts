import { describe, expect, it } from '@jest/globals';
import { isPlainSymbol, texToFallbackText, texToUnicode } from '../shared/math/plain-symbol';

describe('texToUnicode', () => {
	it('maps single letters, Greek commands and simple scripts to Unicode', () => {
		expect(texToUnicode('m')).toBe('m');
		expect(texToUnicode('\\alpha')).toBe('α');
		expect(texToUnicode('\\Omega')).toBe('Ω');
		expect(texToUnicode('x^{2}')).toBe('x²');
		expect(texToUnicode('10^{-18}')).toBe('10⁻¹⁸');
		expect(texToUnicode('v_{0}')).toBe('v₀');
		expect(texToUnicode('E = mc^{2}')).toBe('E=mc²');
	});

	it('renders degree forms and font switches as plain text', () => {
		expect(texToUnicode('^{\\circ}C')).toBe('°C');
		expect(texToUnicode('\\mathrm{kg}\\cdot\\mathrm{m}')).toBe('kg·m');
		expect(texToUnicode('{A}={\\pi}{r}^{2}')).toBe('A=πr²');
	});

	it('refuses two-dimensional layout and unknown commands', () => {
		expect(texToUnicode('\\frac{1}{2}')).toBeNull();
		expect(texToUnicode('\\sqrt{2}')).toBeNull();
		expect(texToUnicode('N_{\\rm {A}}')).toBeNull();
		expect(texToUnicode('\\begin{matrix}a\\end{matrix}')).toBeNull();
		expect(texToUnicode('')).toBeNull();
	});
});

describe('isPlainSymbol', () => {
	it('is the boolean view of texToUnicode', () => {
		expect(isPlainSymbol('\\mu')).toBe(true);
		expect(isPlainSymbol('\\frac{a}{b}')).toBe(false);
	});
});

describe('texToFallbackText', () => {
	it('produces a lossy single line for math the SVG lane cannot render', () => {
		expect(texToFallbackText('\\frac{a}{b}')).toBe('a/b');
		expect(texToFallbackText('\\sqrt{x^{2}+1}')).toBe('√(x²+1)');
		expect(texToFallbackText('\\vec{F} = m\\vec{a}')).toBe('F=ma');
	});

	it('never returns an empty string for non-empty input', () => {
		expect(texToFallbackText('\\unknowncommand')).toBe('unknowncommand');
		expect(texToFallbackText('{}')).toBe('{}');
	});
});
