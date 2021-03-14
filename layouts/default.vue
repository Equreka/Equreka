<template>
  <div class="layout" :class="layout">
    <!-- App -->
    <template v-if="layout == 'app'">
      <AppHeader/>
      <Nuxt/>
      <AppMenu/>
    </template>
    <!-- Web -->
    <template v-else>
      <Header/>
      <Nuxt/>
      <Footer/>
    </template>
  </div>
</template>

<script>
  export default {
    data() {
      return {
        layout: (this.$device.isMobile) ? 'app' : 'web'
      }
    },
    head () {
      return this.$nuxtI18nHead()
    }
  }
</script>