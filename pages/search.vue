<template>
  <main role="main" class="search">
    <div class="container">
      <h2 class="page-title">{{ $t('page.search.title') }}</h2>
      <p class="lead">{{ $t('page.search.lead') }}</p>
      {{ q }}
      <SearchBar/>
    </div>
  </main>
</template>

<script>
  export default {
    data() {
      return {
        
      }
    },

    head() {
      return {
        bodyAttrs: {
          class: `page-search`
        }
      }
    }
  }
</script>