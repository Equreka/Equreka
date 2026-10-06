import {
	isSolutionFunction,
	type SolutionAst,
	type SolutionFunction,
	tokenizeSolution,
} from '@equreka/content/solution-grammar';

const DECIMAL_LITERAL_RE = /^([+-]?)(\d+(?:\.\d+)?)(?:[eE]([+-]?\d+))?$/;

/**
 * `8.99e+16` → `8.99\times10^{16}`; a plain literal passes through with its
 * sign. Throws on anything that is not a decimal literal, which only a
 * caller bug can produce (values come from `String(Number)` and schema-
 * validated content decimals).
 */
export function decimalToTex(literal: string): string {
	const match = DECIMAL_LITERAL_RE.exec(literal);
	if (match === null) {
		throw new SyntaxError(`not a decimal literal: '${literal}'`);
	}
	const sign = match[1] === '-' ? '-' : '';
	const mantissa = match[2] ?? '';
	const exponent = match[3];
	return exponent === undefined
		? `${sign}${mantissa}`
		: `${sign}${mantissa}\\times10^{${Number(exponent)}}`;
}

/**
 * `k_B` → `k_{B}`, `rho_0` → `\mathrm{rho}_{0}`: the first underscore opens
 * the subscript, and a multi-letter base is set upright so it never reads
 * as a product of variables.
 */
export function identifierToTex(name: string): string {
	const underscore = name.indexOf('_');
	const base = underscore === -1 ? name : name.slice(0, underscore);
	const subscript = underscore === -1 ? '' : name.slice(underscore + 1);
	const baseTex = base.length === 1 ? base : `\\mathrm{${base}}`;
	return subscript === '' ? baseTex : `${baseTex}_{${subscript}}`;
}

/**
 * Binding strength of an emitted fragment, loosest first: a sum, a
 * product (a `\frac` counts as one so a power wraps it), a leading minus, a
 * power, an atom. A fragment is wrapped in `\left(…\right)` only where its
 * parent binds tighter than it does.
 */
type Precedence = 0 | 1 | 2 | 3 | 4;

const SUM: Precedence = 0;
const PRODUCT: Precedence = 1;
const NEGATION: Precedence = 2;
const POWER: Precedence = 3;
const ATOM: Precedence = 4;

interface Fragment {
	tex: string;
	prec: Precedence;
	leadingDigit: boolean;
	trailingDigit: boolean;
}

export interface SolutionTexOptions {
	symbols?: Readonly<Record<string, string>>;
	values?: Readonly<Record<string, string>>;
}

function atom(tex: string): Fragment {
	return { tex, prec: ATOM, leadingDigit: false, trailingDigit: false };
}

function group(fragment: Fragment): Fragment {
	return atom(`\\left(${fragment.tex}\\right)`);
}

function groupSum(fragment: Fragment): Fragment {
	return fragment.prec <= SUM ? group(fragment) : fragment;
}

function groupSumOrNegation(fragment: Fragment): Fragment {
	return fragment.prec <= SUM || fragment.prec === NEGATION ? group(fragment) : fragment;
}

function numberFragment(literal: string): Fragment {
	const tex = decimalToTex(literal);
	const negative = tex.startsWith('-');
	const scientific = tex.includes('\\times');
	return {
		tex,
		prec: negative ? NEGATION : scientific ? PRODUCT : ATOM,
		leadingDigit: !negative,
		trailingDigit: !scientific,
	};
}

function resolve(node: SolutionAst, options: SolutionTexOptions): SolutionAst {
	if (node.kind === 'identifier') {
		const value = options.values?.[node.name];
		if (value !== undefined) return { kind: 'number', text: value };
	}
	return node;
}

function emit(input: SolutionAst, options: SolutionTexOptions): Fragment {
	const node = resolve(input, options);
	switch (node.kind) {
		case 'number':
			return numberFragment(node.text);
		case 'identifier':
			return atom(options.symbols?.[node.name] ?? identifierToTex(node.name));
		case 'pi':
			return atom('\\pi');
		case 'unary': {
			const operand = groupSumOrNegation(emit(node.operand, options));
			return {
				tex: `-${operand.tex}`,
				prec: NEGATION,
				leadingDigit: false,
				trailingDigit: operand.trailingDigit,
			};
		}
		case 'call':
			return emitCall(node.fn, emit(node.arg, options));
		case 'binary':
			return emitBinary(node, options);
	}
}

/**
 * Operator names of the functions typeset as `\name\left(…\right)`. The
 * inverse hyperbolics take their ISO 80000-2 names (arsinh, not arcsinh):
 * they are area functions, not arc functions.
 */
const OPERATOR_TEX: Record<
	Exclude<SolutionFunction, 'sqrt' | 'cbrt' | 'abs' | 'exp' | 'factorial'>,
	string
