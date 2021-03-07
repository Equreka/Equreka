<template>
  <main role="main">
    <div class="container">
      <!-- Logo -->
      <NuxtLink class="brand" :to="localePath('/')">
        <Logo height="100px"/>
      </NuxtLink>
      <!-- Title -->
      <h1 class="mb-5">{{ $t('page.error.title') }}</h1>
      <h3 v-if="error.statusCode === 404">{{ $t('page.error.404') }}</h3>
      <h3 v-else-if="error.message">{{ $t(error.message) }}</h3>
      <h3 v-else>{{ $t('page.error.unknown') }}</h3>
      <p class="lead mb-5">{{ $t('page.error.lead') }}</p>
      <!-- Link -->
      <NuxtLink class="btn btn-primary" :to="localePath('/')">{{ $t('page.error.link') }}</NuxtLink>
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