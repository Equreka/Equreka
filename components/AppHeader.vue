<template>
  <div class="app-header">
    <!---
    <button class="btn btn-link">
      <i class="bi bi-arrow-left"></i>
    </button>-->
    <NuxtLink :to="localePath('/')">
      <Logo />
    </NuxtLink>
  </div>
</template>

<script>
  export default {

  }
</script>