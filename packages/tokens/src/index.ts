export const TOKENS_VERSION = 2;

export type CategorySlug = 'universal' | 'mathematics' | 'physics' | 'chemistry';

export type CollectionSlug =
	| 'equations'
	| 'formulas'
	| 'constants'
	| 'magnitudes'
	| 'variables'
	| 'units'
	| 'prefixes'
	| 'paths';

export type TermKind = 'magnitude' | 'variable' | 'constant';

export type SwatchName =
	| 'primary'
	| 'blue'
	| 'indigo'
	| 'purple'
	| 'pink'
	| 'red'
	| 'orange'
	| 'yellow'
	| 'green'
	| 'teal'
	| 'cyan'
	| 'olive'
	| 'magenta'
	| 'gray';

export type ButtonVariant = 'primary' | 'dark' | 'success' | 'danger' | 'warning' | 'pink';

/**
 * One value resolved for both themes. Colors are opaque hex unless the role
 * is a translucent overlay; consumers never hardcode values — web reads the
 * generated theme.css, mobile reads this object directly.
 */
export interface ThemedValue {
	light: string;
	dark: string;
}

export type ThemedColor = ThemedValue;

/**
 * One legacy palette hue in its four uses: `fill` is the decorative legacy
 * color (gradients, shadows, tints; its HSL drives `hsla()` washes),
 * `solid` is the fill placed under text, `onSolid` the label on `solid`,
 * and `text` the hue used as text on neutral surfaces.
 */
export interface AccentSwatch {
	fill: ThemedColor;
	solid: ThemedColor;
	onSolid: ThemedColor;
	text: ThemedColor;
}

export interface ButtonPalette {
	bg: ThemedColor;
	bgHover: ThemedColor;
	bgActive: ThemedColor;
	ink: ThemedColor;
}

export interface DesignTokens {
	color: {
		bg: ThemedColor;
		bgHigh: ThemedColor;
		surface: ThemedColor;
		ink: ThemedColor;
		inkBody: ThemedColor;
		inkMuted: ThemedColor;
		header: ThemedColor;
		footer: ThemedColor;
		border: ThemedColor;
		accent: ThemedColor;
		accentInk: ThemedColor;
		danger: ThemedColor;
		inputBg: ThemedColor;
		inputInk: ThemedColor;
		inputBorder: ThemedColor;
		inputFocusBg: ThemedColor;
		inputFocusInk: ThemedColor;
		wash: ThemedColor;
		tint: ThemedColor;
		selection: ThemedColor;
		category: Record<CategorySlug, ThemedColor>;
	};
	accent: {
		swatch: Record<SwatchName, AccentSwatch>;
		root: SwatchName;
		category: Record<CategorySlug, SwatchName>;
		collection: Record<CollectionSlug, SwatchName>;
		term: Record<TermKind, SwatchName>;
	};
	button: Record<ButtonVariant, ButtonPalette>;
	acrylic: {
		fallback: ThemedColor;
		translucent: ThemedColor;
		filter: ThemedValue;
		dropdownFilter: string;
		shadowAlpha: string;
	};
	font: {
		sans: string;
		display: string;
		mono: string;
		math: string;
	};
	fontWeight: Record<'regular' | 'medium' | 'semibold', string>;
	tracking: Record<'button' | 'label', string>;
	text: Record<string, { size: string; lineHeight: string }>;
	fluidText: Record<string, string>;
	radius: Record<string, string>;
	shadow: Record<string, string>;
	gradient: Record<'rainbow', string>;
	space: Record<string, string>;
	breakpoint: Record<'sm' | 'md' | 'lg' | 'xl' | '2xl', string>;
	container: Record<'sm' | 'md' | 'lg' | 'xl' | '2xl', string>;
	motion: { duration: string; ease: string };
	spacingBase: string;
}

/**
 * Legacy Equreka v1 palette (docs/design/legacy-design-spec.md section 2),
 * fills resolved from the compiled 2022 CSS, text and solid variants moved
 * the minimal lightness needed for WCAG AA (deviation table in the spec's
 * contrast section, enforced by scripts/quality/contrast-check.mjs).
 */
