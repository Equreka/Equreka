import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Browser, Locator } from 'playwright-core';
import { newAppContext, settle } from './browser.js';
import type { App, PageSetup, Shell, ShellId, Theme, Waiver } from './config.js';
import { assertLoaded, firstLine } from './errors.js';
import { runSteps } from './steps.js';

const MASK_COLOR = '#808080';
const NAVIGATION_TIMEOUT_MS = 90_000;

export interface CaptureManifest {
	app: App;
	variantId: string;
	url: string;
	notes: string[];
	error?: string;
	full?: string;
	regions: Record<string, string | undefined>;
}

export interface CaptureRequest {
	browser: Browser;
	app: App;
	baseUrl: string;
	variantId: string;
	setup: PageSetup;
	shellId: ShellId;
	shell: Shell;
	theme: Theme;
	storage: Record<string, string>;
	regions: Record<string, string>;
	waivers: readonly Waiver[];
	outDir: string;
	blocked: Set<string>;
}

async function visibleBox(locator: Locator): Promise<boolean> {
	if ((await locator.count()) === 0 || !(await locator.isVisible())) return false;
	const box = await locator.boundingBox();
	return box !== null && box.width >= 1 && box.height >= 1;
}

/**
 * Loads one side of one scenario variant and writes its full-page PNG,
 * one PNG per chrome region and a manifest. Absent regions delete any
 * stale PNG so a later diff never reads a previous run's file.
 */
export async function captureVariant(request: CaptureRequest): Promise<CaptureManifest> {
	const dir = join(request.outDir, request.app);
	const url = `${request.baseUrl}${request.setup.route}`;
	const manifest: CaptureManifest = {
		app: request.app,
		variantId: request.variantId,
		url,
		notes: [],
		regions: {},
	};
	const context = await newAppContext(request.browser, {
		app: request.app,
		baseUrl: request.baseUrl,
		shell: request.shell,
		theme: request.theme,
		storage: request.storage,
		waivers: request.waivers,
		freeze: true,
		blocked: request.blocked,
	});
	try {
		const page = await context.newPage();
		const response = await page.goto(url, { waitUntil: 'load', timeout: NAVIGATION_TIMEOUT_MS });
		assertLoaded(response, url);
		await settle(page);
		manifest.notes.push(...(await runSteps(page, request.setup.steps, request.shellId)));
		const mask = request.setup.masks.map((selector) => page.locator(selector));
		const full = join(dir, `${request.variantId}.png`);
		await page.screenshot({
			path: full,
			fullPage: true,
			animations: 'disabled',
			caret: 'hide',
			scale: 'css',
			mask,
			maskColor: MASK_COLOR,
		});
		manifest.full = full;
		for (const [name, selector] of Object.entries(request.regions)) {
			const file = join(dir, `${request.variantId}--${name}.png`);
			const locator = page.locator(selector).first();
			if (!(await visibleBox(locator))) {
				rmSync(file, { force: true });
				manifest.regions[name] = undefined;
				continue;
			}
			await locator.screenshot({
				path: file,
				animations: 'disabled',
				caret: 'hide',
				scale: 'css',
				mask,
				maskColor: MASK_COLOR,
			});
			manifest.regions[name] = file;
		}
	} catch (error) {
		manifest.error = firstLine(error);
	} finally {
		await context.close();
	}
	writeFileSync(
		join(dir, `${request.variantId}.json`),
		`${JSON.stringify(manifest, null, '\t')}\n`,
	);
	return manifest;
}
