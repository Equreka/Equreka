import { mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import type { Browser } from 'playwright-core';
import { launchBrowser, newAppContext, resolveChromium, settle } from './browser.js';
import { type CaptureManifest, captureVariant } from './capture.js';
import {
	type App,
	loadProbes,
	loadScenarios,
	loadThresholds,
	loadWaivers,
	runtimeConfig,
	type Scenario,
	type ScenariosFile,
	SHELLS,
	type ShellId,
	type Theme,
} from './config.js';
import { diffImages, diffRegion, percent, type RegionDiff } from './diff.js';
import { readPng } from './image.js';
import { type ProbeRun, runProbes } from './probes.js';
import { buildReport, type ScenarioResult, writeReport } from './report.js';
import { ensureServers } from './servers.js';
import { writeRegionSheet, writeSheets } from './sheets.js';

const { values: flags } = parseArgs({
	options: {
		only: { type: 'string' },
		area: { type: 'string' },
		shell: { type: 'string' },
		theme: { type: 'string' },
		runs: { type: 'string', default: '1' },
		'no-probes': { type: 'boolean', default: false },
		'skip-capture': { type: 'boolean', default: false },
	},
});

const config = runtimeConfig();
const scenariosFile = loadScenarios();
const probesFile = loadProbes();
const thresholds = loadThresholds();
const waivers = loadWaivers();
const runs = Math.max(1, Number(flags.runs));
const baseUrls: Record<App, string> = { legacy: config.legacyUrl, current: config.currentUrl };
const blocked = new Set<string>();

const onlyViews = flags.only?.split(',');
const shells = SHELLS.filter((shell) => flags.shell === undefined || flags.shell === shell);
const themes = scenariosFile.themes.filter(
	(theme) => flags.theme === undefined || flags.theme === theme,
);
const scenarios = scenariosFile.scenarios.filter(
	(scenario) =>
		(onlyViews === undefined || onlyViews.includes(scenario.id)) &&
		(flags.area === undefined || flags.area === scenario.area),
);
const partial =
	onlyViews !== undefined ||
	flags.area !== undefined ||
	flags.shell !== undefined ||
	flags.theme !== undefined ||
	flags['no-probes'] === true;

function storageFor(app: App, fixture: string | undefined, theme: Theme): Record<string, string> {
	const themeStorage: Record<string, string> =
		app === 'legacy'
			? { 'nuxt-color-mode': theme }
			: { 'equreka.v1.settings': JSON.stringify({ theme, locale: 'en' }) };
	if (fixture === undefined) return themeStorage;
	const data = scenariosFile.fixtures[fixture];
	if (data === undefined) throw new Error(`unknown fixture "${fixture}"`);
	return { ...themeStorage, ...data[app] };
}

function readManifest(app: App, variantId: string): CaptureManifest {
	const file = join(config.outDir, app, `${variantId}.json`);
	try {
		return JSON.parse(readFileSync(file, 'utf8')) as CaptureManifest;
	} catch {
		return { app, variantId, url: '', notes: [], error: `no capture at ${file}`, regions: {} };
	}
}

function clearSheets(dir: string, variantId: string): void {
	for (const file of readdirSync(dir)) {
		if (file.startsWith(`${variantId}--`)) rmSync(join(dir, file), { force: true });
	}
}

function evaluate(
	scenario: Scenario,
	file: ScenariosFile,
	shell: ShellId,
	theme: Theme,
	variantId: string,
	legacy: CaptureManifest,
	current: CaptureManifest,
	writeImages: boolean,
): ScenarioResult {
	const mode = scenario.contentIdentical ? 'full' : 'chrome';
	const notes = [
		...(scenario.note === undefined ? [] : [scenario.note]),
		...legacy.notes.map((note) => `legacy ${note}`),
		...current.notes.map((note) => `current ${note}`),
	];
	const base = {
		id: variantId,
		view: scenario.id,
		shell,
		theme,
		area: scenario.area,
		mode,
	} as const;
	if (
		legacy.error !== undefined ||
		current.error !== undefined ||
		legacy.full === undefined ||
		current.full === undefined
	) {
		const errors = [
			legacy.error && `legacy: ${legacy.error}`,
			current.error && `current: ${current.error}`,
		];
		return {
			...base,
			diffPct: null,
			diffPctRuns: [],
			chromeDiffPct: null,
			regions: {},
			status: 'error',
			note: [...errors.filter(Boolean), ...notes].join('; '),
			sheets: [],
		};
	}
	const full = diffImages(
		readPng(legacy.full),
		readPng(current.full),
		thresholds.pixelmatchThreshold,
	);
	const names = new Set([
		...Object.keys(file.chrome.legacy[shell]),
		...Object.keys(file.chrome.current[shell]),
	]);
	const regionDiffs: RegionDiff[] = [];
	for (const name of names) {
		const left = legacy.regions[name];
		const right = current.regions[name];
		const region = diffRegion(
			name,
			left === undefined ? undefined : readPng(left),
			right === undefined ? undefined : readPng(right),
			thresholds.pixelmatchThreshold,
		);
		if (region !== undefined) regionDiffs.push(region);
	}
	const chromeDiff = regionDiffs.reduce((sum, region) => sum + region.diffPixels, 0);
	const chromeTotal = regionDiffs.reduce((sum, region) => sum + region.totalPixels, 0);
	const chromeDiffPct = chromeTotal === 0 ? null : percent(chromeDiff, chromeTotal);
	const fullDiffPct = percent(full.diffPixels, full.totalPixels);
	const diffPct = mode === 'full' ? fullDiffPct : chromeDiffPct;
	const regions: ScenarioResult['regions'] = {};
	for (const region of regionDiffs) {
		regions[region.name] =
			region.presence === 'both' ? percent(region.diffPixels, region.totalPixels) : region.presence;
		if (region.presence !== 'both')
			notes.push(`${region.name} region exists in ${region.presence}`);
	}
	if (mode === 'chrome') notes.push(`full-page diff ${fullDiffPct}% (informational)`);
	const sheets: string[] = [];
	if (writeImages) {
		const dir = join(config.outDir, 'sheets');
		clearSheets(dir, variantId);
		sheets.push(...writeSheets(dir, variantId, full, file.shells[shell].height));
		if (regionDiffs.some((region) => region.result !== undefined)) {
			sheets.push(writeRegionSheet(dir, variantId, regionDiffs));
		}
	}
	return {
		...base,
		diffPct,
		diffPctRuns: [],
		chromeDiffPct,
		regions,
		status: diffPct !== null && diffPct <= thresholds.scenarioMaxDiffPct ? 'pass' : 'fail',
		note: notes.join('; '),
		sheets,
	};
}

/**
 * The first request to a route in a fresh dev server or browser profile
 * renders differently from every later one (webpack lazy chunks, the
 * content API's first query, font and image caches). One untimed visit
 * per route makes the first measured capture equal to the second.
 */
async function warmUp(browser: Browser): Promise<void> {
	for (const app of ['legacy', 'current'] as const) {
		const routes = [...new Set(scenarios.map((scenario) => scenario[app].route))];
		const context = await newAppContext(browser, {
			app,
			baseUrl: baseUrls[app],
			shell: scenariosFile.shells.desktop,
			theme: 'light',
			storage: storageFor(app, undefined, 'light'),
			waivers,
			freeze: true,
			blocked,
		});
		try {
			const page = await context.newPage();
			for (const route of routes) {
				console.log(`[warm-up] ${app} ${route}`);
				await page.goto(`${baseUrls[app]}${route}`, { waitUntil: 'load', timeout: 90_000 });
				await settle(page);
			}
		} finally {
			await context.close();
		}
	}
}

async function main(): Promise<void> {
	for (const dir of ['legacy', 'current', 'sheets']) {
		mkdirSync(join(config.outDir, dir), { recursive: true });
	}
	const chromium = resolveChromium(config);
	const servers =
		flags['skip-capture'] && flags['no-probes']
			? { currentBuild: 'skip-capture', stop: () => {} }
			: await ensureServers(config, flags['skip-capture']);
	const browser = await launchBrowser(chromium.path);
	const results = new Map<string, ScenarioResult>();
	try {
		if (!flags['skip-capture']) await warmUp(browser);
		for (let run = 1; run <= runs; run += 1) {
			for (const scenario of scenarios) {
				for (const shell of shells) {
					for (const theme of themes) {
						const variantId = `${scenario.id}--${shell}-${theme}`;
						console.log(`[run ${run}/${runs}] ${variantId}`);
						const manifests = {} as Record<App, CaptureManifest>;
						for (const app of ['legacy', 'current'] as const) {
							manifests[app] = flags['skip-capture']
								? readManifest(app, variantId)
								: await captureVariant({
										browser,
										app,
										baseUrl: baseUrls[app],
										variantId,
										setup: scenario[app],
										shellId: shell,
										shell: scenariosFile.shells[shell],
										theme,
										storage: storageFor(app, scenario.fixture, theme),
										regions: scenariosFile.chrome[app][shell],
										waivers,
										outDir: config.outDir,
										blocked,
									});
						}
						const result = evaluate(
							scenario,
							scenariosFile,
							shell,
							theme,
							variantId,
							manifests.legacy,
							manifests.current,
							run === runs,
						);
						const previous = results.get(variantId)?.diffPctRuns ?? [];
						results.set(variantId, { ...result, diffPctRuns: [...previous, result.diffPct] });
						console.log(
							`  ${result.status} diff=${result.diffPct}% chrome=${result.chromeDiffPct}%`,
						);
					}
				}
			}
		}
		let probeRun: ProbeRun | undefined;
		if (!flags['no-probes']) {
			probeRun = await runProbes({
				browser,
				baseUrls,
				scenarios: scenariosFile,
				pages: probesFile.pages,
				probes: probesFile.probes,
				thresholds,
				waivers,
				storageFor,
				blocked,
				onProgress: (message) => console.log(message),
			});
		}
		const report = buildReport({
			scenarios: [...results.values()],
			probes: probeRun?.results,
			probeErrors: probeRun?.errors ?? [],
			partial,
			runs,
			chromium: `${chromium.build} (${chromium.path})`,
			currentBuild: servers.currentBuild,
			legacyUrl: config.legacyUrl,
			currentUrl: config.currentUrl,
			thresholds,
			waivers,
			blocked,
		});
		writeReport(config.outDir, report);
		console.log(report.summary);
		console.log(`report: ${join(config.outDir, 'report.md')}`);
		process.exitCode = report.pass ? 0 : 1;
	} finally {
		await browser.close();
		servers.stop();
	}
}

await main();
