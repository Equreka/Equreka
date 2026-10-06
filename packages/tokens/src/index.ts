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
 * One legacy palette hue in its uses, every value the resolved color the
 * 2022 build shipped (docs/design/legacy-design-spec.md section 2): `fill`
 * is the palette color (`--bs-{name}`, `--eqk-color`), `hsl` its authored
 * `h, s%, l%` triplet (`--eqk-color-hsl`, the source of every `hsla()` wash
 * and `hsl(h, 100%, x%)` tint), `solid` the fill placed under text,
 * `onSolid` the badge label `hsl(h, 100%, 90%)`, and `text` the hue used as
 * text on neutral surfaces. Legacy used the fill for all three roles; pairs
 * below WCAG AA are accepted deviations listed in
 * scripts/quality/contrast-baseline.json (ADR 0008).
 */
export interface AccentSwatch {
	fill: ThemedColor;
	hsl: ThemedValue;
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
		link: ThemedColor;
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
	lightness: {
		theme: ThemedValue;
		inverted: ThemedValue;
	};
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
 * Legacy Equreka v1 palette exactly as the compiled 2022 CSS resolved it
 * (docs/design/legacy-design-spec.md sections 2.3 and 2.4). `primary`
 * text and label stay Bootstrap's literal `#0d6efd` / `#fff` in both
 * themes because Bootstrap components compiled the light hex (spec 2.4).
 */
const SWATCH: Record<SwatchName, AccentSwatch> = {
	primary: {
		fill: { light: '#0d6efd', dark: '#175bc0' },
		hsl: { light: '216, 98%, 52%', dark: '216, 78%, 42%' },
		solid: { light: '#0d6efd', dark: '#175bc0' },
		onSolid: { light: '#ffffff', dark: '#ffffff' },
		text: { light: '#0d6efd', dark: '#0d6efd' },
	},
	blue: {
		fill: { light: '#0661e0', dark: '#164e9c' },
		hsl: { light: '215, 95%, 45%', dark: '215, 75%, 35%' },
		solid: { light: '#0661e0', dark: '#164e9c' },
		onSolid: { light: '#cce1ff', dark: '#cce1ff' },
		text: { light: '#0661e0', dark: '#164e9c' },
	},
	indigo: {
		fill: { light: '#8c1ff9', dark: '#731dc9' },
		hsl: { light: '270, 95%, 55%', dark: '270, 75%, 45%' },
		solid: { light: '#8c1ff9', dark: '#731dc9' },
		onSolid: { light: '#e6ccff', dark: '#e6ccff' },
		text: { light: '#8c1ff9', dark: '#731dc9' },
	},
	purple: {
		fill: { light: '#5b13ec', dark: '#5024a8' },
		hsl: { light: '260, 85%, 50%', dark: '260, 65%, 40%' },
		solid: { light: '#5b13ec', dark: '#5024a8' },
		onSolid: { light: '#ddccff', dark: '#ddccff' },
		text: { light: '#5b13ec', dark: '#5024a8' },
	},
	pink: {
		fill: { light: '#e2367e', dark: '#b23468' },
		hsl: { light: '335, 75%, 55%', dark: '335, 55%, 45%' },
		solid: { light: '#e2367e', dark: '#b23468' },
		onSolid: { light: '#ffcce1', dark: '#ffcce1' },
		text: { light: '#e2367e', dark: '#b23468' },
	},
	red: {
		fill: { light: '#dd3c3c', dark: '#ac3939' },
		hsl: { light: '0, 70%, 55%', dark: '0, 50%, 45%' },
		solid: { light: '#dd3c3c', dark: '#ac3939' },
		onSolid: { light: '#ffcccc', dark: '#ffcccc' },
		text: { light: '#dd3c3c', dark: '#ac3939' },
	},
	orange: {
		fill: { light: '#ee7c2b', dark: '#bd6628' },
		hsl: { light: '25, 85%, 55%', dark: '25, 65%, 45%' },
		solid: { light: '#ee7c2b', dark: '#bd6628' },
		onSolid: { light: '#ffe1cc', dark: '#ffe1cc' },
		text: { light: '#ee7c2b', dark: '#bd6628' },
	},
	yellow: {
		fill: { light: '#fed401', dark: '#b79c15' },
		hsl: { light: '50, 99%, 50%', dark: '50, 79%, 40%' },
		solid: { light: '#fed401', dark: '#b79c15' },
		onSolid: { light: '#fff6cc', dark: '#fff6cc' },
		text: { light: '#fed401', dark: '#b79c15' },
	},
	green: {
		fill: { light: '#1fad1f', dark: '#267326' },
		hsl: { light: '120, 70%, 40%', dark: '120, 50%, 30%' },
		solid: { light: '#1fad1f', dark: '#267326' },
		onSolid: { light: '#ccffcc', dark: '#ccffcc' },
		text: { light: '#1fad1f', dark: '#267326' },
	},
	teal: {
		fill: { light: '#0fbda0', dark: '#1b7e6e' },
		hsl: { light: '170, 85%, 40%', dark: '170, 65%, 30%' },
		solid: { light: '#0fbda0', dark: '#1b7e6e' },
		onSolid: { light: '#ccfff7', dark: '#ccfff7' },
		text: { light: '#0fbda0', dark: '#1b7e6e' },
	},
	cyan: {
		fill: { light: '#0f91bd', dark: '#1b657e' },
		hsl: { light: '195, 85%, 40%', dark: '195, 65%, 30%' },
		solid: { light: '#0f91bd', dark: '#1b657e' },
		onSolid: { light: '#ccf2ff', dark: '#ccf2ff' },
		text: { light: '#0f91bd', dark: '#1b657e' },
	},
	olive: {
		fill: { light: '#8cb31a', dark: '#627722' },
		hsl: { light: '75, 75%, 40%', dark: '75, 55%, 30%' },
		solid: { light: '#8cb31a', dark: '#627722' },
		onSolid: { light: '#f2ffcc', dark: '#f2ffcc' },
		text: { light: '#8cb31a', dark: '#627722' },
	},
	magenta: {
		fill: { light: '#b613ec', dark: '#8724a8' },
		hsl: { light: '285, 85%, 50%', dark: '285, 65%, 40%' },
		solid: { light: '#b613ec', dark: '#8724a8' },
		onSolid: { light: '#f2ccff', dark: '#f2ccff' },
		text: { light: '#b613ec', dark: '#8724a8' },
	},
	gray: {
		fill: { light: '#5c6370', dark: '#4d4d4d' },
		hsl: { light: '220, 10%, 40%', dark: '220, 0%, 30%' },
		solid: { light: '#5c6370', dark: '#4d4d4d' },
		onSolid: { light: '#ccddff', dark: '#ccddff' },
		text: { light: '#5c6370', dark: '#4d4d4d' },
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
		inkBody: { light: '#676f7e', dark: '#8f96a3' },
		inkMuted: { light: '#9da3af', dark: '#505662' },
		header: { light: '#9da3af', dark: '#505662' },
		footer: { light: '#969ca9', dark: '#4b505b' },
		link: { light: '#8c9ba7', dark: '#8c9ba7' },
		border: { light: '#d5d7dd', dark: '#121416' },
		accent: swatchText(ROOT_SWATCH),
		accentInk: { light: '#ffffff', dark: '#ffffff' },
		danger: { light: '#dc3545', dark: '#dc3545' },
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
			bg: { light: '#0d6efd', dark: '#0d6efd' },
			bgHover: { light: '#0b5ed7', dark: '#0b5ed7' },
			bgActive: { light: '#0a58ca', dark: '#0a58ca' },
			ink: { light: '#ffffff', dark: '#ffffff' },
		},
		dark: {
			bg: { light: '#212529', dark: '#212529' },
			bgHover: { light: '#424649', dark: '#424649' },
			bgActive: { light: '#4d5154', dark: '#4d5154' },
			ink: { light: '#ffffff', dark: '#ffffff' },
		},
		success: {
			bg: { light: '#198754', dark: '#198754' },
			bgHover: { light: '#157347', dark: '#157347' },
			bgActive: { light: '#146c43', dark: '#146c43' },
			ink: { light: '#ffffff', dark: '#ffffff' },
		},
		danger: {
			bg: { light: '#dc3545', dark: '#dc3545' },
			bgHover: { light: '#bb2d3b', dark: '#bb2d3b' },
			bgActive: { light: '#b02a37', dark: '#b02a37' },
			ink: { light: '#ffffff', dark: '#ffffff' },
		},
		warning: {
			bg: { light: '#ffc107', dark: '#ffc107' },
			bgHover: { light: '#ffca2c', dark: '#ffca2c' },
			bgActive: { light: '#ffcd39', dark: '#ffcd39' },
			ink: { light: '#000000', dark: '#000000' },
		},
		pink: {
			bg: { light: '#e2367e', dark: '#e2367e' },
			bgHover: { light: '#e65491', dark: '#e65491' },
			bgActive: { light: '#e85e98', dark: '#e85e98' },
			ink: { light: '#000000', dark: '#000000' },
		},
	},
	lightness: {
		theme: { light: '98%', dark: '7%' },
		inverted: { light: '5%', dark: '90%' },
	},
	acrylic: {
		fallback: { light: 'hsla(220, 10%, 97%, 0.97)', dark: 'hsla(220, 10%, 12%, 0.97)' },
		translucent: { light: 'hsla(220, 10%, 97%, 0.65)', dark: 'hsla(220, 10%, 12%, 0.65)' },
		filter: { light: 'blur(10px) saturate(2)', dark: 'blur(30px) saturate(1.35)' },
		dropdownFilter: 'blur(10px) saturate(1.35)',
		shadowAlpha: '0.15',
	},
	font: {
		sans: "system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif, 'Segoe UI', Roboto, 'Helvetica Neue', 'Noto Sans', 'Liberation Sans', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
		display:
			"Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
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
		acrylic:
			'0 0.5rem 1rem -0.5rem hsla(0, 0%, 0%, 0.15), inset 0 0 0 1px hsla(220, 10%, var(--eq-theme-lightness), 0)',
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
