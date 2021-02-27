<template>
  <main role="main" class="categories">
    <div class="container">
      <div class="row" v-for="category in categories" :key="category.slug" :class="category.slug">
        <div class="col-12 col-lg-3">
          <h3 class="title">{{ category.name }}</h3>
        </div>
        <div class="col-12 col-lg-9">
          <div class="list">
            <a :href="'/' + category.slug + '/'">Subcategory</a>
            <a :href="'/' + category.slug + '/'">Subcategory</a>
            <a :href="'/' + category.slug + '/'">Subcategory</a>
            <a :href="'/' + category.slug + '/'">Subcategory</a>
            <a :href="'/' + category.slug + '/'">Subcategory</a>
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
      categories: []
    }
  },
  async fetch () {
    this.categories = await fetch(process.env.baseUrl + '/api/categories/').then(res => res.json());
  },
  head: {
    bodyAttrs: {
      class: 'page-index'
    }
  },
}
</script>