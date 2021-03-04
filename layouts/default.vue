<template>
  <div class="body">
    <Header />
    <Nuxt />
    <Footer />
  </div>
</template>

<script>
  export default {
    head () {
      return this.$nuxtI18nHead()
    }
  }
</script>