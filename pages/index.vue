<template>
  <main role="main" class="home">
    <div class="container">
      <h2 class="page-title">{{ $t('page.home.title') }}</h2>
      <div class="categories row" v-for="category in categories" :key="category.slug" :class="category.slug">
        <div class="col-12 col-lg-3 mb-3">
          <NuxtLink :to="localePath('/' + category.slug)">
            <h3 class="title">{{ $t(category.name) }}</h3>
          </NuxtLink>
        </div>
        <div class="col-12 col-lg-9">
          <div class="list">
            <NuxtLink :to="localePath('/' + category.slug)">{{ $t(category.name) }} Subcategory</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script>
export default {
  data () {
    return {
      categories: {}
    }
  },
  async fetch () {
    this.categories = await fetch(process.env.baseUrl + '/api/categories/').then(res => res.json());
  },
  head() {
    return {
      bodyAttrs: {
        class: `page-home`
      }
    }
  }
}
</script>