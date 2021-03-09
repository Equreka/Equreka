<template>
  <main>
    <div class="container">
      <h2>{{ $t('About') }}</h2>
      <p class="lead">Equreka is a 100% free and ad-free, open-source platform for everyone.</p>
      <p class="bold">Hopefully you will find this usefull and will inspire to learn more, create and contribute to human-kind.</p>
      <p>You can contribute in many ways, from sharing to contributing directly to the project in our Github.</p>
      
      <h4 class="mt-5">Special thanks to</h4>
      <p class="lead">Science and all the people that creates awesome stuff, all philosophers, all alchemists, all scientists, to all those people who contributed to science, to civilization, to humanity.</p>
      <p>All open source projects and specially the ones that made possible this project</p>
      <p>You can check our <a  target="_blank" rel="noopener nofollow" href="https://github.com/Equreka">Github</a> for a more complete list in our source-code.</p>
      <p>Here are some projects (in no particular order) that made this project possible:</p>
        <a class="btn btn-link" target="_blank" rel="noopener nofollow"
          v-for="(url, title) in projects"
          :key="title"
          :href="url"
        >{{ title }}</a>
    </div>
  </main>
</template>

<script>
  export default {
    data() {
      return {
        projects: {
          'Github':               'https://github.com/',
          'Wikimedia Foundation': 'https://wikimediafoundation.org/',
          'Stack Overflow':       'https://stackoverflow.com/',
          'Node.js':              'https://nodejs.org/',
          'Vue.js':               'https://vuejs.org/',
          'Nuxt.js':              'https://nuxtjs.org/',
          'Mongoose':             'https://mongoosejs.com/',
          'Express':              'https://expressjs.com/es/',
          'Bootstrap':            'https://github.com/twbs/bootstrap',
          'Bootstrap Icons':      'https://github.com/twbs/icons',
          'Bootstrap Vue':        'https://bootstrap-vue.org/',
          'Icons8':               'https://icons8.com/',
        }
      }
    },
    head() {
      return {
        bodyAttrs: {
          class: `page-about`
        }
      }
    }
  }
</script>