export default {
  // Target: https://go.nuxtjs.dev/config-target
  target: 'server',

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
    baseUrl: process.env.BASE_URL || 'http://localhost:3000'
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
  },

  // Global CSS: https://go.nuxtjs.dev/config-css
  css: [
    '@/assets/scss/style.scss',
  ],

  // Plugins to run before rendering page: https://go.nuxtjs.dev/config-plugins
  plugins: [
    //'@/node_modules/vue-mathjax',
    //'~/plugins/tex-chtml-full.js',
    '~/plugins/preview.client.js',
    '~/plugins/i18n.js'
  ],

  // Auto import components: https://go.nuxtjs.dev/config-components
  components: true,

  // Modules: https://go.nuxtjs.dev/config-modules
  modules: [
    // https://axios.nuxtjs.org/usage
    '@nuxtjs/axios',
    // https://github.com/nuxt-community/redirect-module
    '@nuxtjs/redirect-module',
    // https://go.nuxtjs.dev/bootstrap
    'bootstrap-vue/nuxt',
    // https://i18n.nuxtjs.org/
    ['nuxt-i18n',
      {
        defaultLocale: 'en',
        lazy:          true,
        langDir:       '/lang/',
        //differentDomains: (process.env.NODE_ENV === 'production'),
        locales: [
          {
            code: 'en',
            iso:  'en-US',
            name: 'English',
            file: 'en.json'
          },
          {
            code: 'es',
            iso:  'en-ES',
            name: 'Español',
            file: 'es.json'
          }
        ],
        vueI18n: {
          fallbackLocale: {
            // 'es-MX':   ['es', 'en'], // Para después ;)
            'default': ['en', 'es']
          }
        }
      }
    ]
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
    }
  },

  // Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
  buildModules: [
    // https://nuxtjs.org/blog/going-dark-with-nuxtjs-color-mode
    '@nuxtjs/color-mode',
    // https://pwa.nuxtjs.org/
    '@nuxtjs/pwa'
  ],

  // Bootstrap Vue
  bootstrapVue: {
    bootstrapCSS: false, 
    bootstrapVueCSS: false
  },

  // @nuxtjs/color-mode
  colorMode: {
    classPrefix: 'theme-',
    classSuffix: ''
  },

  // PWA module configuration: https://go.nuxtjs.dev/pwa
  pwa: {
    meta: {
      name: 'Equreka',
      short_name: 'Equreka',
      author: 'Derian Castillo',
      description: 'Your free and open-source app for variables, constants, formulas and equations',
      theme_color: '#ffffff',
      lang: 'en'
    },
    manifest: {
      name: 'Equreka',
      short_name: 'Equreka',
      description: 'Your free and open-source app for variables, constants, formulas and equations',
      lang: 'en',
    },
    icon: {
      source: './static/icon.png'
    }
  }
}
