<template>
  <main role="main">
    <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
    <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
    <script>
      MathJax = {
        loader: {
          load: ['[tex]/html']
        },
        tex: { 
          inlineMath: [['$', '$']],
          packages: { '[+]': ['html'] },
          processEscapes: true,
        },
        svg: {
          fontCache: 'global'
        },
      };
    </script>

    <!-- Main: Header -->
    <PageHeader :category="category" :type="type" :name="name" :data="data" :json="json" />
    <div class="container">
      <!-- Eureka! Expression -->
      <section class="expression">
        <div class="mathjax">
          <template v-if="!data.expressionIntern">$${{ data.expression }}$$</template>
          <template v-else>$${{ parserLaTeX(data.expressionIntern) }}$$</template>
        </div>
      </section>
      <!-- Terms -->
      <section class="terms">
        <div class="row">
          <!-- Variables -->
          <div class="variables" v-if="data.variables.length > 0">
            <h3 class="title">{{ $t('Variables') }}</h3>
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th scope="col" class="variable symbol">{{ $t('Sym') }}</th>
                    <th scope="col" class="variable name">{{ $t('Name') }}</th>
                    <th scope="col" class="variable unit" colspan="2">{{ $t('Unit') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(json, index) in data.variables" :key="index" :class="TERM_SELECTOR + ' variable ' + json.variable.symbol">
                    <td class="variable symbol math">
                      {{ json.variable.symbol }}
                    </td>
                    <td class="variable name">
                      <NuxtLink :to="localePath('/' + data.category.slug + '/variables/' + json.variable.slug)">
                        {{ json.variable.name }}
                      </NuxtLink>
                    </td>
                    <td class="variable unit symbol math">
                      {{ json.variable.unit.symbol }}
                    </td>              
                    <td class="variable unit name">
                      <NuxtLink :to="localePath('/' + data.category.slug + '/units/' + json.variable.unit.slug)">
                        {{ json.variable.unit.name }}
                      </NuxtLink>
                    </td>              
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <!-- Constants -->
          <div class="constants" v-if="data.constants.length > 0">
            <h3 class="title">{{ $t('Constants') }}</h3>
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th scope="col" class="constant symbol">{{ $t('Sym') }}</th>
                    <th scope="col" class="constant name">{{ $t('Name') }}</th>
                    <th scope="col" class="constant value">{{ $t('Value') }}</th>
                    <th scope="col" class="constant unit" colspan="2">{{ $t('Unit') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(json, index) in data.constants" :key="index" :class="TERM_SELECTOR + ' constant ' + json.constant.symbol">
                    <td class="constant symbol math">
                      {{ json.constant.symbol }}
                    </td>
                    <td class="constant name">
                      <NuxtLink :to="localePath('/' + data.category.slug + '/constants/' + json.constant.slug)">
                        {{ json.constant.name }}
                      </NuxtLink>
                    </td>
                    <td class="constant unit value math">
                      {{ json.constant.value.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}
                    </td>   
                    <td class="constant unit symbol math">
                      <template v-if="json.constant.unit.symbolTeX">
                        ${{ json.constant.unit.symbolTeX }}$
                      </template>
                      <template v-else>
                        {{ json.constant.unit.symbol }}
                      </template>              
                    </td>              
                    <td class="constant unit name">
                      <NuxtLink :to="localePath('/' + data.category.slug + '/units/' + json.constant.unit.slug)">
                        {{ json.constant.unit.name }}
                      </NuxtLink>
                    </td>     
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
      <!-- Description -->
      <section class="description" v-if="data.description">
        <h3 class="title">{{ $t('Description') }}</h3>
        <p>{{ parserLaTeX( data.description ) }}</p>
      </section>
      <!-- Code -->
      <section class="codes">
        <h3 class="title">{{ $t('Code') }}</h3>
        <h4 class="subtitle">LaTeX</h4>
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
        <h3 class="title">{{ $t('References') }}</h3>
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
  import Equreka from '@/constants';
  export default {
    data () {
      return {
        TERM_SELECTOR: Equreka.TERM_SELECTOR.substring(1),
        data:     {},
        category: {},
        name:     String,
        type:     String,
        json:     false
      }
    },
    async asyncData ({ params, error }) {
      const slug = params.slug;
      const data = await fetch(
        process.env.baseUrl + '/api/entries/' + slug
      ).then((res) => res.json());
      if(data === null) error({ statusCode: 404 });
      if(data && data.category.slug == params.category) { 
        return { 
          data:     data,
          category: data.category,
          name:     data.name,
          type:     params.type,
          json:     Equreka.jsonDownload(data)
        }
      } else {
        error({ statusCode: 404 });
      }
    },
    mounted() {
      Equreka.initTermHover();
    },
    head() {
      return {
        bodyAttrs: {
          class: 'page-entry ' + this.category.slug
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