<template> 
  <main role="main">
    <PageHeader :main="true" :category="category" :name="category" />
    <div class="container">
      <!-- Description -->
      <p class="lead">
        {{ $t('page.categories.' + category + '.lead') }}
      </p>
      <!-- Data -->
      <div class="list mb-4" v-if="equations">
        <NuxtLink v-for="equation in equations" :key="equation._id" :to="category + '/equations/' + equation.slug">
          {{ equation.name }}
        </NuxtLink>
      </div>
      <!-- No data -->
      <div v-else>
        <h2>Nothing found :(</h2>
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
  export default {
    data() {
      return {
        category: false,
        equations: false
      }
    },
    async asyncData ({ params, error }) {
      const category = params.category;
      if(!Equreka.CATEGORIES.includes(category)) {
        error({ statusCode: 404 });
        return;
      }

      const equations = await fetch(`${process.env.api}/equations/category/${category}`).then((res) => res.json());

      if(category && equations.length != 0) {
        return {
          category:  category,
          equations: equations
        }
      } else if(category && equations.length === 0) {        
        return {
          category:  category,
          equations: false
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