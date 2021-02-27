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
    '@/node_modules/bootstrap-icons/font/bootstrap-icons.css'
  ],

  // Plugins to run before rendering page: https://go.nuxtjs.dev/config-plugins
  plugins: [
    //'@/node_modules/vue-mathjax'
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
    // Doc: https://axios.nuxtjs.org/usage
    '@nuxtjs/axios',
    '@nuxtjs/redirect-module',
    '@nuxtjs/pwa',
    // https://i18n.nuxtjs.org/es
    'nuxt-i18n',
    // https://go.nuxtjs.dev/bootstrap
    'bootstrap-vue/nuxt',
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

  // @nuxtjs/color-mode
  colorMode: {
    classPrefix: 'theme-',
    classSuffix: ''
  },

  // i18n
  i18n: {},

  // PWA module configuration: https://go.nuxtjs.dev/pwa
  pwa: {
    manifest: {
      lang: 'en',
    },
  },


}
