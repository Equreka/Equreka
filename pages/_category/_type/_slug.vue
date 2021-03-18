<template>
  <main role="main" class="data">
    <PageHeader :category="category" :type="type" :name="data.name" :data="data" :json="json" />
    <div class="container">
      <!-- Equations / Formulas -->
      <template v-if="type === 'equations' || type == 'formulas'">
        <!-- Expression -->
        <section class="mathjax expression">
          <Loader />
          <div class="wrapper">
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
                      <th scope="col" class="variable symbol">
                        <Abbr string="symbol"/>
                      </th>
                      <th scope="col" class="variable name">
                        {{ $t('Name') }}
                      </th>
                      <th scope="col" class="variable unit" colspan="2">
                        {{ $t('Unit') }}
                      </th>
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
                      <th scope="col" class="constant symbol">
                        <Abbr string="symbol"/>
                      </th>
                      <th scope="col" class="constant name">
                        {{ $t('Name') }}
                      </th>
                      <th scope="col" class="constant value">
                        {{ $t('Value') }}
                      </th>
                      <th scope="col" class="constant unit" colspan="2">
                        {{ $t('Unit') }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(object, index) in data.constants" :key="index" :class="selector + ' constant ' + object.constant.symbol">
                      <td class="constant symbol math">
                        {{ object.constant.symbol }}
                      </td>
                      <td class="constant name">
                        <NuxtLink :to="localePath('/' + data.category.slug + '/constants/' + object.constant.slug)">
                          {{ object.constant.name }}
                        </NuxtLink>
                      </td>
                      <td class="constant unit value math">
                        {{ formatNumber(object.constant.value) }}
                      </td>   
                      <td class="constant unit symbol math">
                        <template v-if="object.constant.unit.symbolTeX">
                          ${{ object.constant.unit.symbolTeX }}$
                        </template>
                        <template v-else>
                          {{ object.constant.unit.symbol }}
                        </template>              
                      </td>              
                      <td class="constant unit name">
                        <NuxtLink :to="localePath('/' + data.category.slug + '/units/' + object.constant.unit.slug)">
                          {{ object.constant.unit.name }}
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
      <!-- Constants / Variables / Units -->
      <template v-else>      
        <!-- Symbol -->
        <section class="mathjax symbol" :class="type">
          <Loader />
          <div class="wrapper">
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
          <input class="form-control" :id="data.slug" :value="data.expression" />
          <button type="button" class="btn btn-primary" @click="copyClipboard('#' + data.slug)" :aria-label="$t('Copy to clipboard')">
            <i class="bi bi-clipboard"></i>
            <span class="visually-hidden">{{ $t('Copy to clipboard') }}</span>
          </button>
        </div>
      </section>
    </div>
    <!-- Scripts -->
    <!--<script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>-->
    <script id="MathJax-script" async src="/assets/js/mathjax/tex-mml-chtml.js"></script>
    <script>
      MathJax = {
        locale: 'es',
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
        startup: {
          ready: () => {
            MathJax.startup.defaultReady();
            MathJax.startup.promise.then(() => {
              var div = document.body.querySelector('section.mathjax');
              div.classList.add('rendered');              
              setTimeout(() => {
                div.querySelector('.loader').remove();
              }, 500);
            });
          }
        }
      };
    </script>
  </main>
</template>


<script>
  import jslinq from "jslinq";
  import Equreka from '@/equreka';
  import dbOffline from "@/static/data";
  export default {
    data () {
      return {
        selector: Equreka.TERM_SELECTOR.substring(1),
        data:     {},
        category: String,
        type:     String,
        name:     String,
        json:     false
      }
    },
    async asyncData ({ params, error }) {
      const category = params.category;
      const type = params.type;

      if(!Equreka.CATEGORIES.includes(category) || !Equreka.TYPES.includes(type)) {
        error({ statusCode: 404 });
        return;
      }

      const slug = params.slug;
      let data, dataOffline;

      try {
        data = await fetch(`${process.env.api}/${type}/${slug}`).then((res) => res.json());
      } catch {
        dataOffline = jslinq(dbOffline[type]);
        data = dataOffline.where((el) => { return el.slug == slug }).toList()[0];
      }
      
      if(data && data.category.slug == category) { 
        return { 
          data:     data,
          category: category,
          type:     type,
          json:     Equreka.jsonDownload(data)
        }
      } else {
        error({ statusCode: 404 });
        return;
      }
    },
    mounted() {
      Equreka.initTermHover();
    },
    head() {
      return {
        bodyAttrs: {
          class: `page-data page-${this.type} ${this.category}`
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