const SWATCH: Record<SwatchName, AccentSwatch> = {
	primary: {
		fill: { light: '#0d6efd', dark: '#175bc0' },
		solid: { light: '#175bc0', dark: '#175bc0' },
		onSolid: { light: '#ffffff', dark: '#ffffff' },
		text: { light: '#175bc0', dark: '#2d81fd' },
	},
	blue: {
		fill: { light: '#0661e0', dark: '#164e9c' },
		solid: { light: '#164e9c', dark: '#164e9c' },
		onSolid: { light: '#ffffff', dark: '#ffffff' },
		text: { light: '#164e9c', dark: '#2c82f9' },
	},
	indigo: {
		fill: { light: '#8c1ff9', dark: '#731dc9' },
		solid: { light: '#731dc9', dark: '#731dc9' },
		onSolid: { light: '#ffffff', dark: '#ffffff' },
		text: { light: '#731dc9', dark: '#ac5dfb' },
	},
	purple: {
		fill: { light: '#5b13ec', dark: '#5024a8' },
		solid: { light: '#5024a8', dark: '#5024a8' },
		onSolid: { light: '#ffffff', dark: '#ffffff' },
		text: { light: '#5024a8', dark: '#986af3' },
	},
	pink: {
		fill: { light: '#e2367e', dark: '#b23468' },
		solid: { light: '#b23468', dark: '#b23468' },
		onSolid: { light: '#ffffff', dark: '#ffffff' },
		text: { light: '#b23468', dark: '#e54a8b' },
	},
	red: {
		fill: { light: '#dd3c3c', dark: '#ac3939' },
		solid: { light: '#ac3939', dark: '#ac3939' },
		onSolid: { light: '#ffffff', dark: '#ffffff' },
		text: { light: '#ac3939', dark: '#e25656' },
	},
	orange: {
		fill: { light: '#ee7c2b', dark: '#bd6628' },
		solid: { light: '#ee7c2b', dark: '#ee7c2b' },
		onSolid: { light: '#212529', dark: '#212529' },
		text: { light: '#9b5421', dark: '#ee7c2b' },
	},
	yellow: {
		fill: { light: '#fed401', dark: '#b79c15' },
		solid: { light: '#fed401', dark: '#fed401' },
		onSolid: { light: '#212529', dark: '#212529' },
		text: { light: '#77650e', dark: '#fed401' },
	},
	green: {
		fill: { light: '#1fad1f', dark: '#267326' },
		solid: { light: '#267326', dark: '#267326' },
		onSolid: { light: '#ffffff', dark: '#ffffff' },
		text: { light: '#267326', dark: '#1fad1f' },
	},
	teal: {
		fill: { light: '#0fbda0', dark: '#1b7e6e' },
		solid: { light: '#1b7e6e', dark: '#1b7e6e' },
		onSolid: { light: '#ffffff', dark: '#ffffff' },
		text: { light: '#197264', dark: '#0fbda0' },
	},
	cyan: {
		fill: { light: '#0f91bd', dark: '#1b657e' },
		solid: { light: '#1b657e', dark: '#1b657e' },
		onSolid: { light: '#ffffff', dark: '#ffffff' },
		text: { light: '#1b657e', dark: '#0f91bd' },
	},
	olive: {
		fill: { light: '#8cb31a', dark: '#627722' },
		solid: { light: '#627722', dark: '#627722' },
		onSolid: { light: '#ffffff', dark: '#ffffff' },
		text: { light: '#5b6e1f', dark: '#8cb31a' },
	},
	magenta: {
		fill: { light: '#b613ec', dark: '#8724a8' },
		solid: { light: '#8724a8', dark: '#8724a8' },
		onSolid: { light: '#ffffff', dark: '#ffffff' },
		text: { light: '#8724a8', dark: '#c74af0' },
	},
	gray: {
		fill: { light: '#5c6370', dark: '#454a54' },
		solid: { light: '#5c6370', dark: '#5c6370' },
		onSolid: { light: '#ffffff', dark: '#ffffff' },
		text: { light: '#5c6370', dark: '#7e8695' },
	},
};

const ROOT_SWATCH: SwatchName = 'primary';

const CATEGORY_SWATCH: Record<CategorySlug, SwatchName> = {
	universal: 'orange',
	mathematics: 'red',
	physics: 'blue',
	chemistry: 'indigo',
};

const COLLECTION_SWATCH: Record<CollectionSlug, SwatchName> = {
	equations: 'olive',
	formulas: 'green',
	constants: 'teal',
	magnitudes: 'cyan',
	variables: 'blue',
	units: 'purple',
	prefixes: 'magenta',
	paths: 'pink',
};

const TERM_SWATCH: Record<TermKind, SwatchName> = {
	magnitude: 'orange',
	variable: 'red',
	constant: 'blue',
};

function swatchText(name: SwatchName): ThemedColor {
	return SWATCH[name].text;
}

