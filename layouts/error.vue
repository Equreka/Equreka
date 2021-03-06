<template>
  <main role="main">
    <div class="container">
      <NuxtLink class="brand" :to="localePath('/')">
        <Logo height="100px"/>
      </NuxtLink>
      <h1 v-if="error.statusCode === 404">{{ $t('Page not found') }}</h1>
      <h1 v-else-if="error.message">{{ $t(error.message) }}</h1>
      <h1 v-else>{{ $t('An error occurred') }}</h1>
      <NuxtLink :to="localePath('/')">{{ $t('Take me home') }}</NuxtLink>
    </div>
  </main>
</template>

<script>
  export default {
    props: ['error'],
    layout: 'error-layout',
    head: {
      bodyAttrs: {
        class: 'page-error'
      }
    }
  }
</script>