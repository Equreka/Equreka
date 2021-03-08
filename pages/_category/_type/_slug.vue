<template>
  <main role="main">
    <PageHeader :category="category" :type="type" :name="name" :data="data" :json="json" />
    <div class="container">
      <template v-if="type === 'equations' || type == 'formulas'">
        <!-- Expression -->
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
              <!-- Table -->
              <div class="table-responsive">
                <table class="table table-data">
                  <thead>
                    <tr>
                      <th scope="col" class="variable symbol">{{ $t('Sym') }}</th>
                      <th scope="col" class="variable name">{{ $t('Name') }}</th>
                      <th scope="col" class="variable unit" colspan="2">{{ $t('Unit') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(json, index) in data.variables" :key="index" :class="selector + ' variable ' + json.variable.symbol">
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
              <!-- Table -->
              <div class="table-responsive">
                <table class="table table-data">
                  <thead>
                    <tr>
                      <th scope="col" class="constant symbol">{{ $t('Sym') }}</th>
                      <th scope="col" class="constant name">{{ $t('Name') }}</th>
                      <th scope="col" class="constant value">{{ $t('Value') }}</th>
                      <th scope="col" class="constant unit" colspan="2">{{ $t('Unit') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(json, index) in data.constants" :key="index" :class="selector + ' constant ' + json.constant.symbol">
                      <td class="constant symbol math">
                        {{ json.constant.symbol }}
                      </td>
                      <td class="constant name">
                        <NuxtLink :to="localePath('/' + data.category.slug + '/constants/' + json.constant.slug)">
                          {{ json.constant.name }}
                        </NuxtLink>
                      </td>
                      <td class="constant unit value math">
                        {{ formatNumber(json.constant.value) }}
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
      </template>
      <template v-else>      
        <!-- Symbol -->
        <section class="symbol" :class="type">
          <div class="mathjax">
            $$
            <template v-if="!data.symbolLaTeX">
              {{ data.symbol }}
            </template>
            <template v-else>
              {{ parserLaTeX(data.symbolLaTeX) }}
            </template>
            <template v-if="data.value">
              = {{ formatNumber(data.value) + data.unit.symbol }}
            </template>
            $$
          </div>
        </section>
        <!-- Values -->
        <section class="values" v-if="data.values">
          <div class="row">
            <div>
              <h3 class="title">{{ $t('Exact values') }}</h3>
              <div class="table-responsive">
                <table class="table table-data table-values">
                  <thead>
                    <tr>
                      <th scope="col" class="constant name">{{ $t('Value') }}</th>
                      <th scope="col" class="constant unit" colspan="2">{{ $t('Unit') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-for="value in data.values" :class="selector">
                      <tr :key="value.value" v-if="value.exact">
                        <td class="constant unit value math">
                          {{ formatNumber(value.value) }}
                        </td>
                        <td class="constant unit symbol math">
                          {{ value.unit.symbol }}
                        </td>
                        <td class="constant unit name">
                            <NuxtLink :to="localePath('/' + data.category.slug + '/units/' + value.unit.slug)">
                              {{ value.unit.name }}
                            </NuxtLink>
                        </td>
                      </tr>
                    </template>
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h3 class="title">{{ $t('Approximate values') }}</h3>
              <div class="table-responsive">
                <table class="table table-data table-values">
                  <thead>
                    <tr>
                      <th scope="col" class="constant name">{{ $t('Value') }}</th>
                      <th scope="col" class="constant unit" colspan="2">{{ $t('Unit') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-for="value in data.values" :class="selector">
                      <tr :key="value.value" v-if="!value.exact">
                        <td class="constant unit value math">
                          {{ formatNumber(value.value) }}
                        </td>
                        <td class="constant unit symbol math">
                          {{ value.unit.symbol }}
                        </td>
                        <td class="constant unit name">
                            <NuxtLink :to="localePath('/' + data.category.slug + '/units/' + value.unit.slug)">
                              {{ value.unit.name }}
                            </NuxtLink>
                        </td>
                      </tr>
                    </template>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </template>

      <!-- Description -->
      <section class="description" v-if="data.description">
        <h3 class="title">{{ $t('Description') }}</h3>
        <p>{{ parserLaTeX( data.description ) }}</p>
      </section>

      <!-- Code -->
      <section class="codes" v-if="data.expression">
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
    </div>
    <!-- Scripts -->
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
  </main>
</template>


<script>
  import Equreka from '@/constants';
  export default {
    data () {
      return {
        selector: Equreka.TERM_SELECTOR.substring(1),
        data:     {},
        category: {},
        type:     String,
        name:     String,
        json:     false
      }
    },
    async asyncData ({ params, error }) {
      const slug = params.slug;
      const type = params.type;

      const data = await fetch(
        process.env.baseUrl + '/api/' + type + '/' + slug
      ).then((res) => res.json());

      if(data && data.category.slug == params.category) { 
        return { 
          data:     data,
          name:     data.name,
          category: data.category,
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
          class: `page-data page-${this.type} ${this.category.slug}`
        }
      }
    },
    methods: {     
      copyClipboard(clipboard) {
        Equreka.copyClipboard(clipboard);
      },
      parserLaTeX(data) {
        return Equreka.parserLaTeX(data);
      },
      formatNumber(number) {
        return Equreka.formatNumber(number);
      }
    }
  }
</script>