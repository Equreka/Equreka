<template> 
  <main role="main" class="category">
    <PageHeader :category="category" :name="category" />
    <div class="container">
      <!-- Description -->
      <section class="description">
        <button class="btn btn-text btn-collapse muted" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-description" aria-controls="collapse-description" aria-expanded="false">
          {{ $t('Description') }}
        </button>
        <div id="collapse-description" class="collapse">
          <p class="lead">
            {{ $t(`page.categories.${category}.lead`) }}
          </p>
        </div>
      </section>
      <!-- Data -->
      <template v-if="data">
        <template v-for="dataTypes, type in data">
          <section :key="type" :id="type" :class="type" v-if="dataTypes.length !== 0">
            <!-- Header -->
            <header>
              <button class="btn btn-text btn-collapse" type="button" data-bs-toggle="collapse" :data-bs-target="`#collapse-${type}`" :aria-controls="`collapse-${type}`" aria-expanded="true">
                <h2 class="section-title">
                  {{ $t(`${type}.cap`) }}
                </h2>
              </button>
              <NuxtLink class="btn btn-sm btn-category" :to="localePath(`/${category}/${type}`)">
                <span>{{ $t('Go to section')}}</span>
                <i class="bi bi-arrow-right"></i>
              </NuxtLink>
            </header>
            <!-- List -->
            <div :id="`collapse-${type}`" class="collapse show">
              <div class="list">
                <NuxtLink v-for="link in dataTypes" :key="link.slug" :class="type" :to="localePath(`/${category}/${type}/${link.slug}`)">
                  {{ link.name }}
                </NuxtLink>
              </div>
            </div>
          </section>
        </template>
      </template>
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
  import Equreka from "@/equreka";
  import jslinq from "jslinq";
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
            const dbOffline = await import("@/static/data");
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