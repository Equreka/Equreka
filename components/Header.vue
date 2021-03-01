<template>    
  <header class="header">
    <nav class="navbar navbar-expand-md">
      <div class="container">
        <div class="left">
          <NuxtLink class="navbar-brand" to="/">
            <img src="/assets/brand/logo.png" width="50" alt="Equreka">
          </NuxtLink>
          <b-dropdown variant="link" text="Categories" left>
            <b-dropdown-header>Categories</b-dropdown-header>
            <b-dropdown-item v-for="category in categories" :key="category.name" :to="category.slug">{{ category.name }}</b-dropdown-item>
          </b-dropdown>
        </div>
        <div class="center">
          <Search />
        </div>
        <div class="right">
          <b-dropdown variant="link" v-model="$colorMode.preference" no-caret right>
            <template #button-content>
              <span></span>
              <i class="bi bi-sun icon-theme"></i>
            </template>
            <b-dropdown-header>Theme</b-dropdown-header>
            <b-dropdown-item v-for="(color, code) in themeColors" :key="code"  @click="$colorMode.preference = code, themeChange()">{{ color }}</b-dropdown-item>
          </b-dropdown>
          <b-dropdown variant="link" no-caret right>
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
          'system': 'System default',
          'light': 'Light',
          'dark': 'Dark'
        },
        categories: {}
      }
    },
    methods: {
      themeChange() {
        const root = document.documentElement;
        root.classList.add('theme-transition');
        setTimeout(() => {
          root.classList.remove('theme-transition');
        }, 350);
      }
    },
    async fetch () {
      this.categories = await fetch(process.env.baseUrl + '/api/categories/').then(res => res.json());
    }
  }
</script>