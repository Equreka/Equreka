export const SOLUTION_FUNCTIONS = ['abs', 'cos', 'exp', 'ln', 'sin', 'sqrt', 'tan'] as const;

export type SolutionFunction = (typeof SOLUTION_FUNCTIONS)[number];

export type SolutionAst =
	| { kind: 'number'; text: string }
	| { kind: 'identifier'; name: string }
	| { kind: 'pi' }
	| { kind: 'unary'; operand: SolutionAst }
	| { kind: 'binary'; op: '+' | '-' | '*' | '/' | '^'; left: SolutionAst; right: SolutionAst }
	| { kind: 'call'; fn: SolutionFunction; arg: SolutionAst };

interface Token {
	type: 'number' | 'identifier' | 'op';
	text: string;
	pos: number;
}

const NUMBER_RE = /^\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/;
const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*/;
const OPERATOR_CHARS = '+-*/^()';

function isFunctionName(text: string): text is SolutionFunction {
	return (SOLUTION_FUNCTIONS as readonly string[]).includes(text);
}

function tokenize(source: string): Token[] {
	const tokens: Token[] = [];
	let pos = 0;
	while (pos < source.length) {
		const rest = source.slice(pos);
		const ws = /^\s+/.exec(rest);
		if (ws) {
			pos += ws[0].length;
			continue;
		}
		const number = NUMBER_RE.exec(rest);
		if (number) {
			tokens.push({ type: 'number', text: number[0], pos });
			pos += number[0].length;
			continue;
		}
		const identifier = IDENTIFIER_RE.exec(rest);
		if (identifier) {
			tokens.push({ type: 'identifier', text: identifier[0], pos });
			pos += identifier[0].length;
			continue;
		}
		const char = source[pos] ?? '';
		if (OPERATOR_CHARS.includes(char)) {
			tokens.push({ type: 'op', text: char, pos });
			pos += 1;
			continue;
		}
		throw new SyntaxError(`unexpected character '${char}' at position ${pos}`);
	}
	return tokens;
}

/**
 * The authored solution grammar (ADR 0002) re-parsed on device from the
 * presentation slice: identifiers, decimal literals, `+ - * / ^`,
 * parentheses, sqrt|abs|ln|exp|sin|cos|tan and the constant `pi`. `^` is
 * right-associative and binds tighter than unary minus, exactly as the
 * pipeline parser that verified the string at build.
 */
export function parseSolution(source: string): SolutionAst {
	const tokens = tokenize(source);
	let index = 0;

	const peek = (): Token | undefined => tokens[index];
	const takeOp = (text: string): boolean => {
		const token = tokens[index];
		if (token !== undefined && token.type === 'op' && token.text === text) {
			index += 1;
			return true;
		}
		return false;
	};
	const expectOp = (text: string): void => {
		if (!takeOp(text)) {
			const token = tokens[index];
			throw new SyntaxError(
				token === undefined
					? `expected '${text}' but reached end of input`
					: `expected '${text}' at position ${token.pos}, got '${token.text}'`,
			);
		}
	};

	const parseExpr = (): SolutionAst => {
		let left = parseTerm();
		for (;;) {
			if (takeOp('+')) {
				left = { kind: 'binary', op: '+', left, right: parseTerm() };
			} else if (takeOp('-')) {
				left = { kind: 'binary', op: '-', left, right: parseTerm() };
			} else {
				return left;
			}
		}
	};

	const parseTerm = (): SolutionAst => {
		let left = parseUnary();
		for (;;) {
			if (takeOp('*')) {
				left = { kind: 'binary', op: '*', left, right: parseUnary() };
			} else if (takeOp('/')) {
				left = { kind: 'binary', op: '/', left, right: parseUnary() };
			} else {
				return left;
			}
		}
	};

	const parseUnary = (): SolutionAst => {
		if (takeOp('-')) {
			return { kind: 'unary', operand: parseUnary() };
		}
		return parsePower();
	};

	const parsePower = (): SolutionAst => {
		const base = parseAtom();
		if (takeOp('^')) {
			return { kind: 'binary', op: '^', left: base, right: parseUnary() };
		}
		return base;
	};

	const parseAtom = (): SolutionAst => {
		const token = peek();
		if (token === undefined) {
			throw new SyntaxError('unexpected end of input');
		}
		if (token.type === 'number') {
			index += 1;
			return { kind: 'number', text: token.text };
		}
		if (token.type === 'identifier') {
			index += 1;
			if (token.text === 'pi') {
				return { kind: 'pi' };
			}
			if (isFunctionName(token.text)) {
				expectOp('(');
				const arg = parseExpr();
				expectOp(')');
				return { kind: 'call', fn: token.text, arg };
			}
			return { kind: 'identifier', name: token.text };
		}
		if (token.text === '(') {
			index += 1;
			const inner = parseExpr();
			expectOp(')');
			return inner;
		}
		throw new SyntaxError(`unexpected token '${token.text}' at position ${token.pos}`);
	};

	const ast = parseExpr();
	const trailing = peek();
	if (trailing !== undefined) {
		throw new SyntaxError(`unexpected token '${trailing.text}' at position ${trailing.pos}`);
	}
	return ast;
}

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
		case 'call': {
			const arg = emit(node.arg, options).tex;
			switch (node.fn) {
				case 'sqrt':
					return atom(`\\sqrt{${arg}}`);
				case 'abs':
					return atom(`\\left|${arg}\\right|`);
				case 'exp':
					return { tex: `e^{${arg}}`, prec: POWER, leadingDigit: false, trailingDigit: false };
				default:
					return atom(`\\${node.fn}\\left(${arg}\\right)`);
			}
		}
		case 'binary':
			return emitBinary(node, options);
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
	for (const token of tokenize(source).reverse()) {
		if (token.type !== 'identifier' || token.text === 'pi' || isFunctionName(token.text)) continue;
		const value = values[token.text];
		if (value === undefined) continue;
		const literal = value.startsWith('-') ? `(${value})` : value;
		text = `${text.slice(0, token.pos)}${literal}${text.slice(token.pos + token.text.length)}`;
	}
	return text;
}
