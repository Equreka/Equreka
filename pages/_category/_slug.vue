<template>
  <main role="main">
    <div class="category" :class="data.category.slug">
      <div class="container">
        <div class="d-flex align-items-center justify-content-between">
          <div class="info">
            <NuxtLink :to="'/' + data.category.slug">
              <h2 class="title-small">{{ data.category.name }}</h2>
            </NuxtLink>
            <h1 class="title-large">{{ data.name }}</h1>
          </div>
          <b-dropdown class="dropdown-options" variant="outline-light" no-caret right>
            <template #button-content>
              <i class="bi bi-three-dots-vertical"></i>
            </template>
            <h6 class="dropdown-header">Options</h6>
            <b-dropdown-item :href="json" :download="data.slug + '.json'">
              <i class="bi bi-download"></i>
              Download JSON
            </b-dropdown-item>
            <b-dropdown-item>
              <i class="bi bi-heart"></i>
              Add to favorites
            </b-dropdown-item>
            <b-dropdown-item :to="'/report/' + data.category.slug + '/' + data.slug">
              <i class="bi bi-flag"></i>
              Report an error
            </b-dropdown-item>
          </b-dropdown>
        </div>
      </div>
    </div>
    <div class="container">
      <!-- Eureka! Expression -->
      <section class="expression">
        <div>$${{ parserLaTeX(data.expressionIntern) }}$$</div>
      </section>
      <!-- Terms -->
      <section class="terms">
        <h3>Variables</h3>
        <table class="table table-borderless">
          <thead>
            <tr>
              <th scope="col">Symbol</th>
              <th scope="col">Name</th>
              <th scope="col" colspan="2">Unit</th>
            </tr>
          </thead>
          <tbody>
            <tr class="eqk-term variable" v-for="(json, index) in data.variables" :key="index" :class="json.variable.symbol">
              <td class="variable symbol">
                {{ json.variable.symbol }}
              </td>
              <td class="variable name">
                <NuxtLink :to="'/' + data.category.slug + '/variable/' + json.variable.slug">
                  {{ json.variable.name }}
                </NuxtLink>
              </td>
              <td class="unit symbol">
                {{ json.variable.unit.symbol }}
              </td>              
              <td class="unit name">
                <NuxtLink :to="'/' + data.category.slug + '/unit/' + json.variable.slug">
                  {{ json.variable.unit.name }}
                </NuxtLink>
              </td>              
            </tr>
          </tbody>
        </table>
      </section>
      <!-- Description -->
      <section class="description" v-if="data.description">
        <h3 class="mb-4">Description</h3>
        <p class="text-justify">{{ parserLaTeX( data.description ) }}</p>
      </section>
      <!-- Code -->
      <section class="code">
        <h3 class="mb-4">Code</h3>
        <h4>LaTeX</h4>
        <code>{{ data.expression }}</code>
      </section>
      <!-- References -->
      <section class="references" v-if="data.references.length > 0">
        <h3 class="mb-4">References</h3>
        <ul>
          <li v-for="reference in data.references" :key="reference.id">
            {{ reference.description }}
          </li>
        </ul>
        <cite id="CITEREFEinstein.2C_A.1905" class="citation d-none">
          Einstein, A. (1905), "Ist die Trägheit eines Körpers von seinem Energieinhalt abhängig?", <i>Annalen der Physik</i>, <b>18</b>: 639–643, Bibcode:<a rel="nofollow" class="external text" href="http://adsabs.harvard.edu/abs/1905AnP...323..639E">1905AnP...323..639E</a>, doi:<a rel="nofollow" class="external text" href="http://doi.org/10.1002%2Fandp.19053231314">10.1002/andp.19053231314</a>
        </cite>
      </section>
    </div>
  </main>
</template>

<script>
  import Equreka from '@/constants'
  export default {
    data () {
      return {
        data: {},
        json: false
      }
    },
    head: {
      script: [
        {
          src: 'https://polyfill.io/v3/polyfill.min.js?features=es6'
        },
        {
          id: 'MathJax-script',
          src: 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml-full.js',
          async: true
        }
      ],
      bodyAttrs: {
        class: 'page-entry'
      }
    },
    components: {
    },
    methods: {
      parserLaTeX(data) {
        return Equreka.parserLaTeX(data);
      }
    },
    beforeMount() {
      Equreka.initMathJax();
    },
    mounted() {
      Equreka.initTermHover();
    },
    async asyncData ({ params, redirect }) {
      const slug = params.slug;
      const data = await fetch(
        process.env.baseUrl + '/api/entries/' + slug
      ).then((res) => res.json());
      if(data) { 
        return { 
          data: data,
          json: Equreka.jsonDownload(data)
        }
      } else {
        redirect('/');
      }
    }
  }
</script>