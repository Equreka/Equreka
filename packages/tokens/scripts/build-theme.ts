import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type SwatchName, type ThemedValue, tokens } from '../src/index.js';

type Theme = keyof ThemedValue;

const KEBAB_RE = /[A-Z]/g;

const HEX_RE = /^#([0-9a-f]{6})$/i;

function kebab(name: string): string {
	return name.replace(KEBAB_RE, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * Hue, saturation and lightness of an opaque hex color as the comma triplet
 * legacy CSS fed to `hsla(var(--x-hsl), alpha)`; `color-mix()` is avoided
 * because Safari 15 lacks it.
 */
function hslParts(hex: string): [string, string, string] {
	const match = HEX_RE.exec(hex);
	if (match?.[1] === undefined) {
		throw new Error(`build-theme: swatch fill "${hex}" must be #rrggbb`);
	}
	const value = match[1];
	const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(value.slice(i, i + 2), 16) / 255) as [
		number,
		number,
		number,
	];
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	const d = max - min;
	const s = d === 0 ? 0 : l > 0.5 ? d / (2 - max - min) : d / (max + min);
	const h =
		d === 0
			? 0
			: max === r
				? (g - b) / d + (g < b ? 6 : 0)
				: max === g
					? (b - r) / d + 2
					: (r - g) / d + 4;
	const round = (n: number): string => String(Math.round(n * 10) / 10);
	return [round(h * 60), `${round(s * 100)}%`, `${round(l * 100)}%`];
}

function block(selector: string, declarations: string[], indent = ''): string {
	const body = declarations.map((line) => `${indent}\t${line}`).join('\n');
	return `${indent}${selector} {\n${body}\n${indent}}`;
}

function colorRoles(): [string, ThemedValue][] {
	const { category, ...roles } = tokens.color;
	return [
		...Object.entries(roles).map(([role, value]): [string, ThemedValue] => [kebab(role), value]),
		...Object.entries(category),
	];
}

function swatchDeclarations(theme: Theme): string[] {
	return Object.entries(tokens.accent.swatch).flatMap(([name, swatch]) => {
		const [h, s, l] = hslParts(swatch.fill[theme]);
		return [
			`--eq-sw-${name}-fill: ${swatch.fill[theme]};`,
			`--eq-sw-${name}-solid: ${swatch.solid[theme]};`,
			`--eq-sw-${name}-on-solid: ${swatch.onSolid[theme]};`,
			`--eq-sw-${name}-text: ${swatch.text[theme]};`,
			`--eq-sw-${name}-h: ${h};`,
			`--eq-sw-${name}-s: ${s};`,
			`--eq-sw-${name}-l: ${l};`,
		];
	});
}

function themeDeclarations(theme: Theme): string[] {
	return [
		`color-scheme: ${theme};`,
		...colorRoles().map(([name, value]) => `--eq-${name}: ${value[theme]};`),
		...swatchDeclarations(theme),
		...Object.entries(tokens.button).flatMap(([variant, palette]) =>
			Object.entries(palette).map(
				([state, value]) => `--eq-btn-${variant}-${kebab(state)}: ${value[theme]};`,
			),
		),
		`--eq-acrylic-bg: ${tokens.acrylic.fallback[theme]};`,
		`--eq-acrylic-translucent: ${tokens.acrylic.translucent[theme]};`,
		`--eq-acrylic-filter: ${tokens.acrylic.filter[theme]};`,
	];
}

/**
 * The accent family a container inherits once a slug class sets it:
 * components read only `--eq-accent*`, so retinting a subtree is one class.
 */
function hslRef(swatch: SwatchName): string {
	return `var(--eq-sw-${swatch}-h), var(--eq-sw-${swatch}-s), var(--eq-sw-${swatch}-l)`;
}

function accentAliases(swatch: SwatchName): string[] {
	const ref = (part: string): string => `var(--eq-sw-${swatch}-${part})`;
	return [
		`--eq-accent: ${ref('text')};`,
		`--eq-accent-fill: ${ref('fill')};`,
		`--eq-accent-solid: ${ref('solid')};`,
		`--eq-accent-on-solid: ${ref('on-solid')};`,
		`--eq-accent-h: ${ref('h')};`,
		`--eq-accent-s: ${ref('s')};`,
		`--eq-accent-l: ${ref('l')};`,
		`--eq-accent-hsl: ${hslRef(swatch)};`,
	];
}

function staticRootDeclarations(): string[] {
	const root = accentAliases(tokens.accent.root).filter((line) => !line.startsWith('--eq-accent:'));
	return [
		...root,
		...Object.entries(tokens.accent.term).flatMap(([kind, swatch]) => [
			`--eq-term-${kind}: var(--eq-sw-${swatch}-text);`,
			`--eq-term-${kind}-hsl: ${hslRef(swatch)};`,
		]),
		`--eq-acrylic-dropdown-filter: ${tokens.acrylic.dropdownFilter};`,
		`--eq-acrylic-shadow-alpha: ${tokens.acrylic.shadowAlpha};`,
		...Object.entries(tokens.gradient).map(([name, value]) => `--eq-gradient-${name}: ${value};`),
		...Object.entries(tokens.space).map(([name, value]) => `--eq-space-${name}: ${value};`),
		...Object.entries(tokens.container).map(([name, value]) => `--eq-container-${name}: ${value};`),
		`--eq-duration: ${tokens.motion.duration};`,
		`--eq-ease: ${tokens.motion.ease};`,
	];
}

/**
 * One rule per swatch listing every class that maps to it (`.cat-physics,
 * .type-variables, .sw-blue`), so shared hues cost one declaration block.
 */
function slugClasses(): string[] {
	const selectors = new Map<SwatchName, string[]>();
	const add = (selector: string, swatch: SwatchName): void => {
		selectors.set(swatch, [...(selectors.get(swatch) ?? []), selector]);
	};
	for (const [slug, swatch] of Object.entries(tokens.accent.category)) add(`.cat-${slug}`, swatch);
	for (const [slug, swatch] of Object.entries(tokens.accent.collection))
		add(`.type-${slug}`, swatch);
	for (const swatch of Object.keys(tokens.accent.swatch) as SwatchName[])
		add(`.sw-${swatch}`, swatch);
	return [...selectors].map(([swatch, list]) => block(list.join(',\n'), accentAliases(swatch)));
}

/**
 * Emits dist/theme.css: raw --eq-* custom properties flipped by
 * [data-theme] (with a prefers-color-scheme fallback for no-JS visitors),
 * the per-slug accent classes, then Tailwind v4 @theme bindings so
 * utilities like bg-surface, text-physics or shadow-page-header resolve
 * through the theme-aware variables.
 */
function buildThemeCss(): string {
	const roles = colorRoles();
	const themeInline = [
		...roles.map(([name]) => `--color-${name}: var(--eq-${name});`),
		'--color-accent-fill: var(--eq-accent-fill);',
		'--color-accent-solid: var(--eq-accent-solid);',
		'--color-accent-on-solid: var(--eq-accent-on-solid);',
		...Object.entries(tokens.font).map(([name, value]) => `--font-${name}: ${value};`),
		...Object.entries(tokens.shadow).map(([name, value]) => `--shadow-${name}: ${value};`),
	];
	const themeStatic = [
		`--spacing: ${tokens.spacingBase};`,
		...Object.entries(tokens.breakpoint).map(([name, value]) => `--breakpoint-${name}: ${value};`),
		...Object.entries(tokens.radius).map(([name, value]) => `--radius-${name}: ${value};`),
		...Object.entries(tokens.text).flatMap(([name, ramp]) => [
			`--text-${name}: ${ramp.size};`,
			`--text-${name}--line-height: ${ramp.lineHeight};`,
		]),
		...Object.entries(tokens.fluidText).map(([name, value]) => `--text-${name}: ${value};`),
		...Object.entries(tokens.tracking).map(([name, value]) => `--tracking-${name}: ${value};`),
	];

	return [
		'/* Generated by @equreka/tokens scripts/build-theme.ts — do not edit. */',
		block(':root', [...themeDeclarations('light'), ...staticRootDeclarations()]),
		block(":root[data-theme='dark']", themeDeclarations('dark')),
		`@media (prefers-color-scheme: dark) {\n${block(":root:not([data-theme='light'])", themeDeclarations('dark'), '\t')}\n}`,
		...slugClasses(),
		block('@theme inline', themeInline),
		block('@theme', themeStatic),
		'',
	].join('\n\n');
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'theme.css'), buildThemeCss());
console.log(`@equreka/tokens: wrote ${join(outDir, 'theme.css')}`);
