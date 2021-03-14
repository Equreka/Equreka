<template>
  <main role="main" class="settings">
    <div class="container">
      <h2 class="page-title">{{ $t('page.settings.title') }}</h2>
      <p class="lead mb-4">{{ $t('page.settings.lead') }}</p>

      <h3 class="h5 mb-3">{{ $t('Language') }}</h3>
      <!-- Dropdown: Language -->
      <div class="dropdown mb-4">
        <button class="btn btn-primary dropdown-toggle" type="button" id="dropdownMenuButton1" data-bs-toggle="dropdown" aria-expanded="false">
          {{ $t('Change language') }}
        </button>
        <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton1">
          <li v-for="locale in availableLocales" :key="locale.code">
            <NuxtLink class="dropdown-item" :to="switchLocalePath(locale.code)">
              {{ locale.name }}
            </NuxtLink>
          </li>
        </ul>
      </div>
      
      <h3 class="h5">{{ $t('Theme') }}</h3>
      <!-- Dropdown: Theme -->                    
      <div class="dropdown">
        <button class="btn btn-primary dropdown-toggle" type="button" id="dropdown-theme" data-bs-toggle="dropdown" aria-expanded="false" :title="$t('Change language')">
          {{ $t('Change theme') }}
        </button>
        <ul class="dropdown-menu" aria-labelledby="dropdown-theme">
          <li><h6 class="dropdown-header">{{ $t('Theme') }}</h6></li>
          <li v-for="(option, code) in themes" :key="code">
            <button class="dropdown-item" @click="$colorMode.preference = code, themeTransition(code, $colorMode.value, $colorMode._darkWatcher.matches)">
              <i class="icon bi" :class="`bi-${code}`"></i>
              {{ $t(option) }}
            </button>
          </li>
        </ul>
      </div>

      <hr class="my-4">

      <h3 class="h6 mb-2">Equreka</h3>
      <p>Version: {{ version }}</p>
    </div>
  </main>
</template>

<script>
  import { version } from '../package.json'
  import Equreka from '@/equreka';
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