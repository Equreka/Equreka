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
		if ('+-*/^()'.includes(char)) {
			tokens.push({ type: 'op', text: char, pos });
			pos += 1;
			continue;
		}
		throw new SyntaxError(`unexpected character '${char}' at position ${pos}`);
	}
	return tokens;
}

/**
 * Parses the authored solution grammar (ADR 0002): identifiers, decimal
 * literals, `+ - * / ^`, parentheses, sqrt|abs|ln|exp|sin|cos|tan, and the
 * constant `pi`. `^` is right-associative and binds tighter than unary
 * minus, matching mathematical convention (`-x^2` is `-(x^2)`).
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
			if ((SOLUTION_FUNCTIONS as readonly string[]).includes(token.text)) {
				expectOp('(');
				const arg = parseExpr();
				expectOp(')');
				return { kind: 'call', fn: token.text as SolutionFunction, arg };
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

const FUNCTION_IMPL: Record<SolutionFunction, (x: number) => number> = {
	abs: Math.abs,
	cos: Math.cos,
	exp: Math.exp,
	ln: Math.log,
	sin: Math.sin,
	sqrt: Math.sqrt,
	tan: Math.tan,
};

export function evaluateSolution(ast: SolutionAst, env: Record<string, number>): number {
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
			return FUNCTION_IMPL[ast.fn](evaluateSolution(ast.arg, env));
	}
	return Number.NaN;
}
