//const NUXT_GENERATE = process.env.NUXT_GENERATE || false,
//		BASE_URL = NUXT_GENERATE ? `http://equreka.com/${NUXT_GENERATE}` : 'http://localhost:3000'
export default {
	// Target: https://go.nuxtjs.dev/config-target
	target: 'static',
	// Server Side Rendering
	ssr: false,
	// Server
	server: {
		host: '0.0.0.0'
	},
	// Router
	//router: {
	//	base: NUXT_GENERATE ? `/${NUXT_GENERATE}/` : '/',
	//},
	// Environment
	//env: {
	//	baseUrl: BASE_URL
	//},
	// Global page headers: https://go.nuxtjs.dev/config-head
	head: {
		title: 'Equreka',
		meta: [
			{ charset: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ hid: 'description', name: 'description', content: 'Your open-source site of science' },
			{ hid: 'author', name: 'author', content: 'Derian André Castillo Franco' },
		],
		link: [
			{ rel: 'icon', type: 'image/x-icon', href: '/assets/brand/icons/favicon.ico' },
			{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
			{ rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true },
			{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700;800;900&display=swap' },
			{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,500;1,600;1,700&display=swap' },
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
		fullTextSearchFields: ['title', 'name', 'slug', 'unit', 'conversions.unit'],
		nestedProperties: [
			'categories.slug',
			'constants.slug',
			'magnitudes.slug',
			'variables.slug',
			'units.slug',
			'values.unit.slug',
			'conversions.unit.slug',
			'unitOf.slug',
		],
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
		meta: {
			name: 'Equreka',
			short_name: 'Equreka',
			author: 'Derian Castillo',
			description: 'Your free and open-source app for variables, constants, formulas and equations',
			theme_color: '#070708',
			lang: 'en'
		},
		manifest: {
			name: 'Equreka',
			short_name: 'Equreka',
			description: 'Your free and open-source app for variables, constants, formulas and equations',
			lang: 'en',
			background_color: '#070708',
		},
		icon: {
			source: '~/static/icon.png'
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
