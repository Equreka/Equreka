<template>    
  <header class="header">
    <nav class="navbar navbar-expand-md">
      <div class="container">
        <!-- Left -->
        <div class="left">
          <NuxtLink class="logo" :to="localePath('/')">
            <Logo/>
          </NuxtLink>
          <b-dropdown variant="link" :text="$t('Menu')" :title="$t('Menu')" no-caret left>
            <template #button-content class="focus-visible">
              <span class="visually-hidden">{{ $t('Menu') }}</span>
              <i class="bi bi-list"></i>
            </template>
            <b-dropdown-header>
              {{ $t('Categories') }}
            </b-dropdown-header>
            <b-dropdown-item v-for="category in categories" :key="category" :to="localePath(`/${category}/`)">
              {{ $t(`${category}.cap`) }}
            </b-dropdown-item>
            <!--
            <b-dropdown-divider></b-dropdown-divider>
            <b-dropdown-header>
              {{ $t('Types') }}
            </b-dropdown-header>
            <b-dropdown-item v-for="type in types" :key="type" :to="localePath(`/${type}/`)">
              {{ $t(`${type}.cap`) }}
            </b-dropdown-item>-->
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
            <span class="visually-hidden">{{ $t('Home') }}</span>
            <i class="bi bi-house"></i>
          </NuxtLink>
          <!-- Button: Favorites -->
          <NuxtLink class="btn" :to="localePath('/favorites/')" :title="$t('Favorites')">
            <span class="visually-hidden">{{ $t('Favorites') }}</span>
            <i class="bi bi-heart"></i>
          </NuxtLink>
          <!-- Dropdown: Theme -->
          <b-dropdown variant="link" v-model="$colorMode.preference" no-caret right :title="$t('Change theme')">
            <template #button-content>
              <span class="visually-hidden">{{ $t('Change theme') }}</span>
              <i class="bi bi-moon theme-icon"></i>
            </template>
            <b-dropdown-header>
              {{ $t('Theme') }}
            </b-dropdown-header>
            <b-dropdown-item v-for="(option, code) in themeColors" :key="code"  @click="$colorMode.preference = code, themeTransition(code, $colorMode.value, $colorMode._darkWatcher.matches)">
              <i class="icon bi" :class="`bi-${code}`"></i> {{ $t(option) }}
            </b-dropdown-item>
          </b-dropdown>          
          <!-- Dropdown: Language -->
          <b-dropdown class="dropdown-language" variant="link" no-caret right :title="$t('Change language')">
            <template #button-content>
              <span class="visually-hidden">{{ $t('Change language') }}</span>
              <i class="bi bi-globe"></i>
            </template>
            <b-dropdown-header>
              {{ $t('Language') 
              }}</b-dropdown-header>
            <b-dropdown-item v-for="locale in availableLocales" :key="locale.code" :to="switchLocalePath(locale.code)">
              {{ locale.name }}
            </b-dropdown-item>
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
        categories: Equreka.CATEGORIES,
        types: Equreka.TYPES
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
    }
  }
</script>