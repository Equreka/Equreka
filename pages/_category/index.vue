<template> 
  <main role="main" class="category">
    <PageHeader :category="category" :name="category" />
    <div class="container">
      <!-- Description -->
      <p class="lead mb-4">
        {{ $t('page.categories.' + category + '.lead') }}
      </p>
      <!-- Data -->
      <template v-if="data">
        <template v-for="types, slug in data">
          <section :key="slug" :id="slug" :class="slug" v-if="types.length !== 0">
            <h3 class="h4 mb-3">{{ $t(`${slug}.cap`) }}</h3>
            <div class="list mb-4">
              <NuxtLink v-for="type in types" :key="type.slug" :class="slug" :to="`${category}/${slug}/${type.slug}`">
                {{ type.name }}
              </NuxtLink>
            </div>
          </section>
        </template>
      </template>
      <!-- No data -->
      <div v-else>
        <h2 class="h4 mb-3">Nothing found :(</h2>
        <NuxtLink to="/">Go back</NuxtLink>
      </div>
      <!-- Pagination -->
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
  import Equreka from '@/equreka';
  import jslinq from "jslinq";
  import dbOffline from "/static/data";
  export default {
    data() {
      return {
        category: false,
        data: false
      }
    },
    async asyncData ({ params, error }) {
      const category = params.category;
      if(!Equreka.CATEGORIES.includes(category)) {
        error({ statusCode: 404 });
        return;
      }

      let data = [], dataOffline = [];

      await Promise.all((Equreka.TYPES).map(async (type) => {
        try {
          data[type] = await fetch(`${process.env.api}/${type}/category/${category}`).then((res) => res.json());
        } catch {
          try {
            dataOffline[type] = jslinq(dbOffline[type]);
            data[type] = dataOffline[type].where((el) => {
              if(Object.keys(el).length !== 0) {
                return el.category.slug == category 
              } else {
                return false
              }
            }).toList();
          } catch {
            data[type] = [];
          }
        } 
      }));

      if(category &&
        (
          data.constants.length !== 0 || 
          data.equations.length !== 0 || 
          data.formulas.length  !== 0 || 
          data.units.length     !== 0 || 
          data.variables.length !== 0
        )
      ) {
        return {
          category:  category,
          data: {
            constants: data['constants'],
            equations: data['equations'],
            formulas:  data['formulas'],
            units:     data['units'],
            variables: data['variables']
          }
        }
      } else if(category &&
        (
          data.constants.length === 0 && 
          data.equations.length === 0 && 
          data.formulas.length  === 0 && 
          data.units.length     === 0 && 
          data.variables.length === 0
        ) 
      ) {        
        return {
          category: category,
          data: false
        }
      } else {
        error({ statusCode: 404 });
        return;
      }
    },
    head() {
      return {
        bodyAttrs: {
          class: `page-category ${this.category}`
        }
      }
    }
  }
</script>