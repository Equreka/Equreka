<template>
  <main role="main">
    <PageHeader :category="category" :type="type" :name="name" :data="data" :json="json" />
    <div class="container">
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
        <h3 class="title">{{ $t('Values') }}</h3>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th scope="col" class="constant name">{{ $t('Value') }}</th>
                <th scope="col" class="constant unit" colspan="2">{{ $t('Unit') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="value in data.values" :key="value.value" :class="TERM_SELECTOR">
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
            </tbody>
          </table>
        </div>
      </section>
      <!-- Description -->
      <section class="description" v-if="data.description">
        <h3 class="title">{{ $t('Description') }}</h3>
        <p>{{ parserLaTeX( data.description ) }}</p>
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
        TERM_SELECTOR: Equreka.TERM_SELECTOR.substring(1),
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
    head() {
      return {
        bodyAttrs: {
          class: 'page-data page-unit ' + this.category.slug
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