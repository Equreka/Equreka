<template>    
  <header class="app-menu">
    <nav class="navbar">
      <!-- Button: Home -->
      <NuxtLink class="btn home" :to="localePath('/')" :title="$t('Home')">
        <span class="visually-hidden">{{ $t('Home') }}</span>
        <i class="bi bi-house"></i>
      </NuxtLink>
      
      <!-- Button: Search -->
      <NuxtLink class="btn search" :to="localePath('/search/')" :title="$t('Search')">
        <span class="visually-hidden">{{ $t('Search') }}</span>
        <i class="bi bi-search"></i>
      </NuxtLink>

      <!-- Button: Favorites -->
      <NuxtLink class="btn favorites" :to="localePath('/favorites/')" :title="$t('Favorites')">
        <span class="visually-hidden">{{ $t('Favorites') }}</span>
        <i class="bi bi-heart"></i>
      </NuxtLink>
      <!-- Button: Settings -->
      <NuxtLink class="btn settings" :to="localePath('/settings/')" :title="$t('Settings')">
        <span class="visually-hidden">{{ $t('Settings') }}</span>
        <i class="bi bi-gear"></i>
      </NuxtLink>
    </nav>
  </header>
</template>

<script>
  import Equreka from '@/equreka';
  export default {
    data () {
      return {
        themes: {
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
      this.categories = await fetch(`${process.env.api}/categories/`).then(res => res.json());
    }
  }
</script>