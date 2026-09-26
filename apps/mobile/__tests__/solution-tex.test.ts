import { describe, expect, it } from '@jest/globals';
import {
	decimalToTex,
	identifierToTex,
	parseSolution,
	type SolutionTexOptions,
	solutionToTex,
	substituteSolutionText,
} from '../shared/math/solution-tex';

function tex(source: string, options?: SolutionTexOptions): string {
	return solutionToTex(parseSolution(source), options);
}

describe('solutionToTex', () => {
	it('typesets division as \\frac and powers with braced exponents', () => {
		expect(tex('E / c^2')).toBe('\\frac{E}{c^{2}}');
		expect(tex('m * c^2')).toBe('m c^{2}');
		expect(tex('x^y^z')).toBe('x^{y^{z}}');
		expect(tex('(x^y)^z')).toBe('\\left(x^{y}\\right)^{z}');
		expect(tex('(a / b)^2')).toBe('\\left(\\frac{a}{b}\\right)^{2}');
	});

	it('typesets the calls', () => {
		expect(tex('sqrt(A / pi)')).toBe('\\sqrt{\\frac{A}{\\pi}}');
		expect(tex('sqrt(c^2 - b^2)')).toBe('\\sqrt{c^{2} - b^{2}}');
		expect(tex('abs(x)')).toBe('\\left|x\\right|');
		expect(tex('exp(x)')).toBe('e^{x}');
		expect(tex('ln(x) + sin(x) * cos(x) - tan(x)')).toBe(
			'\\ln\\left(x\\right) + \\sin\\left(x\\right) \\cos\\left(x\\right) - \\tan\\left(x\\right)',
		);
	});

	it('parenthesises only where precedence demands it', () => {
		expect(tex('(a + b) * (c - d)')).toBe('\\left(a + b\\right) \\left(c - d\\right)');
		expect(tex('a * b + c')).toBe('a b + c');
		expect(tex('a + (b + c)')).toBe('a + \\left(b + c\\right)');
		expect(tex('a - (b - c)')).toBe('a - \\left(b - c\\right)');
		expect(tex('a - -b')).toBe('a - \\left(-b\\right)');
		expect(tex('-x^2')).toBe('-x^{2}');
		expect(tex('(-x)^2')).toBe('\\left(-x\\right)^{2}');
		expect(tex('-(a + b)')).toBe('-\\left(a + b\\right)');
		expect(tex('-(a * b)')).toBe('-a b');
	});

	it('juxtaposes factors except digit before digit, which takes \\times', () => {
		expect(tex('2 * pi * r')).toBe('2 \\pi r');
		expect(tex('pi * 2')).toBe('\\pi\\times2');
		expect(tex('2 * 3')).toBe('2\\times3');
		expect(tex('a * 2^3')).toBe('a \\left(2\\right)^{3}');
	});

	it('draws identifiers through the symbol map, then the subscript rule', () => {
		expect(tex('k_B * T')).toBe('k_{B} T');
		expect(tex('rho_0 * g * h')).toBe('\\mathrm{rho}_{0} g h');
		expect(tex('k_B * T', { symbols: { k_B: 'k_{\\mathrm{B}}' } })).toBe('k_{\\mathrm{B}} T');
		expect(identifierToTex('mu_0')).toBe('\\mathrm{mu}_{0}');
		expect(identifierToTex('E')).toBe('E');
	});

	it('substitutes values as typeset decimals with numeric bases parenthesised', () => {
		expect(tex('E / c^2', { values: { E: '8.99e+16', c: '299792458' } })).toBe(
			'\\frac{8.99\\times10^{16}}{\\left(299792458\\right)^{2}}',
		);
		expect(tex('x^2', { values: { x: '-5' } })).toBe('\\left(-5\\right)^{2}');
		expect(tex('a * x', { values: { x: '-5' } })).toBe('a \\left(-5\\right)');
		expect(tex('a * x', { values: { x: '5' } })).toBe('a\\times5');
		expect(tex('sqrt(A / pi)', { values: { A: '3' } })).toBe('\\sqrt{\\frac{3}{\\pi}}');
		expect(tex('a * b', { values: { a: '1.5e-3', b: '2' } })).toBe('1.5\\times10^{-3}\\times2');
		expect(decimalToTex('+7')).toBe('7');
		expect(decimalToTex('1e21')).toBe('1\\times10^{21}');
		expect(() => decimalToTex('NaN')).toThrow(SyntaxError);
	});
});

describe('parseSolution', () => {
	it('rejects malformed input', () => {
		expect(() => parseSolution('2 +')).toThrow(SyntaxError);
		expect(() => parseSolution('a $ b')).toThrow(SyntaxError);
		expect(() => parseSolution('sqrt 4')).toThrow(SyntaxError);
		expect(() => parseSolution('(a')).toThrow(SyntaxError);
		expect(() => parseSolution('a b')).toThrow(SyntaxError);
	});
});

describe('substituteSolutionText', () => {
	it('replaces valued identifiers in place and keeps pi and functions', () => {
		expect(substituteSolutionText('E / c^2', { E: '8.99e+16', c: '299792458' })).toBe(
			'8.99e+16 / 299792458^2',
		);
		expect(substituteSolutionText('sqrt(A / pi)', { A: '3', pi: '3.14' })).toBe('sqrt(3 / pi)');
		expect(substituteSolutionText('a * x', { x: '-5' })).toBe('a * (-5)');
		expect(substituteSolutionText('exp(x)', { exp: '1', x: '2' })).toBe('exp(2)');
	});
});
