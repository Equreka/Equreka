export const TOKENS_VERSION = 1;

export type CategorySlug = 'universal' | 'mathematics' | 'physics' | 'chemistry';

/**
 * One color role resolved for both themes. Values are raw CSS colors;
 * consumers never hardcode hex — web reads the generated theme.css, mobile
 * reads this object directly.
 */
export interface ThemedColor {
	light: string;
	dark: string;
}

export interface DesignTokens {
	color: {
		bg: ThemedColor;
		surface: ThemedColor;
		ink: ThemedColor;
		inkMuted: ThemedColor;
		border: ThemedColor;
		accent: ThemedColor;
		accentInk: ThemedColor;
		danger: ThemedColor;
		category: Record<CategorySlug, ThemedColor>;
	};
	font: {
		sans: string;
		mono: string;
	};
	text: Record<string, { size: string; lineHeight: string }>;
	radius: Record<string, string>;
	spacingBase: string;
}

export const tokens: DesignTokens = {
	color: {
		bg: { light: '#f8fafc', dark: '#0b1120' },
		surface: { light: '#ffffff', dark: '#151d31' },
		ink: { light: '#0f172a', dark: '#e2e8f0' },
		inkMuted: { light: '#475569', dark: '#94a3b8' },
		border: { light: '#e2e8f0', dark: '#2b3650' },
		accent: { light: '#4f46e5', dark: '#818cf8' },
		accentInk: { light: '#ffffff', dark: '#0b1120' },
		danger: { light: '#dc2626', dark: '#f87171' },
		category: {
			universal: { light: '#7c3aed', dark: '#a78bfa' },
			mathematics: { light: '#2563eb', dark: '#60a5fa' },
			physics: { light: '#ea580c', dark: '#fb923c' },
			chemistry: { light: '#059669', dark: '#34d399' },
		},
	},
	font: {
		sans: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
		mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
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
	radius: {
		sm: '0.25rem',
		md: '0.5rem',
		lg: '0.75rem',
		xl: '1rem',
	},
	spacingBase: '0.25rem',
};
