<template>    
  <header>
    <nav class="navbar navbar-expand-md">
      <div class="container">
        <div class="left">
          <a class="navbar-brand" href="/">
            <img src="/assets/brand/logo.png" width="65" alt="Ecureka">
          </a>
          <b-dropdown variant="link" text="Categories" left>
            <b-dropdown-header>Categories</b-dropdown-header>
            <b-dropdown-item v-for="category in categories" :key="category.name" :href="category.slug">{{ category.name }}</b-dropdown-item>
          </b-dropdown>
        </div>
        <div class="center">
          <b-form class="form-search">
            <b-form-input id="search" type="text" placeholder="Search..." aria-label="Search" />
          </b-form>
        </div>
        <div class="right">
          <b-dropdown variant="link" v-model="$colorMode.preference" right>
            <template #button-content>
              <span></span>
              <i class="bi bi-sun"></i>
            </template>
            <b-dropdown-header>Theme</b-dropdown-header>
            <b-dropdown-item v-for="(color, code) in themeColors" :key="code"  @click="$colorMode.preference = code">{{ color }}</b-dropdown-item>
          </b-dropdown>
          <b-dropdown variant="link" right>
            <template #button-content>
              <i class="bi bi-globe"></i>
            </template>
            <b-dropdown-header>Language</b-dropdown-header>
            <b-dropdown-item v-for="(lang, code) in languages" :key="code">{{ lang }}</b-dropdown-item>
          </b-dropdown>
        </div>
      </div>
    </nav>
  </header>
</template>

<script>
  export default {
    data () {
      return {
        languages: {
          'en': 'English',
          'es': 'Spansih'
        },
        themeColors: {
          'system': 'Default',
          'light': 'Light',
          'dark': 'Dark'
        },
        categories: {}
      }
    },
    async fetch () {
      this.categories = await fetch(process.env.baseUrl + '/api/categories/').then(res => res.json());
    }
  }
</script>