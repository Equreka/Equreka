export default {
  // Target: https://go.nuxtjs.dev/config-target
  target: 'static',

  ssr: false,

  server: {
    host: '0.0.0.0'
  },

  serverMiddleware: [
    {
      path:    '/api',
      handler: '@/server'
    }
  ],

  env: {
    api:     process.env.API_URL  || 'http://192.168.0.5:3000/api',
    baseUrl: process.env.BASE_URL || 'http://192.168.0.5:3000'
  },

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
      { rel: 'icon', type: 'image/x-icon', href: '/assets/brand/icons/favicon.ico' }
    ],
    script: [
      { src: 'https://polyfill.io/v3/polyfill.min.js?features=es6', body: true }
    ]
  },

  // Global CSS: https://go.nuxtjs.dev/config-css
  css: [
    '@/assets/scss/style.scss',
  ],

  // Plugins to run before rendering page: https://go.nuxtjs.dev/config-plugins
  plugins: [
    //'@/node_modules/bootstrap/dist/js/bootstrap.bundle.min.js',
    '@/static/assets/js/bootstrap/bootstrap.bundle.min.js',
    '@/plugins/preview.client.js',
    '@/plugins/i18n.js'
  ],

  // Auto import components: https://go.nuxtjs.dev/config-components
  components: true,

  // Modules: https://go.nuxtjs.dev/config-modules
  modules: [
    // https://axios.nuxtjs.org/usage
    '@nuxtjs/axios',
    // https://nuxtjs.org/blog/going-dark-with-nuxtjs-color-mode
    '@nuxtjs/color-mode',
    // https://github.com/nuxt-community/device-module
    '@nuxtjs/device',
    // https://nuxtjs.org/blog/moving-from-nuxtjs-dotenv-to-runtime-config
    '@nuxtjs/dotenv',
    // https://pwa.nuxtjs.org/
    '@nuxtjs/pwa',
    // https://github.com/nuxt-community/redirect-module
    '@nuxtjs/redirect-module',
    // https://github.com/nuxt-community/robots-module
    '@nuxtjs/robots',
    // https://sitemap.nuxtjs.org/
    '@nuxtjs/sitemap',
    // https://i18n.nuxtjs.org/
    ['nuxt-i18n', {
      seo: true,
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
      defaultLocale: 'en',
      lazy:          true,
      langDir:       '@/lang/',
      detectBrowserLanguage: {
        useCookie: true,
        cookieKey: 'equreka-lang',
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
    }]
  ],

  // Build Configuration: https://go.nuxtjs.dev/config-build
  build: {
    loaders: {
      vue: {
        compilerOptions: {
          whitespace: 'condense',
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

  // Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
  buildModules: [
    // https://nuxtjs.org/blog/going-dark-with-nuxtjs-color-mode
    //'@nuxtjs/color-mode',
    // https://pwa.nuxtjs.org/
    //'@nuxtjs/pwa',
    // https://github.com/nuxt-community/device-module
    //'@nuxtjs/device'
  ],

  // @nuxtjs/color-mode
  colorMode: {
    classPrefix: 'theme-',
    classSuffix: ''
  },

  // @nuxtjs/pwa
  pwa: {
    meta: {
      name: 'Equreka',
      short_name: 'Equreka',
      author: 'Derian Castillo',
      description: 'Your free and open-source app for variables, constants, formulas and equations',
      theme_color: '#e3e5e8',
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
      source: './static/icon.png'
    }
  },

  // @nuxtjs/robots
  robots: {
    Sitemap: process.env.SITE_URL + 'sitemap.xml'
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
        lastmod: new Date().toISOString()
      }
    ]
  },
  generate: {
    fallback: true
  }
}
