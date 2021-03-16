<template>
  <main role="main" class="home">
    <div class="container">

      <template v-if="layout === 'web'">
        <h2 class="page-title">{{ $t('page.home.title') }}</h2>
        <div class="categories row" v-for="category in categories" :key="category.slug" :class="category.slug">
          <div class="col-12 col-lg-3 mb-3">
            <NuxtLink :to="localePath(`/${category.slug}/`)">
              <h3 class="title">{{ $t(category.name) }}</h3>
            </NuxtLink>
          </div>
          <div class="col-12 col-lg-9">
            <div class="list">
              <NuxtLink :to="localePath(`/${category.slug}/`)">
                {{ $t(category.name) }} Subcategory
              </NuxtLink>
            </div>
          </div>
        </div>
      </template>

      <!-- Logo & Search-bar -->
      <template v-else>
        <div id="search-bar" class="search-bar lg mb-3">
          <form :action="localePath('/search/')">
            <label for="search-bar" class="form-label visually-hidden">
              {{ $t('search.input-label') }}
            </label>
            <input id="search-bar" type="search" name="q" class="form-control" autocomplete="off"
              :placeholder="$t('search.input-placeholder')"/>
            <button class="btn btn-link" type="submit" :aria-label="$t('search.button-submit')">
              <i class="bi bi-search"></i>
            </button>
          </form>
        </div>

        <!-- Categories -->
        <h2 class="page-title">{{ $t('page.home.title') }}</h2>
        <div class="card card-category" v-for="category in categories" :key="category.slug" :class="category.slug">
          <div class="card-body">
            <h3 class="card-title">{{ $t(category.name) }}</h3>
            <p>{{ $t(`page.categories.${category.slug}.lead`) }}</p>
            <nuxt-link class="stretched-link" :to="localePath(`/${category.slug}/`)">
              <span class="visually-hidden">Go to category</span>
            </nuxt-link>
          </div>         
        </div>
      </template>
    </div>
  </main>
</template>

<script>
import categories from "/static/data/categories.json";
export default {
  data () {
    return {
      categories: {},
      layout: (this.$device.isMobile) ? 'app' : 'web'
    }
  },
  async asyncData() {
    let data;
    try {
      data = await fetch(`${process.env.api}/categories/`).then(res => res.json());
    } catch {
      try {
        data = categories;
      } catch {
        data = {}
      }
    }
    return {
      categories: data
    }
  },
  head() {
    return {
      bodyAttrs: {
        class: `page-home`
      }
    }
  },
}
</script>