/**
 * Inline math tiering (ADR 0002): TeX that reduces to a single run of
 * Unicode — letters, digits, Greek, operators, super/subscripts with
 * Unicode forms — renders as styled Text inline. Anything two-dimensional
 * (fractions, radicals, accents, big operators, arrays) is not plain and
 * goes to the SVG lane or a lossy text fallback.
 */
export type TexMode = 'strict' | 'lenient';

const GREEK: Record<string, string> = {
	alpha: 'α',
	beta: 'β',
	gamma: 'γ',
	delta: 'δ',
	epsilon: 'ϵ',
	varepsilon: 'ε',
	zeta: 'ζ',
	eta: 'η',
	theta: 'θ',
	vartheta: 'ϑ',
	iota: 'ι',
	kappa: 'κ',
	lambda: 'λ',
	mu: 'μ',
	nu: 'ν',
	xi: 'ξ',
	pi: 'π',
	varpi: 'ϖ',
	rho: 'ρ',
	varrho: 'ϱ',
	sigma: 'σ',
	varsigma: 'ς',
	tau: 'τ',
	upsilon: 'υ',
	phi: 'ϕ',
	varphi: 'φ',
	chi: 'χ',
	psi: 'ψ',
	omega: 'ω',
	Gamma: 'Γ',
	Delta: 'Δ',
	Theta: 'Θ',
	Lambda: 'Λ',
	Xi: 'Ξ',
	Pi: 'Π',
	Sigma: 'Σ',
	Upsilon: 'Υ',
	Phi: 'Φ',
	Psi: 'Ψ',
	Omega: 'Ω',
};

const SYMBOLS: Record<string, string> = {
	cdot: '·',
	times: '×',
	pm: '±',
	mp: '∓',
	infty: '∞',
	hbar: 'ℏ',
	ell: 'ℓ',
	prime: '′',
	partial: '∂',
	nabla: '∇',
	propto: '∝',
	approx: '≈',
	neq: '≠',
	ne: '≠',
	leq: '≤',
	le: '≤',
	geq: '≥',
	ge: '≥',
	ll: '≪',
	gg: '≫',
	equiv: '≡',
	sim: '∼',
	simeq: '≃',
	to: '→',
	rightarrow: '→',
	leftarrow: '←',
	Rightarrow: '⇒',
	Leftrightarrow: '⇔',
	ldots: '…',
	dots: '…',
	cdots: '⋯',
	div: '÷',
	mid: '|',
	vert: '|',
	lvert: '|',
	rvert: '|',
	ast: '∗',
	star: '⋆',
	bullet: '•',
	degree: '°',
	circ: '∘',
	angle: '∠',
	parallel: '∥',
	perp: '⊥',
	in: '∈',
	notin: '∉',
	subset: '⊂',
	cup: '∪',
	cap: '∩',
	emptyset: '∅',
	forall: '∀',
	exists: '∃',
	langle: '⟨',
	rangle: '⟩',
	lbrace: '{',
	rbrace: '}',
	colon: ':',
	ohm: 'Ω',
	micro: 'µ',
	AA: 'Å',
	aleph: 'ℵ',
	Re: 'ℜ',
	Im: 'ℑ',
	'%': '%',
	'&': '&',
	'#': '#',
	_: '_',
	$: '$',
	'{': '{',
	'}': '}',
	'|': '‖',
};

const SPACES: Record<string, string> = {
	',': ' ',
	';': ' ',
	':': ' ',
	' ': ' ',
	'!': '',
	quad: ' ',
	qquad: '  ',
	enspace: ' ',
};

/**
 * Commands whose argument (or following content) renders as plain text:
 * font switches and the pipeline's term-annotation macros.
 */
const TRANSPARENT_GROUPS = new Set([
	'rm',
	'mathrm',
	'text',
	'textrm',
	'textnormal',
	'mathit',
	'textit',
	'mathbf',
	'textbf',
	'boldsymbol',
	'mathsf',
	'textsf',
	'mathtt',
	'texttt',
	'mathnormal',
	'operatorname',
	'mag',
	'const',
	'var',
]);

/**
 * Commands that only change layout and take no argument.
 */
const DROPPED = new Set([
	'displaystyle',
	'textstyle',
	'scriptstyle',
	'scriptscriptstyle',
	'left',
	'right',
	'big',
	'Big',
	'bigg',
	'Bigg',
	'bigl',
	'bigr',
	'Bigl',
	'Bigr',
	'biggl',
	'biggr',
	'Biggl',
	'Biggr',
	'limits',
	'nolimits',
	'mathstrut',
]);

