<template>
	<main role="main" class="settings">
		<div class="container">
			<div class="card">
				<div class="card-body">
					<h2 class="page-title">{{ $t('page.settings.title') }}</h2>
					<p class="lead mb-4">{{ $t('page.settings.lead') }}</p>
					<!-- Language -->
					<h3 class="h5 mb-3">{{ $t('Language') }}</h3>
					<div class="dropdown mb-4">
					<button class="btn btn-primary dropdown-toggle" type="button" id="dropdown-language" data-bs-toggle="dropdown" aria-expanded="false">
						{{ $t('Change language') }}
					</button>
					<ul class="dropdown-menu" aria-labelledby="dropdown-language">
						<li><h6 class="dropdown-header">{{ $t('Language') }}</h6></li>
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
					<div class="hstack gap-3">
						<h3 class="h5 mb-0">Equreka</h3>

						<p class="mb-0">Version: {{ version }}</p>
					</div>
					<!-- Pages -->
					<nav class="nav nav-pages mt-3 mb-0" v-if="layout == 'app'">
						<NuxtLink class="nav-link" :to="localePath('/about')">{{ $t('About') }}</NuxtLink>
						<NuxtLink class="nav-link" :to="localePath('/contact')">{{ $t('Contact') }}</NuxtLink>
						<NuxtLink class="nav-link" :to="localePath('/donate')">{{ $t('Donate') }}</NuxtLink>
					</nav>
				</div>
			</div>
		</div>
		<!-- Social -->
		<ul class="nav nav-social" v-if="layout == 'app'">
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
	</main>
</template>

<script>
  import { version } from '../package.json'
  import Utils from "~/utils";;
  export default {
    data () {
      return {
        version: version,
        categories: Utils.CATEGORIES,
        types: Utils.TYPES,
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
      },
		computed: {
			layout() {
				return (this.$device.isMobile) ? 'app' : 'web';
			}
		}
    },
    methods: {
      themeTransition(newTheme, actualTheme, systemQuery) {
        Utils.themeTransition(newTheme, actualTheme, systemQuery);
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