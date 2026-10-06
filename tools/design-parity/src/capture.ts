import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Browser, Locator, Page } from 'playwright-core';
import { newAppContext, scrollToTop, settle, sweepScroll } from './browser.js';
import type { App, PageSetup, Shell, ShellId, Theme, Waiver } from './config.js';
import { assertLoaded, FontLoadError, firstLine } from './errors.js';
import type { SkippedStep } from './failures.js';
import type { Box } from './stability.js';
import { runSteps } from './steps.js';

const MASK_COLOR = '#808080';
const NAVIGATION_TIMEOUT_MS = 90_000;
const FONT_LOAD_ATTEMPTS = 3;

export interface CaptureManifest {
	app: App;
	variantId: string;
	url: string;
	notes: string[];
	skipped: SkippedStep[];
	error?: string;
	full?: string;
	regions: Record<string, string | undefined>;
	aboveFold?: AboveFoldCapture;
}

/**
 * `masks` are in the crop's own coordinates, one entry per matched
 * element, so the diff can mask the union of both apps' boxes.
 */
export interface AboveFoldCapture {
	file: string;
	top: number;
	masks: Box[];
}

export interface AboveFoldRequest {
	selector: string;
	heightPx: number;
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
	aboveFold: AboveFoldRequest;
	waivers: readonly Waiver[];
	waived: readonly string[];
	outDir: string;
	blocked: Set<string>;
}

/**
 * The scenario's masks plus the regions its `legacy-flaw` waivers take
 * out. Each must match at least one element: a selector that matches
 * nothing is stale and would silently stop masking, so the capture fails.
 */
async function maskSelectors(page: Page, request: CaptureRequest): Promise<string[]> {
	const selectors = [...request.setup.masks.map(({ selector }) => selector), ...request.waived];
	for (const selector of selectors) {
		if ((await page.locator(selector).count()) === 0) {
			throw new Error(`mask ${selector} matches no element`);
		}
	}
	return selectors;
}

async function visibleBox(locator: Locator): Promise<boolean> {
	if ((await locator.count()) === 0 || !(await locator.isVisible())) return false;
	const box = await locator.boundingBox();
	return box !== null && box.width >= 1 && box.height >= 1;
}

/**
 * Chrome regions are shot with the page content invisible: the bottom
 * nav is translucent and fixed, so otherwise its pixels carry whatever
 * data lies beneath it, which differs between the apps and between
 * loads. The content masks are not passed to these shots either, since
 * Playwright paints a mask box even over an invisible element and the
 * box would land on the bottom nav.
 */
const HIDE_MAIN_CSS = 'main{opacity:0!important}';

/**
 * Shoots the band from the top of the main content down `heightPx`
 * CSS pixels at full viewport width, with every chrome region made
 * invisible (layout unchanged) so the band holds page content only, and
 * records the boxes of every mask and waived region inside that band.
 */
async function captureAboveFold(
	page: Page,
	request: CaptureRequest,
	masks: readonly string[],
	dir: string,
): Promise<AboveFoldCapture> {
	const chrome = Object.values(request.regions);
	if (chrome.length > 0) {
		await page.addStyleTag({ content: `${chrome.join(',')}{visibility:hidden!important}` });
	}
	await scrollToTop(page);
	const geometry = await page.evaluate(
		({ selector, masks }) => {
			const anchor = document.querySelector(selector);
			if (anchor === null) return null;
			const top = Math.round(anchor.getBoundingClientRect().top + window.scrollY);
			const boxes = masks.flatMap((mask) =>
				[...document.querySelectorAll(mask)].flatMap((element) => {
					const rect = element.getBoundingClientRect();
					if (rect.width < 1 || rect.height < 1) return [];
					const x = Math.floor(rect.left + window.scrollX);
					const y = Math.floor(rect.top + window.scrollY) - top;
					return [
						{
							x,
							y,
							width: Math.ceil(rect.right + window.scrollX) - x,
							height: Math.ceil(rect.bottom + window.scrollY) - top - y,
						},
					];
				}),
			);
			return { top, pageHeight: document.documentElement.scrollHeight, boxes };
		},
		{ selector: request.aboveFold.selector, masks },
	);
	if (geometry === null) throw new Error(`aboveFold anchor ${request.aboveFold.selector} missing`);
	const file = join(dir, `${request.variantId}--above-fold.png`);
	await page.screenshot({
		path: file,
		fullPage: true,
		clip: {
			x: 0,
			y: geometry.top,
			width: request.shell.width,
			height: Math.max(1, Math.min(request.aboveFold.heightPx, geometry.pageHeight - geometry.top)),
		},
		animations: 'disabled',
		caret: 'hide',
		scale: 'css',
	});
	return { file, top: geometry.top, masks: geometry.boxes };
}

/**
 * Loads one side of one scenario variant and writes its full-page PNG,
 * one PNG per chrome region, the above-the-fold band and a manifest.
 * A capture whose web fonts failed to load is retried in a fresh
 * context, and each retry is recorded as a note.
 */
export async function captureVariant(request: CaptureRequest): Promise<CaptureManifest> {
	const retries: string[] = [];
	for (let attempt = 1; ; attempt += 1) {
		const { manifest, fontFault } = await captureOnce(request);
		if (!fontFault || attempt === FONT_LOAD_ATTEMPTS) {
			const result = { ...manifest, notes: [...retries, ...manifest.notes] };
			writeFileSync(
				join(request.outDir, request.app, `${request.variantId}.json`),
				`${JSON.stringify(result, null, '\t')}\n`,
			);
			return result;
		}
		retries.push(`retried after attempt ${attempt}: ${manifest.error}`);
	}
}

/**
 * One attempt. Absent regions delete any stale PNG so a later diff
 * never reads a previous run's file.
 */
async function captureOnce(
	request: CaptureRequest,
): Promise<{ manifest: CaptureManifest; fontFault: boolean }> {
	let fontFault = false;
	const dir = join(request.outDir, request.app);
	const url = `${request.baseUrl}${request.setup.route}`;
	const manifest: CaptureManifest = {
		app: request.app,
		variantId: request.variantId,
		url,
		notes: [],
		skipped: [],
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
		await sweepScroll(page);
		manifest.skipped = await runSteps(page, request.setup.steps, request.shellId);
		await scrollToTop(page);
		const masks = await maskSelectors(page, request);
		const mask = masks.map((selector) => page.locator(selector));
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
		const hideMain = await page.addStyleTag({ content: HIDE_MAIN_CSS });
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
			});
			manifest.regions[name] = file;
		}
		await hideMain.evaluate((element) => element.parentNode?.removeChild(element));
		manifest.aboveFold = await captureAboveFold(page, request, masks, dir);
	} catch (error) {
		manifest.error = firstLine(error);
		fontFault = error instanceof FontLoadError;
	} finally {
		await context.close();
	}
	return { manifest, fontFault };
}
