import { mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import type { Browser } from 'playwright-core';
import { launchBrowser, resolveChromium } from './browser.js';
import { type CaptureManifest, type CaptureRequest, captureVariant } from './capture.js';
import {
	APPS,
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
import { type DiffResult, diffImages, diffRegion, percent, type RegionDiff } from './diff.js';
import { readPng } from './image.js';
import { type ProbeRun, runProbes } from './probes.js';
import { buildReport, type Gate, type ScenarioResult, writeReport } from './report.js';
import { ensureServers } from './servers.js';
import { writeAboveFoldSheet, writeRegionSheet, writeSheets } from './sheets.js';
import { StabilityTracker } from './stability.js';

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

/**
 * What gates a scenario: the full page when the content is the same in
 * both apps; otherwise the chrome regions plus, unless the scenario
 * opts out with a reason, the above-the-fold band of the content.
 */
function gatesFor(scenario: Scenario): Gate[] {
	if (scenario.contentIdentical) return ['full'];
	return scenario.aboveFold?.gate === true ? ['chrome', 'aboveFold'] : ['chrome'];
}

function diffAboveFold(legacy: CaptureManifest, current: CaptureManifest): DiffResult | undefined {
	if (legacy.aboveFold === undefined || current.aboveFold === undefined) return undefined;
	return diffImages(
		readPng(legacy.aboveFold.file),
		readPng(current.aboveFold.file),
		thresholds.pixelmatchThreshold,
		[...legacy.aboveFold.masks, ...current.aboveFold.masks],
	);
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
	const gates = gatesFor(scenario);
	const notes = [
		...(scenario.note === undefined ? [] : [scenario.note]),
		...(scenario.aboveFold?.gate === false
			? [`aboveFold not gated: ${scenario.aboveFold.reason}`]
			: []),
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
		gates,
		diffPctRuns: [],
		aboveFoldPctRuns: [],
		fullPctRuns: [],
		unstable: [],
	} satisfies Partial<ScenarioResult>;
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
			chromeDiffPct: null,
			aboveFoldPct: null,
			aboveFoldMaskedPct: null,
			fullDiffPct: null,
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
	const aboveFold = diffAboveFold(legacy, current);
	const aboveFoldPct =
		aboveFold === undefined ? null : percent(aboveFold.diffPixels, aboveFold.totalPixels);
	const aboveFoldMaskedPct =
		aboveFold === undefined
			? null
			: percent(aboveFold.maskedPixels, aboveFold.totalPixels + aboveFold.maskedPixels);
	const diffPct = mode === 'full' ? fullDiffPct : chromeDiffPct;
	const regions: ScenarioResult['regions'] = {};
	for (const region of regionDiffs) {
		regions[region.name] =
			region.presence === 'both' ? percent(region.diffPixels, region.totalPixels) : region.presence;
		if (region.presence !== 'both')
			notes.push(`${region.name} region exists in ${region.presence}`);
	}
	const gatePasses: Record<Gate, boolean> = {
		full: fullDiffPct <= thresholds.scenarioMaxDiffPct,
		chrome: chromeDiffPct !== null && chromeDiffPct <= thresholds.scenarioMaxDiffPct,
		aboveFold: aboveFoldPct !== null && aboveFoldPct <= thresholds.aboveFoldMaxDiffPct,
	};
	const sheets: string[] = [];
	if (writeImages) {
		const dir = join(config.outDir, 'sheets');
		clearSheets(dir, variantId);
		sheets.push(...writeSheets(dir, variantId, full, file.shells[shell].height));
		if (regionDiffs.some((region) => region.result !== undefined)) {
			sheets.push(writeRegionSheet(dir, variantId, regionDiffs));
		}
		if (aboveFold !== undefined) sheets.push(writeAboveFoldSheet(dir, variantId, aboveFold));
	}
	return {
		...base,
		diffPct,
		chromeDiffPct,
		aboveFoldPct,
		aboveFoldMaskedPct,
		fullDiffPct,
		regions,
		status: gates.every((gate) => gatePasses[gate]) ? 'pass' : 'fail',
		note: notes.join('; '),
		sheets,
	};
}

function captureRequest(
	browser: Browser,
	app: App,
	scenario: Scenario,
	shell: ShellId,
	theme: Theme,
	outDir: string,
): CaptureRequest {
	return {
		browser,
		app,
		baseUrl: baseUrls[app],
		variantId: `${scenario.id}--${shell}-${theme}`,
		setup: scenario[app],
		shellId: shell,
		shell: scenariosFile.shells[shell],
		theme,
		storage: storageFor(app, scenario.fixture, theme),
		regions: scenariosFile.chrome[app][shell],
		aboveFold: {
			selector: scenariosFile.aboveFold[app],
			heightPx: scenariosFile.aboveFold.heightPx,
		},
		waivers,
		outDir,
		blocked,
	};
}

/**
 * One unmeasured capture of every variant, written to `warm-up/` and
 * discarded. The first request to a cold dev server or browser profile
 * renders differently (webpack lazy chunks, the content API's first
 * query, font and image caches), and a visit per route does not reach
 * what the setup steps load or the full-page screenshot at each page
 * size, so the first measured capture takes no code path for the first
 * time.
 */
async function warmUp(browser: Browser): Promise<void> {
	const outDir = join(config.outDir, 'warm-up');
	for (const app of APPS) mkdirSync(join(outDir, app), { recursive: true });
	for (const scenario of scenarios) {
		for (const shell of shells) {
			for (const theme of themes) {
				console.log(`[warm-up] ${scenario.id}--${shell}-${theme}`);
				for (const app of APPS) {
					await captureVariant(captureRequest(browser, app, scenario, shell, theme, outDir));
				}
			}
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
	const stability = new StabilityTracker(config.outDir);
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
								: await captureVariant(
										captureRequest(browser, app, scenario, shell, theme, config.outDir),
									);
							const { full, regions, aboveFold } = manifests[app];
							if (!flags['skip-capture'] && full !== undefined) {
								const files: Record<string, string> = { full };
								if (aboveFold !== undefined) files.aboveFold = aboveFold.file;
								for (const [name, file] of Object.entries(regions)) {
									if (file !== undefined) files[name] = file;
								}
								stability.observe(run, app, variantId, files);
							}
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
						const previous = results.get(variantId);
						results.set(variantId, {
							...result,
							diffPctRuns: [...(previous?.diffPctRuns ?? []), result.diffPct],
							aboveFoldPctRuns: [...(previous?.aboveFoldPctRuns ?? []), result.aboveFoldPct],
							fullPctRuns: [...(previous?.fullPctRuns ?? []), result.fullDiffPct],
							unstable: stability.unstableFor(variantId),
						});
						console.log(
							`  ${result.status} [gates ${result.gates.join('+')}] chrome=${result.chromeDiffPct}% aboveFold=${result.aboveFoldPct}% full=${result.fullDiffPct}%`,
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
