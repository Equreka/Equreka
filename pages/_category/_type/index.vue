<template> 
  <main role="main" class="category" :class="type">
    <PageHeader :main="true" :category="category" :type="type" :name="type" />
    <div class="container">
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
  import jslinq from "jslinq";
  import categories from "/static/data/categories.json";
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

      let data, dataOffline;
      try {
        data = await fetch(`${process.env.api}/${type}/category/${category}`).then((res) => res.json());
      } catch {
        dataOffline = jslinq(categories);
        data = dataOffline.where((el) => { return el.slug == slug }).toList()[0];        
      }

      
      
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
          class: `page-data page-${this.type} ${this.category}`
        }
      }
    }
  }
</script>