import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { equrekaAssets } from './src/integrations/equreka-assets';
import { equrekaPwa } from './src/integrations/equreka-pwa';

export default defineConfig({
	site: 'https://equreka.com',
	integrations: [react(), equrekaAssets(), equrekaPwa()],
	vite: {
		plugins: [tailwindcss()],
	},
});
