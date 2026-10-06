import { readFileSync } from 'node:fs';

const AA_TEXT = 4.5;

const AA_UI = 3;

const THEMES = ['light', 'dark'];

const RATIO_DECIMALS = 2;

const BASELINE_URL = new URL('./contrast-baseline.json', import.meta.url);

const { tokens } = await import(
	new URL('../../packages/tokens/src/index.ts', import.meta.url).href
);

const suggest = process.argv.includes('--suggest');

/**
 * Parses #rgb / #rrggbb into 0-255 channels; anything else (alpha colors,
 * keywords) is rejected because a checked token must be opaque.
 */
function parseHex(value) {
	const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
	if (match === null) throw new Error(`contrast-check: "${value}" is not an opaque hex color`);
	const hex = match[1].length === 3 ? [...match[1]].map((c) => c + c).join('') : match[1];
	return [0, 2, 4].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
}

function toHex(rgb) {
	return `#${rgb
		.map((c) =>
			Math.round(Math.min(255, Math.max(0, c)))
				.toString(16)
				.padStart(2, '0'),
		)
		.join('')}`;
}

function luminance(rgb) {
	const [r, g, b] = rgb.map((c) => {
		const s = c / 255;
		return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(fg, bg) {
	const a = luminance(parseHex(fg));
	const b = luminance(parseHex(bg));
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function rgbToHsl([r, g, b]) {
	const [rs, gs, bs] = [r / 255, g / 255, b / 255];
	const max = Math.max(rs, gs, bs);
	const min = Math.min(rs, gs, bs);
	const l = (max + min) / 2;
	if (max === min) return [0, 0, l * 100];
	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	const h =
		max === rs
			? (gs - bs) / d + (gs < bs ? 6 : 0)
			: max === gs
				? (bs - rs) / d + 2
				: (rs - gs) / d + 4;
	return [h * 60, s * 100, l * 100];
}

function hslToRgb([h, s, l]) {
	const sn = s / 100;
	const ln = l / 100;
	const k = (n) => (n + h / 30) % 12;
	const a = sn * Math.min(ln, 1 - ln);
	const f = (n) => ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
	return [f(0) * 255, f(8) * 255, f(4) * 255];
}

/**
 * Smallest lightness step (0.25 points) of `color` that reaches `threshold`
 * against every color in `against`, moving away from them.
 */
function minimalFix(color, against, threshold) {
	const [h, s, l] = rgbToHsl(parseHex(color));
	for (let step = 0.25; step <= 100; step += 0.25) {
		for (const direction of [-1, 1]) {
			const candidate = toHex(hslToRgb([h, s, Math.min(100, Math.max(0, l + direction * step))]));
			if (against.every((other) => ratio(candidate, other) >= threshold)) {
				return candidate;
			}
		}
	}
	return undefined;
}

/**
 * A checked pair. `adjust` names which side the solver moves: the
 * foreground for text on neutral surfaces, the fill for fixed-ink-on-fill
 * pairs (white or near-black label on a button or badge).
 */
function pair(theme, label, fg, bg, threshold, adjust = 'fg') {
	return { theme, label, fg, bg, threshold, adjust };
}

function pairsFor(theme) {
	const c = tokens.color;
	const pick = (themed) => themed[theme];
	const surfaces = [
		['bg', pick(c.bg)],
		['bgHigh', pick(c.bgHigh)],
		['surface', pick(c.surface)],
	];
	const textRoles = [
		['ink', pick(c.ink)],
		['inkBody', pick(c.inkBody)],
		['inkMuted', pick(c.inkMuted)],
		['footer', pick(c.footer)],
		['link', pick(c.link)],
		['accent', pick(c.accent)],
		['danger', pick(c.danger)],
		...Object.entries(c.category).map(([slug, value]) => [`category.${slug}`, pick(value)]),
		...Object.entries(tokens.accent.swatch).map(([name, swatch]) => [
			`swatch.${name}.text`,
			pick(swatch.text),
		]),
	];
	const pairs = [];
	for (const [fgName, fg] of textRoles) {
		for (const [bgName, bg] of surfaces) {
			pairs.push(pair(theme, `${fgName} on ${bgName}`, fg, bg, AA_TEXT));
		}
	}
	for (const [bgName, bg] of surfaces) {
		pairs.push(pair(theme, `header (icon UI) on ${bgName}`, pick(c.header), bg, AA_UI));
	}
	pairs.push(pair(theme, 'inputInk on inputBg', pick(c.inputInk), pick(c.inputBg), AA_TEXT));
	pairs.push(
		pair(theme, 'inkMuted (placeholder) on inputBg', pick(c.inkMuted), pick(c.inputBg), AA_TEXT),
	);
	pairs.push(
		pair(
			theme,
			'inputFocusInk on inputFocusBg',
			pick(c.inputFocusInk),
			pick(c.inputFocusBg),
			AA_TEXT,
		),
	);
	pairs.push(pair(theme, 'accentInk on accent', pick(c.accentInk), pick(c.accent), AA_TEXT, 'bg'));
	for (const [name, swatch] of Object.entries(tokens.accent.swatch)) {
		pairs.push(
			pair(
				theme,
				`swatch.${name}.onSolid on solid`,
				pick(swatch.onSolid),
				pick(swatch.solid),
				AA_TEXT,
				'bg',
			),
		);
		pairs.push(
			pair(
				theme,
				`accentInk on swatch.${name}.text`,
				pick(c.accentInk),
				pick(swatch.text),
				AA_TEXT,
				'bg',
			),
		);
	}
	for (const [variant, button] of Object.entries(tokens.button)) {
		for (const state of ['bg', 'bgHover', 'bgActive']) {
			pairs.push(
				pair(
					theme,
					`button.${variant}.ink on ${state}`,
					pick(button.ink),
					pick(button[state]),
					AA_TEXT,
					'bg',
				),
			);
		}
	}
	return pairs;
}

function rounded(value) {
	return Number(value.toFixed(RATIO_DECIMALS));
}

function pairKey(theme, label) {
	return `${theme} ${label}`;
}

/**
 * Accepted legacy deviations (ADR 0008): every pair the original 2022
 * palette ships below its WCAG threshold, with the ratio it shipped at.
 */
function loadBaseline() {
	const raw = JSON.parse(readFileSync(BASELINE_URL, 'utf8'));
	return new Map(raw.accepted.map((entry) => [pairKey(entry.theme, entry.pair), entry]));
}

/**
 * WCAG 2.2 contrast ratchet over @equreka/tokens (SC 1.4.3 text, SC 1.4.11
 * non-text UI). Every foreground role is checked against every background
 * it can sit on, in both themes. A pair below its threshold passes only
 * when contrast-baseline.json accepts it (the exact legacy colors, ADR
 * 0008) and it is not lower than its recorded ratio; a pair absent from
 * the baseline must meet AA. A baseline entry whose pair now passes, or
 * no longer exists, fails too, so the list only ever shrinks. `--suggest`
 * prints the minimal HSL-lightness move (hue and saturation kept) that
 * makes each failing token pass. Borders, washes and selection tints are
 * decorative and not checked. Imports the TypeScript source directly
 * (Node type stripping).
 */
function main() {
	const pairs = THEMES.flatMap(pairsFor);
	const baseline = loadBaseline();
	const failures = pairs.filter((p) => ratio(p.fg, p.bg) < p.threshold);
	const seen = new Set(pairs.map((p) => pairKey(p.theme, p.label)));

	if (suggest) {
		for (const p of pairs) {
			console.log(`${p.theme.padEnd(5)} ${ratio(p.fg, p.bg).toFixed(2).padStart(6)}  ${p.label}`);
		}
		const byToken = new Map();
		for (const p of failures) {
			const moving = p.adjust === 'fg' ? p.fg : p.bg;
			const fixed = p.adjust === 'fg' ? p.bg : p.fg;
			const key = `${p.theme} ${p.label.split(' on ')[p.adjust === 'fg' ? 0 : 1]} ${moving}`;
			const entry = byToken.get(key) ?? { moving, against: new Set(), threshold: p.threshold };
			entry.against.add(fixed);
			entry.threshold = Math.max(entry.threshold, p.threshold);
			byToken.set(key, entry);
		}
		for (const [key, entry] of byToken) {
			const fix = minimalFix(entry.moving, [...entry.against], entry.threshold);
			const worst =
				fix === undefined ? 0 : Math.min(...[...entry.against].map((o) => ratio(fix, o)));
			console.log(`suggest ${key} -> ${fix ?? 'none'} (min ${worst.toFixed(2)}:1)`);
		}
	}

	const errors = [];
	for (const p of failures) {
		const current = rounded(ratio(p.fg, p.bg));
		const accepted = baseline.get(pairKey(p.theme, p.label));
		if (accepted === undefined) {
			errors.push(
				`[${p.theme}] ${p.label}: ${p.fg} on ${p.bg} = ${current}:1 (needs ${p.threshold}:1; not an accepted legacy deviation)`,
			);
		} else if (current < accepted.ratio) {
			errors.push(
				`[${p.theme}] ${p.label}: ${p.fg} on ${p.bg} = ${current}:1, worse than the accepted legacy ${accepted.ratio}:1`,
			);
		}
	}
	for (const [key, entry] of baseline) {
		if (!seen.has(key)) {
			errors.push(`baseline entry "${key}" matches no checked pair; delete it`);
			continue;
		}
		const p = pairs.find((candidate) => pairKey(candidate.theme, candidate.label) === key);
		if (p !== undefined && ratio(p.fg, p.bg) >= p.threshold) {
			errors.push(
				`baseline entry "${key}" now passes (${rounded(ratio(p.fg, p.bg))}:1 >= ${entry.threshold}:1); delete it`,
			);
		}
	}

	if (errors.length > 0) {
		console.error(`contrast-check: ${errors.length} violation(s):`);
		for (const line of errors) console.error(`  ${line}`);
		process.exit(1);
	}

	console.log(
		`contrast-check: ok (${pairs.length} pairs, light + dark; ${failures.length} accepted legacy deviations, ADR 0008)`,
	);
}

main();
