import { tokens } from '@equreka/tokens';
import { expect, test } from '@playwright/test';

/**
 * The Tailwind degradation-floor gate (ADR 0002): Safari 15-class engines
 * must render legibly. Playwright cannot run a 2021 WebKit, so the honest
 * v1 proxy is zero-JS legibility — with JavaScript disabled, an entry page
 * must still serve its title, description prose, and engine-computed
 * conversion values as plain HTML, and the body must carry a token
 * background through the no-JS prefers-color-scheme fallback (theme.css
 * media query — data-theme is never set without JS). A BrowserStack pass
 * on real Safari 15 remains a documented manual step before release.
 */
function hexToRgb(hex: string): string {
	const value = Number.parseInt(hex.slice(1), 16);
	return `rgb(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255})`;
}

test.describe('zero-JS degradation floor', () => {
	test.use({ javaScriptEnabled: false });

	test('unit page is fully legible without JavaScript', async ({ page }) => {
		await page.goto('/units/celsius/');

		await expect(page.getByRole('heading', { level: 1, name: 'Celsius' })).toBeVisible();
		await expect(
			page.getByText('unit of temperature on the Celsius scale', { exact: false }),
		).toBeVisible();

		const table = page.getByRole('table').first();
		await expect(table.getByRole('link', { name: 'Fahrenheit' })).toBeVisible();
		await expect(table.getByRole('cell', { name: /33\.8/ })).toBeVisible();
		await expect(table.getByRole('link', { name: 'Kelvin' })).toBeVisible();
		await expect(table.getByRole('cell', { name: /274\.15/ })).toBeVisible();
	});

	test('body background is the light token without JS', async ({ page }) => {
		await page.goto('/units/celsius/');
		const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
		expect(background).toBe(hexToRgb(tokens.color.bg.light));
	});
});

test.describe('zero-JS degradation floor (dark scheme)', () => {
	test.use({ javaScriptEnabled: false, colorScheme: 'dark' });

	test('prefers-color-scheme picks the dark tokens without JS', async ({ page }) => {
		await page.goto('/units/celsius/');
		const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
		expect(background).toBe(hexToRgb(tokens.color.bg.dark));
	});
});
