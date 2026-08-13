import { expect, test } from '@playwright/test';

/**
 * The v1 offline gate (ADR 0002): one browser context installs the service
 * worker online, runtime-caches a single unit page, then goes offline and
 * must still serve (a) the visited page, (b) the offline reader for a
 * never-visited unit, (c) a fully working converter, (d) working search.
 */
test('offline-first PWA serves shell, reader, converter, and search', async ({ page, context }) => {
	await test.step('install service worker and precache online', async () => {
		await page.goto('/');
		await page.evaluate(async () => {
			await navigator.serviceWorker.ready;
		});
		await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
	});

	await test.step('visit /units/celsius/ once to runtime-cache it', async () => {
		await page.goto('/units/celsius/');
		await expect(page.getByRole('heading', { level: 1, name: 'Celsius' })).toBeVisible();
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
		await expect(
			page.getByText('base unit of temperature in the International System'),
		).toBeVisible();
	});

	await test.step('(c) converter works offline end to end', async () => {
		await page.goto('/converter/');
		await page.getByLabel('Magnitude', { exact: true }).selectOption('thermodynamic-temperature');
		await page.getByLabel('From', { exact: true }).selectOption('celsius');
		await page.getByLabel('To', { exact: true }).selectOption('fahrenheit');
		await page.getByLabel('Value', { exact: true }).fill('100');
		await expect(page.locator('strong')).toHaveText('212');
	});

	await test.step('(d) search finds Metre for "metro" offline', async () => {
		await page.goto('/search/');
		const main = page.locator('main');
		await main.getByLabel('Search the wiki').fill('metro');
		const metre = main.getByRole('link', { name: 'Metre', exact: true });
		await expect(metre).toBeVisible();
		await expect(metre).toHaveAttribute('href', '/units/metre/');
	});
});
