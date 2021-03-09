<template>    
  <header class="header">
    <nav class="navbar navbar-expand-md">
      <div class="container">
        <!-- Left -->
        <div class="left">
          <NuxtLink :to="localePath('/')">
            <Logo/>
          </NuxtLink>
          <b-dropdown variant="link" :text="$t('Categories')" :title="$t('Categories')" no-caret left>
            <template #button-content class="focus-visible">
              <span class="visually-hidden">{{ $t('Categories') }}</span>
              <i class="bi bi-list"></i>
            </template>
            <b-dropdown-header>
              {{ $t('Categories') }}
            </b-dropdown-header>
            <b-dropdown-item v-for="category in categories" :key="category.name" :to="localePath('/' + category.slug)">
              {{ $t(category.name) }}
            </b-dropdown-item>
          </b-dropdown>
        </div>
        <!-- Center -->
        <div class="center">
          <Search />
        </div>
        <!-- Right -->
        <div class="right">
          <!-- Button: Home -->
          <NuxtLink class="btn" :to="localePath('/')" :title="$t('Home')">
            <i class="bi bi-house"></i>
            <span class="visually-hidden">{{ $t('Home') }}</span>
          </NuxtLink>
          <!-- Button: Favorites -->
          <NuxtLink class="btn" :to="localePath('/favorites/')" :title="$t('Favorites')">
            <i class="bi bi-heart"></i>
            <span class="visually-hidden">{{ $t('Favorites') }}</span>
          </NuxtLink>
          <!-- Dropdown: Theme -->
          <b-dropdown variant="link" v-model="$colorMode.preference" no-caret right :title="$t('Change theme')">
            <template #button-content>
              <i class="bi bi-moon theme-icon"></i>
              <span class="visually-hidden">{{ $t('Change theme') }}</span>
            </template>
            <b-dropdown-header>
              {{ $t('Theme') }}
            </b-dropdown-header>
            <b-dropdown-item v-for="(option, code) in themeColors" :key="code"  @click="$colorMode.preference = code, themeTransition(code, $colorMode.value, $colorMode._darkWatcher.matches)">
              {{ $t(option) }}
            </b-dropdown-item>
          </b-dropdown>          
          <!-- Dropdown: Language -->
          <b-dropdown variant="link" no-caret right :title="$t('Change language')">
            <template #button-content>
              <i class="bi bi-globe"></i>
              <span class="visually-hidden">{{ $t('Change language') }}</span>
            </template>
            <b-dropdown-header>{{ $t('Language') }}</b-dropdown-header>
            <b-dropdown-item v-for="locale in availableLocales" :key="locale.code" :to="switchLocalePath(locale.code)">{{ locale.name }}</b-dropdown-item>
          </b-dropdown>
        </div>
      </div>
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