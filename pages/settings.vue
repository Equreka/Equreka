<template>
  <main role="main" class="settings">
    <div class="container">
      <h2 class="page-title">{{ $t('page.settings.title') }}</h2>
      <p class="lead mb-4">{{ $t('page.settings.lead') }}</p>
      <!-- Language -->
      <h3 class="h5 mb-3">{{ $t('Language') }}</h3>
      <div class="dropdown mb-4">
        <button class="btn btn-primary dropdown-toggle" type="button" id="dropdown-language" data-bs-toggle="dropdown" aria-expanded="false">
          {{ $t('Change language') }}
        </button>
        <ul class="dropdown-menu" aria-labelledby="dropdown-language">
          <li><h6 class="dropdown-header">{{ $t('Langauge') }}</h6></li>
          <li v-for="locale in availableLocales" :key="locale.code">
            <NuxtLink class="dropdown-item" :to="switchLocalePath(locale.code)" @click="setLocale(local.code)">
              {{ locale.name }}
            </NuxtLink>
          </li>
        </ul>
      </div>      
      <!-- Theme -->
      <h3 class="h5 mb-3">{{ $t('Theme') }}</h3>
      <div class="dropdown">
        <button class="btn btn-primary dropdown-toggle" type="button" id="dropdown-theme" data-bs-toggle="dropdown" aria-expanded="false" :title="$t('Change language')">
          {{ $t('Change theme') }}
        </button>
        <ul class="dropdown-menu" aria-labelledby="dropdown-theme">
          <li><h6 class="dropdown-header">{{ $t('Theme') }}</h6></li>
          <li v-for="(option, code) in themes" :key="code">
            <button class="dropdown-item" @click="$colorMode.preference = code, themeTransition(code, $colorMode.value)">
              <i class="icon bi" :class="`bi-${code}`"></i>
              {{ $t(option) }}
            </button>
          </li>
        </ul>
      </div>
      <hr class="my-4"> 
      <!-- Version -->
      <h3 class="h6 mb-2">Equreka</h3>
      <p>Version: {{ version }}</p>
      <!-- Pages -->
      <nav class="nav nav-pages">
        <NuxtLink class="nav-link" :to="localePath('/about')">{{ $t('About') }}</NuxtLink>
        <NuxtLink class="nav-link" :to="localePath('/contact')">{{ $t('Contact') }}</NuxtLink>
        <NuxtLink class="nav-link" :to="localePath('/donate')">{{ $t('Donate') }}</NuxtLink>
      </nav>
      <hr class="mt-3 mb-4">
      <!-- Social -->
      <ul class="nav nav-social">
        <li class="nav-item">
          <a class="nav-link github" target="_blank" rel="noopener nofollow" href="https://github.com/Equreka" title="Github"><i class="icon bi bi-github"></i></a>
        </li>
        <li class="nav-item">
          <a class="nav-link facebook" target="_blank" rel="noopener nofollow" href="https://fb.me/Equreka" title="Facebook"><i class="icon bi bi-facebook"></i></a>
        </li>
        <li class="nav-item">
          <a class="nav-link twitter" target="_blank" rel="noopener nofollow" href="https://twitter.com/Equreka" title="Twitter"><i class="icon bi bi-twitter"></i></a>
        </li>
        <li class="nav-item">
          <a class="nav-link discord" target="_blank" rel="noopener nofollow" href="https://discord.gg/NZypuxvAB6" title="Discord"><i class="icon bi bi-discord"></i></a>
        </li>
      </ul>
    </div>
  </main>
</template>

<script>
  import { version } from '../package.json'
  import Equreka from "@/equreka";;
  export default {
    data () {
      return {
        version: version,
        categories: Equreka.CATEGORIES,
        types: Equreka.TYPES,
        themes: {
          'light':  'Light',
          'dark':   'Dark',
          'system': 'System default'
        },
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
    head() {
      return {
        bodyAttrs: {
          class: `page-settings`
        }
      }
    }
  }
</script>