const FUNCTIONS = new Set([
	'sin',
	'cos',
	'tan',
	'cot',
	'sec',
	'csc',
	'arcsin',
	'arccos',
	'arctan',
	'sinh',
	'cosh',
	'tanh',
	'coth',
	'log',
	'ln',
	'lg',
	'exp',
	'det',
	'dim',
	'ker',
	'deg',
	'gcd',
	'max',
	'min',
	'sup',
	'inf',
	'lim',
	'arg',
	'hom',
	'Pr',
]);

const SUPERSCRIPT: Record<string, string> = {
	'0': '⁰',
	'1': '¹',
	'2': '²',
	'3': '³',
	'4': '⁴',
	'5': '⁵',
	'6': '⁶',
	'7': '⁷',
	'8': '⁸',
	'9': '⁹',
	'+': '⁺',
	'-': '⁻',
	'−': '⁻',
	'=': '⁼',
	'(': '⁽',
	')': '⁾',
	a: 'ᵃ',
	b: 'ᵇ',
	c: 'ᶜ',
	d: 'ᵈ',
	e: 'ᵉ',
	f: 'ᶠ',
	g: 'ᵍ',
	h: 'ʰ',
	i: 'ⁱ',
	j: 'ʲ',
	k: 'ᵏ',
	l: 'ˡ',
	m: 'ᵐ',
	n: 'ⁿ',
	o: 'ᵒ',
	p: 'ᵖ',
	r: 'ʳ',
	s: 'ˢ',
	t: 'ᵗ',
	u: 'ᵘ',
	v: 'ᵛ',
	w: 'ʷ',
	x: 'ˣ',
	y: 'ʸ',
	z: 'ᶻ',
	'°': '°',
	'′': '′',
	' ': '',
};

const SUBSCRIPT: Record<string, string> = {
	'0': '₀',
	'1': '₁',
	'2': '₂',
	'3': '₃',
	'4': '₄',
	'5': '₅',
	'6': '₆',
	'7': '₇',
	'8': '₈',
	'9': '₉',
	'+': '₊',
	'-': '₋',
	'−': '₋',
	'=': '₌',
	'(': '₍',
	')': '₎',
	a: 'ₐ',
	e: 'ₑ',
	h: 'ₕ',
	i: 'ᵢ',
	j: 'ⱼ',
	k: 'ₖ',
	l: 'ₗ',
	m: 'ₘ',
	n: 'ₙ',
	o: 'ₒ',
	p: 'ₚ',
	r: 'ᵣ',
	s: 'ₛ',
	t: 'ₜ',
	u: 'ᵤ',
	v: 'ᵥ',
	x: 'ₓ',
	β: 'ᵦ',
	γ: 'ᵧ',
	ρ: 'ᵨ',
	φ: 'ᵩ',
	χ: 'ᵪ',
	' ': '',
};

type Token =
	| { kind: 'command'; name: string }
	| { kind: 'open' }
	| { kind: 'close' }
	| { kind: 'sup' }
	| { kind: 'sub' }
	| { kind: 'char'; value: string };

function tokenize(tex: string): Token[] {
	const tokens: Token[] = [];
	let index = 0;
	while (index < tex.length) {
		const char = tex[index] ?? '';
		if (char === '\\') {
			const rest = tex.slice(index + 1);
			const word = /^[A-Za-z]+/.exec(rest);
			if (word !== null) {
				tokens.push({ kind: 'command', name: word[0] });
				index += 1 + word[0].length;
			} else {
				tokens.push({ kind: 'command', name: rest[0] ?? '' });
				index += 2;
			}
			continue;
		}
		if (char === '{') tokens.push({ kind: 'open' });
		else if (char === '}') tokens.push({ kind: 'close' });
		else if (char === '^') tokens.push({ kind: 'sup' });
		else if (char === '_') tokens.push({ kind: 'sub' });
		else tokens.push({ kind: 'char', value: char });
		index += 1;
	}
	return tokens;
}

class NotPlain extends Error {}

interface Cursor {
	tokens: Token[];
	at: number;
}

interface Context {
	mode: TexMode;
	script: 'none' | 'sup' | 'sub';
}

function peek(cursor: Cursor): Token | undefined {
	return cursor.tokens[cursor.at];
}

function next(cursor: Cursor): Token | undefined {
	const token = cursor.tokens[cursor.at];
	cursor.at += 1;
	return token;
}

function withParens(text: string): string {
	return text.length === 1 ? text : `(${text})`;
}

/**
 * Parses one argument: a braced group or the single following atom.
 */
function parseArgument(cursor: Cursor, context: Context): string {
	const token = peek(cursor);
	if (token === undefined) return '';
	if (token.kind === 'open') {
		cursor.at += 1;
		return parseSequence(cursor, context, true);
	}
	cursor.at += 1;
	return convertToken(token, cursor, context);
}

