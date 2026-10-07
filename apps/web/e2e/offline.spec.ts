import { expect, type Page, test } from '@playwright/test';

/**
 * Entry count of each locale's service-worker data cache (ADR 0013), keyed
 * by locale; a complete locale holds five payloads.
 */
async function dataCacheEntries(page: Page): Promise<Record<string, number>> {
	return page.evaluate(async () => {
		const entries: Record<string, number> = {};
		for (const name of await caches.keys()) {
			const locale = /^equreka-data-(.+)-[0-9a-f]+$/.exec(name)?.[1];
			if (locale !== undefined) {
				entries[locale] = (await (await caches.open(name)).keys()).length;
			}
		}
		return entries;
	});
}

async function installOnline(page: Page, path: string): Promise<void> {
	await page.goto(path);
	await page.evaluate(async () => {
		await navigator.serviceWorker.ready;
	});
	await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}

/**
 * The v1 offline gate (ADR 0002): one browser context installs the service
 * worker online, runtime-caches a single unit page, then goes offline and
 * must still serve (a) the visited page, (b) the offline reader for a
 * never-visited unit and (b2) a never-visited equation, (c) a fully working
 * converter, (d) working search, (e) a visited learning path whose step
 * progress persists across an offline reload, (f) the reader outline for a
 * never-visited path.
 */
