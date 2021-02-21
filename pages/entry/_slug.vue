<template>
  <main role="main" class="page-single">
    <header class="subject mathematics">
      <div class="container">
        <h2 class="small">Mathematics</h2>
        <h1 class="title">{{ data.name }}</h1>
      </div>
    </header>
    <div class="container">
      <!-- Eureka! -->
      <section class="eureka">
        <!-- Expression -->
        <div class="expression">
          <span>$${{ data.expression }}$$</span>
        </div>
        <!-- Deconstruction -->
        <div class="deconstruction">
          <ul>
            <li data-eureka='{"identifier": "E", "name": "energy", "type": "variable"}'><span>E</span> <a href="#">Energy</a></li>
            <li data-eureka='{"identifier": "m", "name": "mass", "type": "variable"}'><span>m</span> <a href="#">Mass</a></li>
            <li data-eureka='{"identifier": "c", "name": "speed of light", "type": "constant"}'><span>c</span> <a href="#" data-toggle="tooltip" data-html="true" title="~ 3×10<sup>8</sup> m/s">Speed of light</a></li>
          </ul>
        </div>
      </section>
      <!-- Downloads -->
      <section class="download">
        <a class="btn btn-primary btn-download" download="mass-energy-equivalence.json"><i class="fa fa-download mr-3"></i>Download JSON</a>
      </section>
      <!-- Code -->
      <section class="code text-light">
        <textarea class="form-control d-none" rows="4">
          <math>
            <mi>E</mi>
            <mo>=</mo>
            <mi>m</mi>
            <msup>
              <mi>c</mi>
              <mn>2</mn>
            </msup>
          </math>
        </textarea>
      </section>
      <!-- Information -->
      <section class="information">
        <h4>Description</h4>
        <p class="text-justify">
          {{ data.description }}
        </p>
      </section>
      <!-- References -->
      <section class="references">
        <h4>References</h4>
        <ul>
          <li>
            <cite id="CITEREFEinstein.2C_A.1905" class="citation">
              Einstein, A. (1905), "Ist die Trägheit eines Körpers von seinem Energieinhalt abhängig?", <i>Annalen der Physik</i>, <b>18</b>: 639–643, Bibcode:<a rel="nofollow" class="external text" href="http://adsabs.harvard.edu/abs/1905AnP...323..639E">1905AnP...323..639E</a>, doi:<a rel="nofollow" class="external text" href="http://doi.org/10.1002%2Fandp.19053231314">10.1002/andp.19053231314</a>
            </cite>
          </li>
        </ul>
      </section>
    </div>
  </main>
</template>

<script>
  export default {
    data () {
      return {
        data: {},
      }
    },
    components: {
    },
    methods: {
      renderMathJax () {
        if(window.MathJax) {
          MathJax = {
            tex: {
              inlineMath: [['$', '$'], ['\\(', '\\)']]
            },
            svg: {
              fontCache: 'global'
            }
          }
        }
      }
    },
    mounted() {
      this.renderMathJax();
    },
    activated() {
      this.$fetch();
    },
    async asyncData ({ params, redirect }) {
      const slug = params.slug;
      const data = await fetch(
        process.env.baseUrl + '/api/entries/' + slug
      ).then((res) => res.json())

      if(data) {
        return { 
          data: data
        }
      } else {
        redirect('../');
      }
    }
  }
</script>