<template> 
  <main role="main">
    <PageHeader :main="true" :category="category" :name="category.name" />
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
        <NuxtLink to="/">Go back</NuxtLink>
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
        entries: {}
      }
    },
    async asyncData ({ params, error }) {
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
        error({ statusCode: 404 });
      }
    },
    head() {
      return {
        bodyAttrs: {
          class: 'page-category ' + this.category.slug
        }
      }
    }
  }
</script>

<style>

</style>
