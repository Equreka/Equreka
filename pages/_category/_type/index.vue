<template> 
  <main role="main" class="category" :class="type">
    <PageHeader :category="category" :name="type" :type="type" :main="true" />
    <div class="container">
      <!-- Description -->
      <section class="description">
        <button class="btn btn-text btn-collapse muted" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-description" aria-controls="collapse-description" aria-expanded="false">
          {{ $t('Description') }}
        </button>
        <div id="collapse-description" class="collapse">
          <p class="lead">
            {{ $t(`page.types.${type}.lead`) }}
          </p>
        </div>
      </section>
      <!-- Data -->
      <section v-if="data">
        <!-- Header -->
        <header>
          <button class="btn btn-text btn-collapse" type="button" data-bs-toggle="collapse" :data-bs-target="`#collapse-${type}`" :aria-controls="`collapse-${type}`" aria-expanded="true">
            <h2 class="section-title">
              {{ $t(`${type}.cap`) }}
            </h2>
          </button>
        </header>
        <!-- List -->
        <div :id="`collapse-${type}`" class="collapse show">
          <div class="list">
            <NuxtLink v-for="item in data" :key="item._id" :to="localePath(`/${category}/${type}/${item.slug}`)">
              {{ item.name }}
            </NuxtLink>
          </div>
        </div>
      </section>
      <!-- No data -->
      <section v-else>
        <h2 class="section-title">
          {{ $t('error.no-data') }}
        </h2>
        <NuxtLink :to="localePath('/')">
          {{ $t('Go back to home') }}
        </NuxtLink>
      </section>
    </div>
  </main>
</template>

<script>
  import Equreka from "@/equreka";;
  import jslinq from "jslinq";
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
        const dbOffline = await import("@/static/data");
        dataOffline = jslinq(dbOffline[type]);
        data = dataOffline.where((el) => { return el.category.slug == category }).toList();
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
          class: `page-category page-${this.type} ${this.category}`
        }
      }
    }
  }
</script>