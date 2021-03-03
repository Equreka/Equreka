export default {
  // Target: https://go.nuxtjs.dev/config-target
  target: 'static',

  serverMiddleware: [
    {
      path:    '/api',
      handler: '@/server'
    }
  ],

  env: {
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  },

  // Global page headers: https://go.nuxtjs.dev/config-head
  head: {
    title: 'Equreka',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: '' },
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
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
  ],

  // Auto import components: https://go.nuxtjs.dev/config-components
  components: true,

  // Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
  buildModules: [
    // https://nuxtjs.org/blog/going-dark-with-nuxtjs-color-mode
    '@nuxtjs/color-mode'
  ],

  // Modules: https://go.nuxtjs.dev/config-modules
  modules: [
    // https://axios.nuxtjs.org/usage
    '@nuxtjs/axios',
    // https://github.com/nuxt-community/redirect-module
    '@nuxtjs/redirect-module',
    // https://pwa.nuxtjs.org/
    '@nuxtjs/pwa',
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
      sass: {
        implementation: require('sass')
      },
      scss: {
        implementation: require('sass')
      }
    }
  },

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
    manifest: {
      lang: 'en',
    },
  },


}
