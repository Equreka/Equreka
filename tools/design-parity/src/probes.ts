import type { Browser, Page } from 'playwright-core';
import { newAppContext, settle } from './browser.js';
import { MISSING, probeWaiver, valuesMatch } from './compare.js';
import type {
	App,
	PageSetup,
	Probe,
	ScenariosFile,
	ShellId,
	Theme,
	Thresholds,
	Waiver,
} from './config.js';
import { assertLoaded, firstLine } from './errors.js';
import { skippedStepFailures } from './failures.js';
import { runSteps } from './steps.js';

const NAVIGATION_TIMEOUT_MS = 90_000;
const HOVER_SETTLE_MS = 700;
const GEOMETRY = new Set(['height', 'width']);

export interface ProbeResult {
	area: string;
	probe: string;
	property: string;
	shell: ShellId;
	theme: Theme;
	legacy: string;
	current: string;
	match: boolean;
	waived?: string;
}

export interface ProbeRun {
	results: ProbeResult[];
	errors: string[];
}

export interface ProbeRequest {
	browser: Browser;
	baseUrls: Record<App, string>;
	scenarios: ScenariosFile;
	pages: Record<string, { legacy: PageSetup; current: PageSetup }>;
	probes: readonly Probe[];
	thresholds: Thresholds;
	waivers: readonly Waiver[];
	storageFor: (app: App, fixture: string | undefined, theme: Theme) => Record<string, string>;
	blocked: Set<string>;
	onProgress: (message: string) => void;
}

/**
 * Reads computed styles in a document without any freeze CSS and with
 * reduced motion off, so transitions report their authored values.
 * Width and height come from the layout box, every other property from
 * getComputedStyle.
 */
async function readStyles(
	page: Page,
	selector: string,
	properties: readonly string[],
	hover: boolean,
): Promise<Record<string, string>> {
	const locator = page.locator(selector).first();
	if ((await locator.count()) === 0) {
		return Object.fromEntries(properties.map((property) => [property, MISSING]));
	}
	if (hover) {
		try {
			await locator.hover({ timeout: 5_000 });
			await page.waitForTimeout(HOVER_SETTLE_MS);
		} catch {
			return Object.fromEntries(properties.map((property) => [property, MISSING]));
		}
	}
	return locator.evaluate(
		(element, { properties, geometry }) => {
			const style = getComputedStyle(element);
			const box = element.getBoundingClientRect();
			const values: Record<string, string> = {};
			for (const property of properties) {
				if (geometry.includes(property)) {
					const size = property === 'height' ? box.height : box.width;
					values[property] = `${Math.round(size * 100) / 100}px`;
				} else {
					values[property] = style.getPropertyValue(property);
				}
			}
			return values;
		},
		{ properties, geometry: [...GEOMETRY] },
	);
}

function setupFor(
	request: ProbeRequest,
	pageId: string,
	app: App,
): PageSetup & { fixture?: string } {
	const scenario = request.scenarios.scenarios.find((candidate) => candidate.id === pageId);
	if (scenario !== undefined) {
		return scenario.fixture === undefined
			? scenario[app]
			: { ...scenario[app], fixture: scenario.fixture };
	}
	const page = request.pages[pageId];
	if (page === undefined)
		throw new Error(`probe page "${pageId}" is neither a scenario nor a probe page`);
	return page[app];
}

async function collect(
	request: ProbeRequest,
	app: App,
	pageId: string,
	shellId: ShellId,
	theme: Theme,
	probes: readonly Probe[],
): Promise<Map<string, Record<string, string>>> {
	const setup = setupFor(request, pageId, app);
	const shell = request.scenarios.shells[shellId];
	const context = await newAppContext(request.browser, {
		app,
		baseUrl: request.baseUrls[app],
		shell,
		theme,
		storage: request.storageFor(app, setup.fixture, theme),
		waivers: request.waivers,
		freeze: false,
		blocked: request.blocked,
	});
	const values = new Map<string, Record<string, string>>();
	try {
		const page = await context.newPage();
		const response = await page.goto(`${request.baseUrls[app]}${setup.route}`, {
			waitUntil: 'load',
			timeout: NAVIGATION_TIMEOUT_MS,
		});
		assertLoaded(response, setup.route);
		await settle(page);
		const skipped = await runSteps(page, setup.steps, shellId);
		const failures = skippedStepFailures(app, skipped);
		if (failures.length > 0) throw new Error(failures.join('; '));
		const ordered = [...probes].sort(
			(a, b) => Number(a.state === 'hover') - Number(b.state === 'hover'),
		);
		for (const probe of ordered) {
			values.set(
				probe.probe,
				await readStyles(page, probe[app], probe.properties, probe.state === 'hover'),
			);
		}
	} finally {
		await context.close();
	}
	return values;
}

export async function runProbes(request: ProbeRequest): Promise<ProbeRun> {
	const results: ProbeResult[] = [];
	const errors: string[] = [];
	const groups = new Map<string, { pageId: string; shellId: ShellId; probes: Probe[] }>();
	for (const probe of request.probes) {
		for (const shellId of probe.shells) {
			const key = `${probe.page}|${shellId}`;
			const group = groups.get(key) ?? { pageId: probe.page, shellId, probes: [] };
			group.probes.push(probe);
			groups.set(key, group);
		}
	}
	for (const theme of request.scenarios.themes) {
		for (const { pageId, shellId, probes } of groups.values()) {
			request.onProgress(`probes ${pageId} ${shellId} ${theme}`);
			try {
				const legacy = await collect(request, 'legacy', pageId, shellId, theme, probes);
				const current = await collect(request, 'current', pageId, shellId, theme, probes);
				for (const probe of probes) {
					for (const property of probe.properties) {
						const left = legacy.get(probe.probe)?.[property] ?? MISSING;
						const right = current.get(probe.probe)?.[property] ?? MISSING;
						const match = valuesMatch(property, left, right, request.thresholds);
						const waiver = match ? undefined : probeWaiver(request.waivers, probe.probe, property);
						results.push({
							area: probe.area,
							probe: probe.probe,
							property,
							shell: shellId,
							theme,
							legacy: left,
							current: right,
							match,
							...(waiver === undefined ? {} : { waived: waiver.reason }),
						});
					}
				}
			} catch (error) {
				errors.push(`${pageId} ${shellId} ${theme}: ${firstLine(error)}`);
			}
		}
	}
	return { results, errors };
}