test('offline-first PWA serves shell, reader, converter, and search', async ({ page, context }) => {
	await test.step('install service worker and precache online', async () => {
		await installOnline(page, '/');
	});

	await test.step('install caches the data of the active locale only', async () => {
		expect(await dataCacheEntries(page)).toEqual({ en: 5 });
	});

	await test.step('visit /units/celsius/ once to runtime-cache it', async () => {
		await page.goto('/units/celsius/');
		await expect(page.getByRole('heading', { level: 1, name: 'Celsius' })).toBeVisible();
	});

	await test.step('visit /paths/si-base-units/ once to runtime-cache it', async () => {
		await page.goto('/paths/si-base-units/');
		await expect(
			page.getByRole('heading', { level: 1, name: 'The seven SI base units' }),
		).toBeVisible();
	});

	await test.step('entry page shows the dormant path bar only with ?path=&step=', async () => {
		await page.goto('/units/metre/?path=si-base-units&step=metre');
		const bar = page.getByRole('complementary', { name: 'The seven SI base units' });
		await expect(bar).toBeVisible();
		await expect(bar.getByText('Step 3 of 12')).toBeVisible();
		await expect(bar.getByRole('link', { name: /Next step/ })).toHaveAttribute(
			'href',
			'/units/kilogram/?path=si-base-units&step=kilogram',
		);
		await page.goto('/units/metre/');
		await expect(page.getByRole('heading', { level: 1, name: 'Metre' })).toBeVisible();
		await expect(page.getByRole('complementary')).toHaveCount(0);
	});

	await context.setOffline(true);

	await test.step('(a) visited unit page renders offline with conversion table', async () => {
		await page.goto('/units/celsius/');
		await expect(page.getByRole('heading', { level: 1, name: 'Celsius' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Conversions' })).toBeVisible();
		await expect(page.getByRole('table').getByRole('link', { name: 'Fahrenheit' })).toBeVisible();
	});

	await test.step('(b) never-visited unit lands on the offline reader with its data', async () => {
		await page.goto('/units/kelvin/');
		await expect(page.getByRole('heading', { level: 1, name: "You're offline" })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Kelvin' })).toBeVisible();
		await expect(page.getByText('SI base unit of thermodynamic temperature')).toBeVisible();
	});

	await test.step('(b2) never-visited equation lands on the offline reader with its name', async () => {
		await page.goto('/equations/mass-energy-equivalence/');
		await expect(page.getByRole('heading', { level: 1, name: "You're offline" })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Mass-energy equivalence' })).toBeVisible();
	});

	await test.step('(c) converter works offline end to end', async () => {
		await page.goto('/converter/');
		await page.getByLabel('Magnitude', { exact: true }).selectOption('thermodynamic-temperature');
		await page.getByLabel('From', { exact: true }).selectOption('celsius');
		await page.getByLabel('To', { exact: true }).selectOption('fahrenheit');
		await page.getByLabel('Value', { exact: true }).fill('100');
		await expect(page.locator('strong')).toHaveText('212');
	});

	await test.step('(e) visited path renders offline; marking a step done survives reload', async () => {
		await page.goto('/paths/si-base-units/');
		await expect(
			page.getByRole('heading', { level: 1, name: 'The seven SI base units' }),
		).toBeVisible();
		const toggle = page.locator('[data-step-toggle="metre"]');
		await expect(toggle).not.toBeChecked();
		await toggle.check();
		await expect(toggle).toBeChecked();
		await expect(page.getByText('1 of 12 steps done')).toBeVisible();
		await page.reload();
		await expect(page.locator('[data-step-toggle="metre"]')).toBeChecked();
		await expect(page.getByText('1 of 12 steps done')).toBeVisible();
		expect(await page.evaluate(() => localStorage.getItem('equreka.v1.path-progress'))).toBe(
			JSON.stringify({ 'si-base-units': ['metre'] }),
		);
	});

	await test.step('(f) never-visited path lands on the offline reader with its outline', async () => {
		await page.goto('/paths/temperature-scales/');
		await expect(page.getByRole('heading', { level: 1, name: "You're offline" })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Temperature scales' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Steps' })).toBeVisible();
		await expect(page.getByRole('listitem').filter({ hasText: 'Fahrenheit (°F)' })).toBeVisible();
	});

	await test.step('(d) search finds Metre for its alias "meter" offline', async () => {
		await page.goto('/search/');
		const main = page.locator('main');
		await main.getByLabel('Search the wiki').fill('meter');
		await expect(main.getByRole('link', { name: /^Metre\b/ }).first()).toHaveAttribute(
			'href',
			'/units/metre/',
		);
	});
});

/**
 * The locale-switch contract (ADR 0013): a worker installed from an English
 * page caches no Spanish data, so a Spanish entry opened offline lands on
 * the Spanish reader with its unavailable message, never a broken page. One
 * online visit to the Spanish tree caches that locale; from then on the
 * Spanish reader and search work offline, and English still does.
 */
test('a locale switch caches that locale online and degrades offline before it', async ({
	page,
	context,
}) => {
	await test.step('install from the English tree', async () => {
		await installOnline(page, '/');
		expect(await dataCacheEntries(page)).toEqual({ en: 5 });
	});

	await context.setOffline(true);

	await test.step('a Spanish entry offline shows the unavailable message', async () => {
		await page.goto('/es/units/kelvin/');
		await expect(page.getByRole('heading', { level: 1, name: 'Sin conexión' })).toBeVisible();
		await expect(page.getByRole('alert')).toHaveText(
			'La biblioteca sin conexión no está disponible. Conéctate y recarga una vez para guardarla.',
		);
	});

	await context.setOffline(false);

	await test.step('one online visit to the Spanish tree caches its data', async () => {
		await page.goto('/es/');
		await expect.poll(async () => (await dataCacheEntries(page)).es).toBe(5);
		expect((await dataCacheEntries(page)).en).toBe(5);
	});

	await context.setOffline(true);

	await test.step('the Spanish reader serves a never-visited entry offline', async () => {
		await page.goto('/es/units/kelvin/');
		await expect(page.getByRole('heading', { level: 1, name: 'Sin conexión' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Kelvin' })).toBeVisible();
		await expect(page.getByText('unidad básica SI de temperatura termodinámica')).toBeVisible();
	});

	await test.step('Spanish search works offline', async () => {
		await page.goto('/es/search/');
		const main = page.locator('main');
		await main.getByLabel('Buscar en la wiki').fill('metro');
		await expect(main.getByRole('link', { name: /^Metro\b/ }).first()).toHaveAttribute(
			'href',
			'/es/units/metre/',
		);
	});

	await test.step('the English reader still works offline', async () => {
		await page.goto('/units/kelvin/');
		await expect(page.getByRole('heading', { name: 'Kelvin' })).toBeVisible();
		await expect(page.getByText('SI base unit of thermodynamic temperature')).toBeVisible();
	});
});
