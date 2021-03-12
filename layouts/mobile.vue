<template>
  <div class="body mobile">
    <HeaderMobile />
    <Nuxt />
  </div>
</template>

<script>
  export default {
    head () {
      return this.$nuxtI18nHead()
    }
  }
</script>