<template>
  <main role="main">
    <div class="category" :class="data.category.slug">
      <div class="container">
        <div class="d-flex align-items-center justify-content-between">
          <div class="info">
            <h2 class="category-name">{{ data.category.name }}</h2>
            <h1 class="entry-name">{{ data.name }}</h1>
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
            <b-dropdown-item @click="">
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
          <span>$${{ expparser(data) }}$$</span>
        </div>
        <!-- Terms -->
        <div class="terms">
          <h4>Terms</h4>
          <ul>
            <li data-eureka='{"identifier": "E", "name": "energy", "type": "variable"}'><span>E</span> <a href="#">Energy</a></li>
            <li data-eureka='{"identifier": "m", "name": "mass", "type": "variable"}'><span>m</span> <a href="#">Mass</a></li>
            <li data-eureka='{"identifier": "c", "name": "speed of light", "type": "constant"}'><span>c</span> <a href="#" data-toggle="tooltip" data-html="true" title="~ 3×10<sup>8</sup> m/s">Speed of light</a></li>
          </ul>
        </div>
      </section>
      <!-- Code -->
      <section class="code text-light">
        <textarea class="form-control" :value="data.expression" rows="1"></textarea>
      </section>
      <!-- Description -->
      <section class="description" v-if="data.description">
        <h3>Description</h3>
        <p class="text-justify">{{ data.description }}</p>
      </section>
      <!-- References -->
      <section class="references" v-if="data.references[0]">
        <h3>References</h3>
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
    <script>
      MathJax = {
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
    </script>
  </main>
</template>

<script>
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
      expparser(data) {
        var expression = data.expression;
        data.variables.forEach(item => {
          var parserSymbol = item.variable.symbol;
          expression = expression.replace(parserSymbol, '\\class{variable '+parserSymbol+'}{'+parserSymbol+'}');
        });
        return expression;
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
          json: JSONify(data)
        }
      } else {
        redirect('/');
      }
    }
  }
</script>