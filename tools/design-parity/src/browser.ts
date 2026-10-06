import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { type Browser, type BrowserContext, chromium, type Page } from 'playwright-core';
import type { App, RuntimeConfig, Shell, Theme, Waiver } from './config.js';
import { FontLoadError } from './errors.js';

const CHROMIUM_BUILDS = ['1243', '1208'] as const;
const CHROMIUM_EXECUTABLES = [
	join('chrome-win64', 'chrome.exe'),
	join('chrome-win', 'chrome.exe'),
	join('chrome-linux', 'chrome'),
	join('chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
] as const;

const SETTLE_QUIET_MS = 500;
const SETTLE_MAX_MS = 15_000;
const FONT_HOST = 'https://fonts.gstatic.com/design-parity/';

/**
 * tsx compiles with esbuild keepNames, which wraps named functions in a
 * `__name` helper that does not exist in the page. Functions serialized
 * into the page (init scripts, evaluate callbacks) need this identity
 * shim registered first, as raw source that esbuild never touches.
 */
const KEEP_NAMES_SHIM = 'globalThis.__name = globalThis.__name || ((target) => target);';

/**
 * Collapses every animation and transition to its end state instead of
 * removing it: legacy reveals (the MathJax card starts at scaleY(0))
 * only reach their visible state through `animation-fill-mode: forwards`.
 * Backdrop filters are dropped because Chromium's software compositor
 * rasterizes blur with run-to-run noise (measured: about 1,000 pixels
 * per acrylic surface off by 1 to 18 levels between identical loads);
 * the backdrop-filter value itself is compared exactly by the probes.
 */
const FREEZE_CSS = `*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:0s!important;transition-delay:0s!important;caret-color:transparent!important;scroll-behavior:auto!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}#nuxt-loading,.nuxt-loading-indicator,.nuxt__build_indicator{display:none!important}`;

export interface ResolvedChromium {
	path: string;
	build: string;
}

export function resolveChromium(config: RuntimeConfig): ResolvedChromium {
	if (config.chromiumPath !== undefined) {
		return { path: config.chromiumPath, build: 'PARITY_CHROMIUM' };
	}
	const cacheRoot =
		process.env.PLAYWRIGHT_BROWSERS_PATH ??
		(process.env.LOCALAPPDATA === undefined
			? undefined
			: join(process.env.LOCALAPPDATA, 'ms-playwright'));
	if (cacheRoot !== undefined) {
		for (const build of CHROMIUM_BUILDS) {
			for (const executable of CHROMIUM_EXECUTABLES) {
				const path = join(cacheRoot, `chromium-${build}`, executable);
				if (existsSync(path)) return { path, build };
			}
		}
	}
	throw new Error(
		`no Chromium build ${CHROMIUM_BUILDS.join(' or ')} in the ms-playwright cache; set PARITY_CHROMIUM`,
	);
}

export async function launchBrowser(chromiumPath: string): Promise<Browser> {
	return chromium.launch({ executablePath: chromiumPath, args: ['--font-render-hinting=none'] });
}

/**
 * The legacy app requests Poppins 500/600 from Google Fonts. The same
 * Google-sourced files ship in @fontsource/poppins (the package the new
 * app self-hosts), so the stylesheet and font requests are answered
 * locally: captures stay offline and both apps render identical glyphs.
 */
function poppinsStylesheet(): string {
	const require = createRequire(import.meta.url);
	const root = dirname(require.resolve('@fontsource/poppins/package.json'));
	return ['500', '600']
		.map((weight) => readFileSync(join(root, `${weight}.css`), 'utf8'))
		.join('\n')
		.replaceAll('url(./files/', `url(${FONT_HOST}`);
}

function fontFile(name: string): Buffer {
	const require = createRequire(import.meta.url);
	const root = dirname(require.resolve('@fontsource/poppins/package.json'));
	return readFileSync(join(root, 'files', name));
}

const LEGACY_CONTENT_API = '/api/';

/**
 * The original fills list pages from parallel `$content` queries and
 * keys its result object in the order the responses land, so the
 * category order of `/units` changed between identical loads (measured:
 * Physics and Chemistry swapped in 1 of 10 runs). Answering the content
 * API strictly in request order yields the authored order every time.
 */
async function serializeLegacyContentApi(context: BrowserContext): Promise<void> {
	let queue: Promise<unknown> = Promise.resolve();
	await context.route(
		(url) => url.pathname.startsWith(LEGACY_CONTENT_API),
		async (route) => {
			const response = route.fetch();
			response.catch(() => undefined);
			const turn = queue.then(async () => route.fulfill({ response: await response }));
			queue = turn.catch(() => undefined);
			try {
				await turn;
			} catch {
				await route.abort('failed').catch(() => undefined);
			}
		},
	);
}

export interface ContextOptions {
	app: App;
	baseUrl: string;
	shell: Shell;
	theme: Theme;
	storage: Record<string, string>;
	waivers: readonly Waiver[];
	freeze: boolean;
	blocked: Set<string>;
}

function hideCss(app: App, waivers: readonly Waiver[]): string {
	return waivers
		.flatMap((waiver) => (waiver.kind === 'hide' && waiver.app === app ? [waiver.selector] : []))
		.map((selector) => `${selector}{display:none!important}`)
		.join('');
}

export async function newAppContext(
	browser: Browser,
	options: ContextOptions,
): Promise<BrowserContext> {
	const { app, baseUrl, shell, theme } = options;
	const context = await browser.newContext({
		viewport: { width: shell.width, height: shell.height },
		screen: { width: shell.width, height: shell.height },
		deviceScaleFactor: 1,
		isMobile: shell.isMobile,
		hasTouch: shell.isMobile,
		userAgent: shell.userAgent[app],
		colorScheme: theme,
		reducedMotion: options.freeze ? 'reduce' : 'no-preference',
		locale: 'en-US',
		timezoneId: 'UTC',
		serviceWorkers: 'block',
	});
	if (app === 'legacy') {
		await context.addCookies([{ name: 'equreka-settings-lang', value: 'en', url: baseUrl }]);
	}
	const fonts = poppinsStylesheet();
	await context.route(
		(url) => url.hostname !== '127.0.0.1' && url.hostname !== 'localhost',
		async (route) => {
			const url = new URL(route.request().url());
			if (url.hostname === 'fonts.googleapis.com') {
				await route.fulfill({ status: 200, contentType: 'text/css', body: fonts });
				return;
			}
			if (url.href.startsWith(FONT_HOST)) {
				const name = url.pathname.split('/').pop() ?? '';
				await route.fulfill({
					status: 200,
					contentType: name.endsWith('.woff') ? 'font/woff' : 'font/woff2',
					headers: { 'access-control-allow-origin': '*' },
					body: fontFile(name),
				});
				return;
			}
			options.blocked.add(`${app}: ${url.origin}${url.pathname}`);
			await route.abort('blockedbyclient');
		},
	);
	if (app === 'legacy') await serializeLegacyContentApi(context);
	await context.addInitScript({ content: KEEP_NAMES_SHIM });
	const css = (options.freeze ? FREEZE_CSS : '') + hideCss(app, options.waivers);
	await context.addInitScript(
		({ storage, css }) => {
			try {
				if (sessionStorage.getItem('design-parity-seeded') === null) {
					for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value);
					sessionStorage.setItem('design-parity-seeded', '1');
				}
			} catch {}
			if (css === '') return;
			const inject = () => {
				const style = document.createElement('style');
				style.dataset.designParity = '';
				style.textContent = css;
				(document.head ?? document.documentElement).append(style);
			};
			if (document.documentElement === null) {
				document.addEventListener('DOMContentLoaded', inject, { once: true });
			} else {
				inject();
			}
		},
		{ storage: options.storage, css },
	);
	return context;
}

