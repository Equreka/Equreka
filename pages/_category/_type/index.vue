<template> 
  <main role="main">
    <PageHeader :main="true" :category="category" :type="type" :name="type" />
    <div class="container py-4">
      <!-- Description -->
      <p class="lead">
        {{ $t('page.types.' + type + '.lead') }}
      </p>
      <!-- Data -->
      <div class="list mb-4" v-if="data">
        <NuxtLink v-for="item in data" :key="item._id" :to="localePath('/' + category + '/' + type + '/' + item.slug)">
          {{ item.name }}
        </NuxtLink>
      </div>
      <!-- No data -->
      <div v-else>
        <h2>Nothing found :(</h2>
        <NuxtLink to="/">Go back</NuxtLink>
      </div>
    </div>
  </main>
</template>

<script>
  import Equreka from '@/equreka';
  export default {
    data() {
      return {
        category: String,
        type: String,
        data: [Array, Object]
      }
    },
    async asyncData({ params, error }) {
      const category = params.category;
      const type = params.type;

      if(!Equreka.CATEGORIES.includes(category) || !Equreka.TYPES.includes(type)) {
        error({ statusCode: 404 });
        return;
      }

      let data = await fetch(process.env.baseUrl + '/api/' + type + '/category/' + category).then((res) => res.json());
      
      if(!data || data.length === 0) data = false;

      return {
        category: category,
        type: type,
        data: data
      }
    },
    head() {
      return {
        bodyAttrs: {
          class: `page-category page-${this.type} ${this.category}`
        }
      }
    }
  }
</script>