function mapScript(text: string, table: Record<string, string>, context: Context): string {
	let out = '';
	for (const char of text) {
		const mapped = table[char];
		if (mapped === undefined) {
			if (context.mode === 'strict') throw new NotPlain();
			return `${context.script === 'sup' ? '^' : '_'}${withParens(text)}`;
		}
		out += mapped;
	}
	return out;
}

function convertCommand(name: string, cursor: Cursor, context: Context): string {
	if (context.script === 'sup' && name === 'circ') return '°';
	const greek = GREEK[name];
	if (greek !== undefined) return greek;
	const symbol = SYMBOLS[name];
	if (symbol !== undefined) return symbol;
	const space = SPACES[name];
	if (space !== undefined) return space;
	if (DROPPED.has(name)) return '';
	if (FUNCTIONS.has(name)) return name;
	if (TRANSPARENT_GROUPS.has(name)) return parseArgument(cursor, context);
	if (context.mode === 'strict') throw new NotPlain();
	switch (name) {
		case 'frac':
		case 'dfrac':
		case 'tfrac':
		case 'cfrac': {
			const numerator = parseArgument(cursor, context);
			const denominator = parseArgument(cursor, context);
			return `${withParens(numerator)}/${withParens(denominator)}`;
		}
		case 'sqrt': {
			if (peek(cursor)?.kind === 'char' && (peek(cursor) as { value: string }).value === '[') {
				while (cursor.at < cursor.tokens.length) {
					const token = next(cursor);
					if (token?.kind === 'char' && token.value === ']') break;
				}
			}
			return `√${withParens(parseArgument(cursor, context))}`;
		}
		case 'vec':
		case 'hat':
		case 'bar':
		case 'dot':
		case 'ddot':
		case 'tilde':
		case 'overline':
		case 'underline':
		case 'widehat':
		case 'widetilde':
		case 'boxed':
		case 'phantom':
			return parseArgument(cursor, context);
		case 'sum':
			return '∑';
		case 'prod':
			return '∏';
		case 'int':
			return '∫';
		case 'oint':
			return '∮';
		case '\\':
			return ' ';
		default:
			return name;
	}
}

function convertToken(token: Token, cursor: Cursor, context: Context): string {
	switch (token.kind) {
		case 'command':
			return convertCommand(token.name, cursor, context);
		case 'open':
			return parseSequence(cursor, context, true);
		case 'close':
			return '';
		case 'sup':
		case 'sub': {
			if (context.script !== 'none' && context.mode === 'strict') throw new NotPlain();
			const script = token.kind === 'sup' ? 'sup' : 'sub';
			const inner = parseArgument(cursor, { mode: context.mode, script });
			return mapScript(inner, script === 'sup' ? SUPERSCRIPT : SUBSCRIPT, {
				mode: context.mode,
				script,
			});
		}
		case 'char': {
			const { value } = token;
			if (/\s/.test(value)) return '';
			if (value === '-') return '−';
			if (value === "'") return '′';
			if (value === '~') return ' ';
			if (value === '&' || value === '#') {
				if (context.mode === 'strict') throw new NotPlain();
				return value === '&' ? ' ' : '';
			}
			return value;
		}
	}
}

function parseSequence(cursor: Cursor, context: Context, untilClose: boolean): string {
	let out = '';
	while (cursor.at < cursor.tokens.length) {
		const token = next(cursor);
		if (token === undefined) break;
		if (token.kind === 'close') {
			if (untilClose) return out;
			continue;
		}
		out += convertToken(token, cursor, context);
	}
	return out;
}

function convert(tex: string, mode: TexMode): string | null {
	const cursor: Cursor = { tokens: tokenize(tex), at: 0 };
	try {
		return parseSequence(cursor, { mode, script: 'none' }, false).replace(/\s+/g, ' ').trim();
	} catch (error) {
		if (error instanceof NotPlain) return null;
		throw error;
	}
}

/**
 * The Unicode form of a plain symbol, or null when the TeX needs
 * two-dimensional layout (or a construct this converter does not know —
 * unknown commands are conservatively "not plain").
 */
export function texToUnicode(tex: string): string | null {
	const converted = convert(tex, 'strict');
	return converted === null || converted === '' ? null : converted;
}

export function isPlainSymbol(tex: string): boolean {
	return texToUnicode(tex) !== null;
}

/**
 * Lossy single-line text for TeX the SVG lane cannot render: fractions
 * become `a/b`, radicals `√x`, accents drop, unknown commands keep their
 * name. Never throws and never returns an empty string for non-empty
 * input.
 */
export function texToFallbackText(tex: string): string {
	const converted = convert(tex, 'lenient');
	if (converted !== null && converted !== '') return converted;
	const stripped = tex
		.replace(/\\[a-zA-Z]+/g, ' ')
		.replace(/[\\{}^_]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
	return stripped === '' ? tex : stripped;
}