/**
 * Waits for web fonts, decoded images, MathJax typesetting and a DOM
 * with no mutations for SETTLE_QUIET_MS, the union of every signal
 * either app gives that its first paint is final. Every declared font
 * face is loaded explicitly at the end, because `document.fonts.ready`
 * only covers loads already started, and a face that failed is an
 * error: a capture in the fallback font is not a measurement.
 */
export async function settle(page: Page): Promise<void> {
	const failedFonts = await page.evaluate(
		async ({ quietMs, maxMs }) => {
			await document.fonts.ready;
			const mathJax = (
				window as unknown as { MathJax?: { startup?: { promise?: Promise<unknown> } } }
			).MathJax;
			if (mathJax?.startup?.promise !== undefined) await mathJax.startup.promise;
			await Promise.all(
				[...document.images].map((image) =>
					image.complete ? undefined : image.decode().catch(() => undefined),
				),
			);
			await new Promise<void>((resolve) => {
				let timer: ReturnType<typeof setTimeout> | undefined;
				const observer = new MutationObserver(() => {
					clearTimeout(timer);
					timer = setTimeout(done, quietMs);
				});
				function done() {
					observer.disconnect();
					clearTimeout(timer);
					resolve();
				}
				observer.observe(document, {
					subtree: true,
					childList: true,
					attributes: true,
					characterData: true,
				});
				timer = setTimeout(done, quietMs);
				setTimeout(done, maxMs);
			});
			await document.fonts.ready;
			const faces = [...document.fonts];
			await Promise.all(faces.map((face) => face.load().catch(() => undefined)));
			return faces
				.filter((face) => face.status === 'error')
				.map((face) => `${face.family} ${face.weight} ${face.style} ${face.unicodeRange}`);
		},
		{ quietMs: SETTLE_QUIET_MS, maxMs: SETTLE_MAX_MS },
	);
	if (failedFonts.length > 0) {
		throw new FontLoadError(`web fonts failed to load: ${failedFonts.join('; ')}`);
	}
}

/**
 * Scrolls the whole page one viewport at a time and back to the top.
 * The port hydrates islands on visibility and both apps lazy-load
 * images, so without this sweep the first region screenshot that
 * scrolled them into view grew the page mid-capture (measured: the
 * footer shot of /units/metre landed on the half-hydrated converter in
 * 1 of 10 runs). The page also ends at scroll 0, because fixed elements
 * are painted at the current scroll offset in a full-page screenshot.
 */
export async function sweepScroll(page: Page): Promise<void> {
	await page.evaluate(async () => {
		const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
		for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight) {
			window.scrollTo(0, y);
			await frame();
			await frame();
		}
		window.scrollTo(0, document.documentElement.scrollHeight);
		await frame();
		window.scrollTo(0, 0);
		await frame();
	});
	await settle(page);
}

export async function scrollToTop(page: Page): Promise<void> {
	await page.evaluate(async () => {
		window.scrollTo(0, 0);
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
	});
}
