<template> 
  <main role="main">
    <header class="category">
      <div class="container">
        <h2 class="title-small">{{ $t('Category') }}</h2>
        <h1 class="title-large">{{ $t(category.name) }}</h1>
      </div>
    </header>
    <div class="container py-4">
      <p class="lead">
        {{ category.description }}
      </p>
      <div class="list mb-4" v-if="entries">
        <NuxtLink v-for="entry in entries" :key="entry._id" :to="category.slug + '/' + entry.slug">
          {{ entry.name }}
        </NuxtLink>
      </div>
      <div v-else>
        <h2>No entries :(</h2>
        <nuxt-link to="/">Go back</nuxt-link>
      </div>
      <nav class="d-none" aria-label="Page navigation example">
        <ul class="pagination">
          <li class="page-item"><a class="page-link" href="/">Previous</a></li>
          <li class="page-item"><a class="page-link" href="/">1</a></li>
          <li class="page-item"><a class="page-link" href="/">2</a></li>
          <li class="page-item"><a class="page-link" href="/">3</a></li>
          <li class="page-item"><a class="page-link" href="/">Next</a></li>
        </ul>
      </nav>
    </div>
  </main>
</template>
<script>
  export default {
    data() {
      return {
        category: {},
        entries: {},
        subCategories: {}
      }
    },
    async asyncData ({ params, redirect }) {
      const slug = params.category;

      const category = await fetch(
        process.env.baseUrl + '/api/categories/' + slug
      ).then((res) => res.json());

      const entries = await fetch(
        process.env.baseUrl + '/api/entries/category/' + slug
      ).then((res) => res.json());

      if(category && entries.length != 0) {
        return {
          category: category,
          entries: entries
        }
      } else if(category && entries.length === 0) {        
        return {
          category: category,
          entries: false
        }
      } else {
        redirect(process.env.baseUrl);
      }
    },
    head() {
      return {
        bodyAttrs: {
          class: 'page-category' + (this.category.slug ? ' ' + this.category.slug : '')
        }
      }
    }
  }
</script>

<style>

</style>
