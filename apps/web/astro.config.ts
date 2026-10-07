import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { BROWSER_TARGETS } from './src/integrations/browser-targets';
import { equrekaAssets } from './src/integrations/equreka-assets';
import { equrekaPwa } from './src/integrations/equreka-pwa';

/**
 * Vite's Lightning CSS minifier lowers CSS for `build.cssTarget`. Its
 * default target (Safari 16.4) dropped `-webkit-backdrop-filter`, which
 * Safari needs until 18; the ADR 0002 floor is Safari 15, so the targets
 * name it explicitly.
 */
const CSS_TARGET = [...BROWSER_TARGETS];

export default defineConfig({
	site: 'https://equreka.com',
	i18n: {
		defaultLocale: 'en',
		locales: ['en', 'es'],
		routing: { prefixDefaultLocale: false },
	},
	integrations: [
		react(),
		sitemap({
			i18n: { defaultLocale: 'en', locales: { en: 'en', es: 'es' } },
			filter: (page) => !page.includes('/offline/'),
		}),
		equrekaAssets(),
		equrekaPwa(),
	],
	vite: {
		plugins: [tailwindcss()],
		build: { cssTarget: CSS_TARGET },
	},
});
