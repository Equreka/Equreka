/**
 * Functions of the authored solution grammar (ADR 0002, ADR 0009). This
 * module is the grammar's one platform-free definition: the pipeline
 * parses, verifies and codegens with it, and mobile re-parses presentation
 * solutions with it to typeset solved forms. It has no imports, so every
 * bundler takes the file as-is.
 */
export const SOLUTION_FUNCTIONS = [
	'sqrt',
	'abs',
	'ln',
	'exp',
	'sin',
	'cos',
	'tan',
	'asin',
	'acos',
	'atan',
	'log10',
	'log2',
	'cbrt',
	'sinh',
	'cosh',
	'tanh',
	'asinh',
	'acosh',
	'atanh',
	'factorial',
] as const;

export type SolutionFunction = (typeof SOLUTION_FUNCTIONS)[number];

/**
 * Names a term identifier may never take: the parser reads a function name
 * followed by `(` as a call, so an identifier spelled like one could not be
 * referenced from a solution.
 */
export const RESERVED_FUNCTION_NAMES: readonly string[] = SOLUTION_FUNCTIONS;

/**
 * Largest n whose factorial is finite in float64 (171! overflows).
 */
export const FACTORIAL_MAX = 170;

export type SolutionAst =
	| { kind: 'number'; text: string }
	| { kind: 'identifier'; name: string }
	| { kind: 'pi' }
	| { kind: 'unary'; operand: SolutionAst }
	| { kind: 'binary'; op: '+' | '-' | '*' | '/' | '^'; left: SolutionAst; right: SolutionAst }
	| { kind: 'call'; fn: SolutionFunction; arg: SolutionAst };

export interface SolutionToken {
	type: 'number' | 'identifier' | 'op';
	text: string;
	pos: number;
}

const NUMBER_RE = /^\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/;
const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*/;
const OPERATOR_CHARS = '+-*/^()';

export function isSolutionFunction(name: string): name is SolutionFunction {
	return (SOLUTION_FUNCTIONS as readonly string[]).includes(name);
}

/**
 * The authored root list of one solution: a single solved form, or the
 * roots of a multi-valued one in preference order.
 */
export function solutionRoots(solution: string | readonly string[]): readonly string[] {
	return typeof solution === 'string' ? [solution] : solution;
}

export function tokenizeSolution(source: string): SolutionToken[] {
	const tokens: SolutionToken[] = [];
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
 * Parses identifiers, decimal literals, `+ - * / ^`, parentheses, the
 * `SOLUTION_FUNCTIONS` calls and the constant `pi`. `^` is right-associative
 * and binds tighter than unary minus, matching mathematical convention
 * (`-x^2` is `-(x^2)`).
 */
export function parseSolution(source: string): SolutionAst {
	const tokens = tokenizeSolution(source);
	let index = 0;

	const peek = (): SolutionToken | undefined => tokens[index];
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
			if (isSolutionFunction(token.text)) {
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

export function collectIdentifiers(ast: SolutionAst, into = new Set<string>()): Set<string> {
	switch (ast.kind) {
		case 'identifier':
			into.add(ast.name);
			break;
		case 'unary':
			collectIdentifiers(ast.operand, into);
			break;
		case 'binary':
			collectIdentifiers(ast.left, into);
			collectIdentifiers(ast.right, into);
			break;
		case 'call':
			collectIdentifiers(ast.arg, into);
			break;
		default:
			break;
	}
	return into;
}

/**
 * n! as an iterated float64 product for an integer n in [0, FACTORIAL_MAX];
 * NaN elsewhere, so a non-integer or negative argument is out of domain
 * rather than silently extended to the gamma function.
 */
export function factorial(n: number): number {
	if (!Number.isInteger(n) || n < 0 || n > FACTORIAL_MAX) {
		return Number.NaN;
	}
	let product = 1;
	for (let factor = 2; factor <= n; factor += 1) {
		product *= factor;
	}
	return product;
}

/**
 * Every function's float64 implementation. The codegen'd module calls the
 * same `Math` functions and an equivalent `factorial`, so a verified value
 * is the value the calculator computes.
 */
export const SOLUTION_FUNCTION_IMPL: Readonly<Record<SolutionFunction, (x: number) => number>> = {
	sqrt: Math.sqrt,
	abs: Math.abs,
	ln: Math.log,
	exp: Math.exp,
	sin: Math.sin,
	cos: Math.cos,
	tan: Math.tan,
	asin: Math.asin,
	acos: Math.acos,
	atan: Math.atan,
	log10: Math.log10,
	log2: Math.log2,
	cbrt: Math.cbrt,
	sinh: Math.sinh,
	cosh: Math.cosh,
	tanh: Math.tanh,
	asinh: Math.asinh,
	acosh: Math.acosh,
	atanh: Math.atanh,
	factorial,
};

export function evaluateSolution(ast: SolutionAst, env: Readonly<Record<string, number>>): number {
	switch (ast.kind) {
		case 'number':
			return Number(ast.text);
		case 'identifier':
			return env[ast.name] ?? Number.NaN;
		case 'pi':
			return Math.PI;
		case 'unary':
			return -evaluateSolution(ast.operand, env);
		case 'binary': {
			const left = evaluateSolution(ast.left, env);
			const right = evaluateSolution(ast.right, env);
			switch (ast.op) {
				case '+':
					return left + right;
				case '-':
					return left - right;
				case '*':
					return left * right;
				case '/':
					return left / right;
				case '^':
					return left ** right;
			}
			break;
		}
		case 'call':
			return SOLUTION_FUNCTION_IMPL[ast.fn](evaluateSolution(ast.arg, env));
	}
	return Number.NaN;
}
