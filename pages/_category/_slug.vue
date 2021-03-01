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
      <!-- Eureka! -->
      <section class="eureka">
        <!-- Expression -->
        <div class="expression">
          <div id="expression">$${{ parserLaTeX(data.expressionIntern) }}$$</div>
        </div>
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
      <!-- Code -->
      <section class="code">
        <h3 class="mb-4">Code</h3>
        <code>{{ data.expression }}</code>
      </section>
      <!-- Description -->
      <section class="description" v-if="data.description">
        <h3 class="mb-4">Description</h3>
        <p class="text-justify">{{ parserLaTeX( data.description ) }}</p>
      </section>
      <!-- References -->
      <section class="references" v-if="data.references[0]">
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
  const EQK_TERM_SELECTOR = '.eqk-term';
  const equrekaHover2 = (event, action) => {
    console.log(event.target);
    console.log(event.target.classList.contains(EQK_TERM_SELECTOR.substring(1)));
    if(event.target.classList.contains(EQK_TERM_SELECTOR.substring(1))) {
      var symbol = event.target.classList[2];
      
      // Type of term
      if(event.target.classList.contains('variable')) {
        type = 'variable';
      } else if(event.target.classList.contains('constant')) {
        type ='constant';
      }
      
      // If contains a type
      if(type) {
        const elements = document.querySelectorAll(`${EQK_TERM_SELECTOR}.${type}.${symbol}`);
        Array.from(elements).forEach(function(element) {
          element.classList[action]('hover');
        });
      }
    }
  }
  const equrekaHover = (event, element, action) => {
    var type = false
    if(event.target == element) {
      var symbol = event.target.classList[2];
      
      // Type of term
      if(event.target.classList.contains('variable')) {
        type = 'variable';
      } else if(event.target.classList.contains('constant')) {
        type ='constant';
      }
      
      // If contains a type
      if(type) {
        const elements = document.querySelectorAll(`${EQK_TERM_SELECTOR}.${type}.${symbol}`);
        Array.from(elements).forEach(function(element) {
          element.classList[action]('hover');
        });
      }
    }
  }
  const JSONify = (json) => {
    let type = "data:text/json;charset=utf-8,";
    return type + encodeURIComponent(JSON.stringify(json));
  }

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
      initMathJax() {
        window.MathJax = {
          loader: {
            load: ['[tex]/html']
          },
          tex: { 
            inlineMath: [['$', '$']],
            processEscapes: true,
            packages: { '[+]': ['html'] }
          },
          svg: {
            fontCache: 'global'
          }
        }
      },
      initEqureka() {
        var elements = document.querySelectorAll(EQK_TERM_SELECTOR);
        //var sel = document.getElementById('expression').firstChild;
        //sel.addEventListener('mouseenter', (event) => { equrekaHover2(event, 'add') }, false);
        Array.from(elements).forEach(function(element) {
          element.addEventListener('pointerenter', (event) => { equrekaHover(event, element, 'add') }, false);
          element.addEventListener('pointerleave', (event) => { equrekaHover(event, element, 'remove') }, false);
        });
      },
      parserLaTeX(data) {
        let parsedData;
        const classPrefix = EQK_TERM_SELECTOR.substring(1);
        const regex = /\\(var|const)\{(.*?)\}/g;
        parsedData = data.replace(regex, function(global, type, symbol) {
          var type = (type === 'var') ? 'variable' : 'constant';
          return `\\class{${classPrefix} ${type} ${symbol}}{${symbol}}`;
        });
        return parsedData;
      },
      parserCleaner(data, removeSigns = false) {
        let parsedData;
        const classPrefix = EQK_TERM_SELECTOR.substring(1);
        const regex = /\\(var|const)\{(.*?)\}/g;
        parsedData = data.replace(regex, function(global, type, symbol) {
          return symbol;
        });

        if(removeSigns) {
          parsedData = parsedData.replace(/\$(.*?)\$/g, '$1');
        }

        return parsedData;
      }
    },
    beforeMount(data) {
      this.initMathJax();
    },
    mounted() {
      this.initEqureka();
    },
    async asyncData ({ params, redirect }) {
      const slug = params.slug;
      const data = await fetch(
        process.env.baseUrl + '/api/entries/' + slug
      ).then((res) => res.json());
      if(data) { 
        return { 
          data: data,
          json: JSONify(data)
        }
      } else {
        redirect('/');
      }
    }
  }
</script>