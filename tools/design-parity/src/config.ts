import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const APPS = ['legacy', 'current'] as const;
export type App = (typeof APPS)[number];

export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export const SHELLS = ['desktop', 'mobile'] as const;
export type ShellId = (typeof SHELLS)[number];

const shellList = z.array(z.enum(SHELLS)).min(1);

const stepSchema = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('click'),
		selector: z.string(),
		nth: z.number().int().nonnegative().optional(),
		optional: z.boolean().optional(),
		shells: shellList.optional(),
	}),
	z.object({
		action: z.literal('hover'),
		selector: z.string(),
		nth: z.number().int().nonnegative().optional(),
		optional: z.boolean().optional(),
		shells: shellList.optional(),
	}),
	z.object({
		action: z.literal('type'),
		selector: z.string(),
		text: z.string(),
		nth: z.number().int().nonnegative().optional(),
		optional: z.boolean().optional(),
		shells: shellList.optional(),
	}),
	z.object({
		action: z.literal('waitFor'),
		selector: z.string(),
		optional: z.boolean().optional(),
		shells: shellList.optional(),
	}),
]);
export type Step = z.infer<typeof stepSchema>;

const maskSchema = z.object({
	selector: z.string(),
	reason: z.string().min(10),
});
export type Mask = z.infer<typeof maskSchema>;

const pageSetupSchema = z.object({
	route: z.string().startsWith('/'),
	steps: z.array(stepSchema).default([]),
	masks: z.array(maskSchema).default([]),
});
export type PageSetup = z.infer<typeof pageSetupSchema>;

const regionMapSchema = z.record(z.string(), z.string());

const shellSchema = z.object({
	width: z.number().int().positive(),
	height: z.number().int().positive(),
	isMobile: z.boolean(),
	userAgent: z.object({ legacy: z.string(), current: z.string() }),
});
export type Shell = z.infer<typeof shellSchema>;

const scenarioSchema = z
	.object({
		id: z.string().regex(/^[a-z0-9-]+$/),
		area: z.enum(['chrome', 'content', 'interactive']),
		contentIdentical: z.boolean(),
		aboveFold: z.object({ gate: z.boolean(), reason: z.string().min(10) }).optional(),
		fixture: z.string().optional(),
		note: z.string().optional(),
		legacy: pageSetupSchema,
		current: pageSetupSchema,
	})
	.refine((scenario) => scenario.contentIdentical || scenario.aboveFold !== undefined, {
		message: 'a scenario that diffs only chrome must state whether aboveFold gates it, and why',
		path: ['aboveFold'],
	});
export type Scenario = z.infer<typeof scenarioSchema>;

const scenariosFileSchema = z.object({
	shells: z.object({ desktop: shellSchema, mobile: shellSchema }),
	themes: z.array(z.enum(THEMES)).min(1),
	aboveFold: z.object({
		legacy: z.string(),
		current: z.string(),
		heightPx: z.number().int().positive(),
	}),
	chrome: z.object({
		legacy: z.object({ desktop: regionMapSchema, mobile: regionMapSchema }),
		current: z.object({ desktop: regionMapSchema, mobile: regionMapSchema }),
	}),
	fixtures: z.record(
		z.string(),
		z.object({
			legacy: z.record(z.string(), z.string()),
			current: z.record(z.string(), z.string()),
		}),
	),
	scenarios: z.array(scenarioSchema).min(1),
});
export type ScenariosFile = z.infer<typeof scenariosFileSchema>;

const probeSchema = z.object({
	area: z.string(),
	probe: z.string(),
	page: z.string(),
	shells: shellList.default(['desktop']),
	state: z.enum(['rest', 'hover']).default('rest'),
	legacy: z.string(),
	current: z.string(),
	properties: z.array(z.string()).min(1),
});
export type Probe = z.infer<typeof probeSchema>;

const probesFileSchema = z.object({
	pages: z.record(z.string(), z.object({ legacy: pageSetupSchema, current: pageSetupSchema })),
	probes: z.array(probeSchema).min(1),
});
export type ProbesFile = z.infer<typeof probesFileSchema>;

const thresholdsSchema = z.object({
	pixelmatchThreshold: z.number().min(0).max(1),
	scenarioMaxDiffPct: z.number().nonnegative(),
	aboveFoldMaxDiffPct: z.number().nonnegative(),
	probeLengthTolerancePx: z.number().nonnegative(),
	probeTolerantProperties: z.array(z.string()),
});
export type Thresholds = z.infer<typeof thresholdsSchema>;

const waiverSchema = z.discriminatedUnion('kind', [
	z.object({
		kind: z.literal('hide'),
		app: z.enum(APPS),
		selector: z.string(),
		reason: z.string().min(10),
	}),
	z.object({
		kind: z.literal('probe'),
		probe: z.string(),
		property: z.string().optional(),
		reason: z.string().min(10),
	}),
]);
export type Waiver = z.infer<typeof waiverSchema>;

const waiversFileSchema = z.object({ waivers: z.array(waiverSchema) });

/**
 * Every runtime knob in one place. Ports and paths default to the
 * layout documented in README.md; environment variables override them.
 */
export interface RuntimeConfig {
	repoRoot: string;
	toolRoot: string;
	legacyDir: string | undefined;
	originalLegacyDir: string;
	legacyUrl: string;
	currentUrl: string;
	legacyPort: number;
	currentPort: number;
	outDir: string;
	chromiumPath: string | undefined;
}

const toolRoot = fileURLToPath(new URL('..', import.meta.url));

function readJson<T>(file: string, schema: z.ZodType<T>): T {
	const parsed = schema.safeParse(JSON.parse(readFileSync(join(toolRoot, file), 'utf8')));
	if (!parsed.success) {
		throw new Error(`${file}: ${z.prettifyError(parsed.error)}`);
	}
	return parsed.data;
}

export function loadScenarios(): ScenariosFile {
	return readJson('scenarios.json', scenariosFileSchema);
}

export function loadProbes(): ProbesFile {
	return readJson('probes.json', probesFileSchema);
}

export function loadThresholds(): Thresholds {
	return readJson('thresholds.json', thresholdsSchema);
}

export function loadWaivers(): Waiver[] {
	return readJson('waivers.json', waiversFileSchema).waivers;
}

export function runtimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
	const repoRoot = resolve(toolRoot, '..', '..');
	const legacyPort = Number(env.LEGACY_PORT ?? '3100');
	const currentPort = Number(env.CURRENT_PORT ?? '43210');
	return {
		repoRoot,
		toolRoot,
		legacyDir: env.LEGACY_DIR === undefined ? undefined : resolve(env.LEGACY_DIR),
		originalLegacyDir: resolve(repoRoot, '..', 'Equreka'),
		legacyUrl: `http://127.0.0.1:${legacyPort}`,
		currentUrl: `http://127.0.0.1:${currentPort}`,
		legacyPort,
		currentPort,
		outDir: resolve(env.PARITY_OUT ?? join(tmpdir(), 'equreka-design-parity')),
		chromiumPath: env.PARITY_CHROMIUM,
	};
}