> = {
	ln: '\\ln',
	sin: '\\sin',
	cos: '\\cos',
	tan: '\\tan',
	asin: '\\arcsin',
	acos: '\\arccos',
	atan: '\\arctan',
	log10: '\\log_{10}',
	log2: '\\log_{2}',
	sinh: '\\sinh',
	cosh: '\\cosh',
	tanh: '\\tanh',
	asinh: '\\operatorname{arsinh}',
	acosh: '\\operatorname{arcosh}',
	atanh: '\\operatorname{artanh}',
};

/**
 * A factorial is postfix `x!`, its operand parenthesised unless atomic
 * (`n!`, `\left(n - k\right)!`); it counts as a power, so a power over it
 * wraps it in turn.
 */
function emitCall(fn: SolutionFunction, arg: Fragment): Fragment {
	switch (fn) {
		case 'sqrt':
			return atom(`\\sqrt{${arg.tex}}`);
		case 'cbrt':
			return atom(`\\sqrt[3]{${arg.tex}}`);
		case 'abs':
			return atom(`\\left|${arg.tex}\\right|`);
		case 'exp':
			return { tex: `e^{${arg.tex}}`, prec: POWER, leadingDigit: false, trailingDigit: false };
		case 'factorial': {
			const operand = arg.prec === ATOM ? arg : group(arg);
			return {
				tex: `${operand.tex}!`,
				prec: POWER,
				leadingDigit: operand.leadingDigit,
				trailingDigit: false,
			};
		}
		default:
			return atom(`${OPERATOR_TEX[fn]}\\left(${arg.tex}\\right)`);
	}
}

function emitBinary(
	node: Extract<SolutionAst, { kind: 'binary' }>,
	options: SolutionTexOptions,
): Fragment {
	switch (node.op) {
		case '+': {
			const left = emit(node.left, options);
			const right = groupSum(emit(node.right, options));
			return {
				tex: `${left.tex} + ${right.tex}`,
				prec: SUM,
				leadingDigit: left.leadingDigit,
				trailingDigit: right.trailingDigit,
			};
		}
		case '-': {
			const left = emit(node.left, options);
			const right = groupSumOrNegation(emit(node.right, options));
			return {
				tex: `${left.tex} - ${right.tex}`,
				prec: SUM,
				leadingDigit: left.leadingDigit,
				trailingDigit: right.trailingDigit,
			};
		}
		case '*': {
			const left = groupSum(emit(node.left, options));
			const right = groupSumOrNegation(emit(node.right, options));
			const joiner = right.leadingDigit ? '\\times' : ' ';
			return {
				tex: `${left.tex}${joiner}${right.tex}`,
				prec: PRODUCT,
				leadingDigit: left.leadingDigit,
				trailingDigit: right.trailingDigit,
			};
		}
		case '/': {
			const left = emit(node.left, options);
			const right = emit(node.right, options);
			return {
				tex: `\\frac{${left.tex}}{${right.tex}}`,
				prec: PRODUCT,
				leadingDigit: false,
				trailingDigit: false,
			};
		}
		case '^': {
			const baseNode = resolve(node.left, options);
			const emitted = emit(baseNode, options);
			const base = baseNode.kind === 'number' || emitted.prec < ATOM ? group(emitted) : emitted;
			const exponent = emit(node.right, options);
			return {
				tex: `${base.tex}^{${exponent.tex}}`,
				prec: POWER,
				leadingDigit: base.leadingDigit,
				trailingDigit: false,
			};
		}
	}
}

/**
 * Display TeX for a parsed solution. `symbols` maps an identifier to the
 * TeX it is drawn as (the equation's term key); unmapped identifiers go
 * through `identifierToTex`. `values` substitutes identifiers with decimal
 * literals (typeset by `decimalToTex`) and wins over `symbols`; `pi` always
 * stays symbolic. Division becomes `\frac`, a product juxtaposes its
 * factors except digit-before-digit, which takes `\times`, and a numeric
 * base is always parenthesised under a power.
 */
export function solutionToTex(ast: SolutionAst, options: SolutionTexOptions = {}): string {
	return emit(ast, options).tex;
}

/**
 * The authored string with each valued identifier replaced in place by its
 * literal (negatives parenthesised), spacing and everything else kept — the
 * monospace fallback for the substituted line when the renderer is
 * unavailable.
 */
export function substituteSolutionText(
	source: string,
	values: Readonly<Record<string, string>>,
): string {
	let text = source;
	for (const token of tokenizeSolution(source).reverse()) {
		if (token.type !== 'identifier' || token.text === 'pi' || isSolutionFunction(token.text)) {
			continue;
		}
		const value = values[token.text];
		if (value === undefined) continue;
		const literal = value.startsWith('-') ? `(${value})` : value;
		text = `${text.slice(0, token.pos)}${literal}${text.slice(token.pos + token.text.length)}`;
	}
	return text;
}
