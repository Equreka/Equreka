import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { equrekaAssets } from './src/integrations/equreka-assets';
import { equrekaPwa } from './src/integrations/equreka-pwa';

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
	},
});
