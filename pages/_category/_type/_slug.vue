<template>
  <main role="main">
    <PageHeader :category="category" :type="type" :name="name" :data="data" :json="json" />
  </main>
</template>


<script>
  import Equreka from '@/constants';
  export default {
    data () {
      return {
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
          class: 'page-unit ' + this.category.slug
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