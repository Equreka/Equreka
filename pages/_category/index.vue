<template> 
  <main role="main">
    <header class="category" :class="data.slug">
      <div class="container">
        <h2 class="small">Category</h2>
        <h1 class="title">{{ data.name }}</h1>
      </div>
    </header>
    <div class="container py-4">
      <div class="list mb-4">
        <a href="./test">Lorem</a>
        <a href="./test">Ipsum dolor</a>
        <a href="./test">Sit amet</a>
        <a href="./test">Consectetur adipiscing</a>
        <a href="./test">Fusce ut arcu</a>
        <a href="./test">Sapien feugiat</a>
        <a href="./test">Luctus et et magna</a>
        <a href="./test">Donec ac erat</a>
        <a href="./test">Id ante</a>
        <a href="./test">Lorem</a>
        <a href="./test">Ipsum dolor</a>
        <a href="./test">Sit amet</a>
        <a href="./test">Consectetur adipiscing</a>
        <a href="./test">Fusce ut arcu</a>
        <a href="./test">Sapien feugiat</a>
        <a href="./test">Luctus et et magna</a>
        <a href="./test">Donec ac erat</a>
        <a href="./test">Id ante</a>
        <a href="./test">Lorem</a>
        <a href="./test">Ipsum dolor</a>
        <a href="./test">Sit amet</a>
        <a href="./test">Consectetur adipiscing</a>
        <a href="./test">Fusce ut arcu</a>
        <a href="./test">Sapien feugiat</a>
        <a href="./test">Luctus et et magna</a>
        <a href="./test">Donec ac erat</a>
        <a href="./test">Id ante</a>
      </div>
      <nav aria-label="Page navigation example d-none">
        <ul class="pagination">
          <li class="page-item"><a class="page-link" href="/">Previous</a></li>
          <li class="page-item"><a class="page-link" href="/">1</a></li>
          <li class="page-item"><a class="page-link" href="/">2</a></li>
          <li class="page-item"><a class="page-link" href="/">3</a></li>
          <li class="page-item"><a class="page-link" href="/">Next</a></li>
        </ul>
      </nav>
    </div>
  </main>
</template>

<script>
  export default {
    data() {
      return {
        data: {},
        subCategories: {}
      }
    },
    async asyncData ({ params, redirect }) {
      console.log(params);
      const slug = params.category;
      const data = await fetch(
        process.env.baseUrl + '/api/categories/' + slug
      ).then((res) => res.json());
      if(data) {
        return {
          data: data,
          subCategories: false
        }
      } else {
        redirect(process.env.baseUrl);
      }
    },
    head: {
      bodyAttrs: {
        class: 'page-category'
      }
    },
  }
</script>

<style>

</style>