export const tokens: DesignTokens = {
	color: {
		bg: { light: '#e3e5e8', dark: '#070708' },
		bgHigh: { light: '#eeeff1', dark: '#0e0f11' },
		surface: { light: '#f7f7f8', dark: '#1c1e22' },
		ink: { light: '#505662', dark: '#c7cad1' },
		inkBody: { light: '#606775', dark: '#8f96a3' },
		inkMuted: { light: '#606775', dark: '#7e8595' },
		header: { light: '#7b8393', dark: '#626978' },
		footer: { light: '#606775', dark: '#7e8595' },
		border: { light: '#d5d7dd', dark: '#22252a' },
		accent: swatchText(ROOT_SWATCH),
		accentInk: { light: '#ffffff', dark: '#070708' },
		danger: { light: '#c62232', dark: '#e15562' },
		inputBg: { light: '#f4f4f6', dark: '#151619' },
		inputInk: { light: '#22252a', dark: '#818898' },
		inputBorder: { light: '#d5d7dd', dark: '#22252a' },
		inputFocusBg: { light: '#fcfcfd', dark: '#17191c' },
		inputFocusInk: { light: '#17191c', dark: '#8f96a3' },
		wash: { light: 'hsla(220, 100%, 5%, 0.075)', dark: 'hsla(220, 100%, 90%, 0.075)' },
		tint: { light: 'rgba(102, 119, 153, 0.2)', dark: 'rgba(102, 119, 153, 0.2)' },
		selection: { light: 'hsla(0, 0%, 5%, 0.15)', dark: 'hsla(0, 0%, 90%, 0.125)' },
		category: {
			universal: swatchText(CATEGORY_SWATCH.universal),
			mathematics: swatchText(CATEGORY_SWATCH.mathematics),
			physics: swatchText(CATEGORY_SWATCH.physics),
			chemistry: swatchText(CATEGORY_SWATCH.chemistry),
		},
	},
	accent: {
		swatch: SWATCH,
		root: ROOT_SWATCH,
		category: CATEGORY_SWATCH,
		collection: COLLECTION_SWATCH,
		term: TERM_SWATCH,
	},
	button: {
		primary: {
			bg: { light: '#0d6efd', dark: '#175bc0' },
			bgHover: { light: '#0b5ed7', dark: '#144da3' },
			bgActive: { light: '#0a58ca', dark: '#12499a' },
			ink: { light: '#ffffff', dark: '#ffffff' },
		},
		dark: {
			bg: { light: '#212529', dark: '#212529' },
			bgHover: { light: '#424649', dark: '#424649' },
			bgActive: { light: '#4d5154', dark: '#4d5154' },
			ink: { light: '#ffffff', dark: '#ffffff' },
		},
		success: {
			bg: { light: '#198754', dark: '#1c5138' },
			bgHover: { light: '#157347', dark: '#184530' },
			bgActive: { light: '#146c43', dark: '#16412d' },
			ink: { light: '#ffffff', dark: '#ffffff' },
		},
		danger: {
			bg: { light: '#dc3545', dark: '#a73742' },
			bgHover: { light: '#bb2d3b', dark: '#8e2f38' },
			bgActive: { light: '#b02a37', dark: '#862c35' },
			ink: { light: '#ffffff', dark: '#ffffff' },
		},
		warning: {
			bg: { light: '#ffc107', dark: '#be9415' },
			bgHover: { light: '#ffca2c', dark: '#c8a438' },
			bgActive: { light: '#ffcd39', dark: '#cba944' },
			ink: { light: '#000000', dark: '#000000' },
		},
		pink: {
			bg: { light: '#e2367e', dark: '#b23468' },
			bgHover: { light: '#e65491', dark: '#972c58' },
			bgActive: { light: '#e85e98', dark: '#8e2a53' },
			ink: { light: '#000000', dark: '#ffffff' },
		},
	},
	acrylic: {
		fallback: { light: 'hsla(220, 10%, 97%, 0.97)', dark: 'hsla(220, 10%, 12%, 0.97)' },
		translucent: { light: 'hsla(220, 10%, 97%, 0.65)', dark: 'hsla(220, 10%, 12%, 0.65)' },
		filter: { light: 'blur(10px) saturate(2)', dark: 'blur(30px) saturate(1.35)' },
		dropdownFilter: 'blur(10px) saturate(1.35)',
		shadowAlpha: '0.15',
	},
	font: {
		sans: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', 'Noto Sans', 'Liberation Sans', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
		display:
			"Poppins, 'Poppins Fallback', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
		mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
		math: "'KaTeX_Main', 'Times New Roman', serif",
	},
	fontWeight: {
		regular: '400',
		medium: '500',
		semibold: '600',
	},
	tracking: {
		button: '0.5px',
		label: '1px',
	},
	text: {
		xs: { size: '0.75rem', lineHeight: '1rem' },
		sm: { size: '0.875rem', lineHeight: '1.25rem' },
		base: { size: '1rem', lineHeight: '1.5rem' },
		lg: { size: '1.125rem', lineHeight: '1.75rem' },
		xl: { size: '1.25rem', lineHeight: '1.75rem' },
		'2xl': { size: '1.5rem', lineHeight: '2rem' },
		'3xl': { size: '1.875rem', lineHeight: '2.25rem' },
		'4xl': { size: '2.25rem', lineHeight: '2.5rem' },
	},
	fluidText: {
		h1: 'clamp(1.375rem, calc(1.375rem + 1.5vw), 2.5rem)',
		h2: 'clamp(1.325rem, calc(1.325rem + 0.9vw), 2rem)',
		h3: 'clamp(1.3rem, calc(1.3rem + 0.6vw), 1.75rem)',
		h4: 'clamp(1.275rem, calc(1.275rem + 0.3vw), 1.5rem)',
		h5: '1.25rem',
		h6: '1rem',
		body: 'clamp(0.9rem, 1.5vw, 1rem)',
		lead: 'clamp(1rem, 1.5vw, 1.15rem)',
		'card-title': 'clamp(1.1rem, 2vw, 1.25rem)',
		'collapse-title': 'clamp(1.15rem, 2vw, 1.35rem)',
		'home-card-title': 'clamp(1.25rem, 2vw, 1.75rem)',
		'home-card-lead': 'clamp(1rem, 2vw, 1.1rem)',
		'page-label': 'clamp(0.75rem, 2vw, 1rem)',
		'page-title': 'clamp(1.35rem, 3vw, 2rem)',
		'display-math': 'clamp(1.25rem, 3vw, 2.5rem)',
		'calculator-message': 'clamp(1.15rem, 1.5vw, 1.75rem)',
		'list-link': 'clamp(0.95rem, 2vw, 1rem)',
		pill: 'clamp(0.75rem, 1vw, 0.95rem)',
		footer: 'clamp(0.85rem, 2vw, 1rem)',
	},
	radius: {
		sm: '0.375rem',
		md: '0.5rem',
		lg: '0.75rem',
		xl: '1rem',
		card: 'clamp(0.5rem, 1.5vw, 1rem)',
		'home-card': 'clamp(1rem, 1.5vw, 1.15rem)',
		progress: '3px',
		pill: '50rem',
	},
	shadow: {
		acrylic: '0 0.5rem 1rem -0.5rem hsla(0, 0%, 0%, 0.15)',
		'accent-card': '0 0.5rem 1.25rem -1rem var(--eq-accent-fill)',
		'home-card': '0 0.75rem 1.25rem -1rem var(--eq-accent-fill)',
		'home-card-hover': '0 1rem 1.75rem -1rem var(--eq-accent-fill)',
		'page-header': '0 0.5rem 2rem -1rem var(--eq-accent-fill)',
		'search-focus':
			'0 0.5rem 1rem -0.5rem hsla(0, 0%, 0%, 0.15), inset 0 0 0 2px rgba(83, 121, 198, 0.5)',
		'accent-focus': '0 0 0 0.25rem hsla(var(--eq-accent-hsl), 0.25)',
		'alert-danger':
			'0 1rem 1rem -1rem rgba(221, 60, 73, 0.85), inset 0 0 0 2px rgba(221, 60, 73, 0.25)',
	},
	gradient: {
		rainbow:
			'linear-gradient(90deg, #0661e0, #8c1ff9, #5b13ec, #e2367e, #dd3c3c, #ee7c2b, #fed401, #1fad1f, #0fbda0, #0f91bd)',
	},
	space: {
		gutter: '0.75rem',
		'card-gap': 'clamp(0.75rem, 2vw, 1.15rem)',
		'card-pad-x': 'clamp(0.95rem, 2vw, 1.25rem)',
		'card-pad-y': '1.25rem',
		'page-header': 'clamp(0.75rem, 2vw, 1.35rem)',
		'header-y': '1.5rem',
		'app-menu': 'min(17.5vw, 70px)',
	},
	breakpoint: {
		sm: '36rem',
		md: '48rem',
		lg: '62rem',
		xl: '75rem',
		'2xl': '87.5rem',
	},
	container: {
		sm: '540px',
		md: '720px',
		lg: '960px',
		xl: '1140px',
		'2xl': '1320px',
	},
	motion: {
		duration: '0.35s',
		ease: 'ease',
	},
	spacingBase: '0.25rem',
};
