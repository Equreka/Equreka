<template>    
  <header class="header">
    <nav class="navbar">
      <!-- Button: Favorites -->
      <NuxtLink class="btn" :to="localePath('/favorites/')" :title="$t('Favorites')">
        <span class="visually-hidden">{{ $t('Favorites') }}</span>
        <i class="bi bi-heart"></i>
      </NuxtLink>
      
      <!-- Button: Favorites -->
      <NuxtLink class="btn" :to="localePath('/favorites/')" :title="$t('Favorites')">
        <span class="visually-hidden">{{ $t('Favorites') }}</span>
        <i class="bi bi-heart"></i>
      </NuxtLink>

      <!-- Button: Home -->
      <NuxtLink class="logo" :to="localePath('/')">
        <span class="visually-hidden">{{ $t('Home') }}</span>
        <Logo/>
      </NuxtLink>

      <!-- Button: Favorites -->
      <NuxtLink class="btn" :to="localePath('/favorites/')" :title="$t('Favorites')">
        <span class="visually-hidden">{{ $t('Favorites') }}</span>
        <i class="bi bi-heart"></i>
      </NuxtLink>
      <!-- Button: Favorites -->
      <NuxtLink class="btn" :to="localePath('/favorites/')" :title="$t('Favorites')">
        <span class="visually-hidden">{{ $t('Favorites') }}</span>
        <i class="bi bi-heart"></i>
      </NuxtLink>
    </nav>
  </header>
</template>

<script>
  import Equreka from '@/equreka';
  export default {
    data () {
      return {
        themeColors: {
          'light':  'Light',
          'dark':   'Dark',
          'system': 'System default'
        },
        categories: {}
      }
    },
    computed: {
      availableLocales () {
        return this.$i18n.locales
      }
    },
    methods: {
      themeTransition(newTheme, actualTheme, systemQuery) {
        Equreka.themeTransition(newTheme, actualTheme, systemQuery);
      }
    },
    async fetch () {
      this.categories = await fetch(process.env.baseUrl + '/api/categories/').then(res => res.json());
    }
  }
</script>