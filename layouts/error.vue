<template>
  <main role="main">
    <div class="container">
      <NuxtLink class="brand" to="/">
        <img src="/assets/brand/logo.png" alt="Equreka">
      </NuxtLink>
      <h1 v-if="error.statusCode === 404">Page not found</h1>
      <h1 h1 v-else>An error occurred</h1>
      <NuxtLink to="/">Home page</NuxtLink>
    </div>
  </main>
</template>

<script>
  export default {
    props: ['error'],
    layout: 'errors', // you can set a custom layout for the error page
    head: {
      bodyAttrs: {
        class: 'page-error'
      }
    }
  }
</script>