import { defineConfig } from '@playwright/test';

/**
 * Offline E2E gate (ADR 0002). Serves the already-built dist/ on a
 * dedicated port so a developer's `astro preview` on 4321 never collides;
 * chromium only — the offline contract is service-worker behavior, not
 * cross-browser rendering.
 */
export default defineConfig({
	testDir: './e2e',
	timeout: 60_000,
	forbidOnly: process.env.CI !== undefined,
	retries: 0,
	use: {
		baseURL: 'http://127.0.0.1:43210',
	},
	projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
	webServer: {
		command: 'node scripts/serve-dist.mjs 43210',
		url: 'http://127.0.0.1:43210/',
		reuseExistingServer: false,
	},
});
