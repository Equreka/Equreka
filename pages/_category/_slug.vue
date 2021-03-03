<template>

  <main role="main">
    <!-- Main: Header -->
    <div class="category" :class="data.category.slug">
      <div class="container">
        <div class="d-flex align-items-center justify-content-between">
          <div class="info">
            <NuxtLink  class="title-small" :to="localePath('/' + data.category.slug)">
              {{ $t(data.category.name) }}
            </NuxtLink>
            <h1 class="title-large">{{ $t(data.name) }}</h1>
          </div>
          <!-- Options -->
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
        <div class="">$${{ parserLaTeX(data.expressionIntern) }}$$</div>
      </section>
      <!-- Terms -->
      <section class="terms">
        <h3>{{ $t('Variables') }}</h3>
        <table class="table table-borderless">
          <thead>
            <tr>
              <th scope="col">{{ $t('Symbol') }}</th>
              <th scope="col">{{ $t('Name') }}</th>
              <th scope="col" colspan="2">{{ $t('Unit') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr class="eqk-term variable" v-for="(json, index) in data.variables" :key="index" :class="json.variable.symbol">
              <td class="variable symbol">
                {{ json.variable.symbol }}
              </td>
              <td class="variable name">
                <NuxtLink :to="localePath('/' + data.category.slug + '/variable/' + json.variable.slug)">
                  {{ json.variable.name }}
                </NuxtLink>
              </td>
              <td class="unit symbol">
                {{ json.variable.unit.symbol }}
              </td>              
              <td class="unit name">
                <NuxtLink :to="localePath('/' + data.category.slug + '/unit/' + json.variable.slug)">
                  {{ json.variable.unit.name }}
                </NuxtLink>
              </td>              
            </tr>
          </tbody>
        </table>
      </section>
      <!-- Description -->
      <section class="description" v-if="data.description">
        <h3 class="mb-4">{{ $t('Description') }}</h3>
        <p class="text-justify">{{ parserLaTeX( data.description ) }}</p>
      </section>
      <!-- Code -->
      <section class="codes">
        <h3 class="mb-4">{{ $t('Code') }}</h3>
        <h4>LaTeX</h4>
        <div class="input-group">
          <b-button variant="dark" @click="copyClipboard('#' + data.slug)" :aria-label="$t('Copy to clipboard')">
            <i class="bi bi-clipboard"></i>
            <span class="visually-hidden">{{ $t('Copy to clipboard') }}</span>
          </b-button>
          <input :id="data.slug" class="form-control" :value="data.expression" />
        </div>
      </section>
      <!-- References -->
      <section class="references" v-if="data.references.length > 0">
        <h3 class="mb-4">{{ $t('References') }}</h3>
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
        constants: {},
        json: false
      }
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
    },
    beforeMount() {
      Equreka.initMathJax();
      Equreka.initTermHover();
    },
    head() {
      return {
        script: [
          {
            src: 'https://polyfill.io/v3/polyfill.min.js?features=es6'
          },
          {
            id: 'MathJax-script',
            src: '/assets/js/mathjax/tex-chtml-full.js',
            async: true
          }
        ],
        bodyAttrs: {
          class: 'page-entry' + (this.data.slug ? ' ' + this.data.category.slug : '')
        }
      }
    },
    methods: {     
      copyClipboard(clipboard) {
        Equreka.copyClipboard(clipboard);
      },
      parserLaTeX(data) {
        return Equreka.parserLaTeX(data);
      }
    }
  }
</script>