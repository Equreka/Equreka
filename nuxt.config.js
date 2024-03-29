import Utils from "./utils";
export default {
	// Target: https://go.nuxtjs.dev/config-target
	target: 'static',
	// Server Side Rendering
	ssr: false,
	// Server
	server: {
		host: '0.0.0.0'
	},
	// Environment
	env: {
		baseUrl: process.env.BASE_URL || 'http://localhost:3000'
	},
	// Global page headers: https://go.nuxtjs.dev/config-head
	head: {
		title: 'Equreka',
		meta: [
			{ charset: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ hid: 'description', name: 'description', content: 'Your free and open-source app for equations, formulas, constants, magnitudes, variables and units' },
			{ hid: 'author', name: 'author', content: 'Derian André Castillo Franco' },
		],
		link: [
			{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
			{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
			{ rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true },
			{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@500;600&display=swap' },
		],
		script: [
			{ src: 'https://polyfill.io/v3/polyfill.min.js?features=es6', body: true }
		]
	},
	// Global CSS: https://go.nuxtjs.dev/config-css
	css: [
		'~/assets/scss/style.scss',
	],
	// Plugins to run before rendering page: https://go.nuxtjs.dev/config-plugins
	plugins: [
		{ src: '~/plugins/bootstrap.client.js' },
		{ src: '~/plugins/lazysizes.client.js' }
	],
	// Auto import components: https://go.nuxtjs.dev/config-components
	components: true,
	// Modules: https://go.nuxtjs.dev/config-modules
	modules: [		// https://go.nuxtjs.dev/content
		'@nuxt/content',
		// https://github.com/nuxt-community/device-module
		'@nuxtjs/device',
		// https://nuxtjs.org/blog/moving-from-nuxtjs-dotenv-to-runtime-config
		'@nuxtjs/dotenv',
		// https://go.nuxtjs.dev/i18n
		'@nuxtjs/i18n',
		// https://pwa.nuxtjs.org/
		'@nuxtjs/pwa',
		// https://github.com/nuxt-community/robots-module
		'@nuxtjs/robots',
		// https://sitemap.nuxtjs.org/
		'@nuxtjs/sitemap',
	],
	// Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
	buildModules: [
		// https://nuxtjs.org/blog/going-dark-with-nuxtjs-color-mode
		'@nuxtjs/color-mode',
	],
	// Build Configuration: https://go.nuxtjs.dev/config-build
	build: {
		extend (config, { isDev, isClient, loaders: { vue } }) {
			if (isClient) {
				vue.transformAssetUrls.img = ['data-src', 'src']
				vue.transformAssetUrls.source = ['data-srcset', 'srcset']
			}
		},
		loaders: {
			vue: {
				compilerOptions: {
					whitespace:         'condense',
					preserveWhitespace: false
				}
			},
			sass: {
				implementation: require('sass')
			},
			scss: {
				implementation: require('sass')
			}
		},
		extend(config) {
			config.node = { fs: 'empty' }
		}
	},
	// Nuxt.js Generate configuration
	generate: {
		fallback: true
	},
	// Custom modules configuration
	// @nuxtjs/content https://go.nuxtjs.dev/config-content
	content: {
		apiPrefix: 'api',
		liveEdit: false,
		fullTextSearchFields: ['name'],
		nestedProperties: [
			'categories.slug',
			'constants.slug',
			'magnitudes.slug',
			'variables.slug',
			'units.slug',
			'values.unit.slug',
			'conversions.unit.slug',
			'unitOf.slug',
			'description.text'
		],
	},
	hooks: {
		'content:file:beforeInsert': async (document, database) => {
			if (document.extension === '.json5' && document.description) {
				const description = Utils.parserTeX(document.description);
				const data = await database.markdown.toJSON(description);
				document.descriptionMarkdown = {};
				document.descriptionMarkdown = data;
			}
		}
	},
	// @nuxtjs/color-mode https://color-mode.nuxtjs.org/
	colorMode: {
		classPrefix: 'theme-',
		fallback:    'light',
		classSuffix: ''
	},
	// nuxt-i18n https://i18n.nuxtjs.org/options-reference/
	i18n: {
		seo: true,
		lazy: true,
		defaultLocale: 'en',
		langDir: '~/languages/',
		locales: [
			{
				code: 'en',
				iso:  'en-US',
				file: 'en.json',
				name: 'English'
			},
			{
				code: 'es',
				iso:  'en-ES',
				file: 'es.json',
				name: 'Español'
			}
		],
		detectBrowserLanguage: {
			cookieKey: 'equreka-settings-lang',
			useCookie: true,
			alwaysRedirect: true,
			fallbackLocale: 'en'
		},
		vuex: {
			moduleName:      'i18n',
			syncLocale:      true,
			syncMessages:    true,
			syncRouteParams: true
		},
		vueI18n: {
			fallbackLocale: {
				'default': ['en', 'es'],
				'es-US':   ['es', 'en'],
				'es-MX':   ['es', 'en']
			}
		}
	},
	// @nuxtjs/pwa
	pwa: {
		icon: {
			fileName: 'icon.png',
			purpose: 'maskable'
		},
		meta: {
			lang: 'en',
			name: 'Equreka',
			short_name: 'Equreka',
			description: 'Your free and open-source app for equations, formulas, constants, magnitudes, variables and units',
			theme_color: '#E3E5E8',
			author: 'Derian Castillo',
			ogHost: 'https://equreka.com',
			twitterSite: '@Equreka',
			twitterCreator: '@DerianAndre',
		},
		manifest: {
			lang: 'en',
			name: 'Equreka',
			short_name: 'Equreka',
			description: 'Your free and open-source app for equations, formulas, constants, magnitudes, variables and units',
			background_color: '#E3E5E8',
			theme_color: '#E3E5E8',
		}
	},
	// @nuxtjs/robots
	robots: {
		Sitemap: process.env.BASE_URL + '/sitemap.xml'
	},
	// @nuxtjs/sitemap
	sitemap: {
		hostname: process.env.BASE_URL,
		trailingSlash: true,
		routes: [
			{
				url: '/',
				changefreq: 'weekly',
				priority: 1,
				lastmod: (new Date()).toISOString()
			}
		]
	},
}
