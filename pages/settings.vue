<template>
	<main role="main" class="settings">
		<div class="container">
			<div class="card">
				<div class="card-body">
					<h2 class="page-title">
						{{ $t('settings.title') }}
					</h2>
					<p class="lead mb-4">
						{{ $t('settings.lead') }}
					</p>
					<!-- Language -->
					<h3 class="h5 mb-3">
						{{ $t('settings.language.title') }}
					</h3>
					<div class="dropdown mb-4">
						<button class="btn btn-primary dropdown-toggle" type="button" id="dropdown-language" data-bs-toggle="dropdown" aria-expanded="false">
							{{ $t('settings.language.change') }}
						</button>
						<ul class="dropdown-menu" aria-labelledby="dropdown-language">
							<li>
								<h6 class="dropdown-header">
									{{ $t('settings.language.choose') }}
								</h6>
							</li>
							<li v-for="locale in availableLocales" :key="locale.code">
								<NuxtLink class="dropdown-item" :to="switchLocalePath(locale.code)" @click="setLocale(local.code)">
									{{ locale.name }}
								</NuxtLink>
							</li>
						</ul>
					</div>
					<!-- Theme -->
					<h3 class="h5 mb-3">
						{{ $t('settings.theme.title') }}
					</h3>
					<div class="dropdown">
						<button class="btn btn-primary dropdown-toggle" type="button" id="dropdown-theme" data-bs-toggle="dropdown" aria-expanded="false" :title="$t('settings.theme.change')">
							{{ $t('settings.theme.change') }}
						</button>
						<ul class="dropdown-menu" aria-labelledby="dropdown-theme">
							<li>
								<h6 class="dropdown-header">
									{{ $t('settings.theme.choose') }}
								</h6>
							</li>
							<li v-for="(option, code) in themes" :key="code">
								<button class="dropdown-item" @click="$colorMode.preference = code, themeTransition(code, $colorMode.value)">
									<i class="icon bi" :class="`bi-${code}`"></i>
									{{ $t(`settings.theme.options.${code}`) }}
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
						<NuxtLink class="nav-link" :to="localePath('/about')">{{ $t('about.title') }}</NuxtLink>
						<NuxtLink class="nav-link" :to="localePath('/contact')">{{ $t('contact.title') }}</NuxtLink>
						<NuxtLink class="nav-link" :to="localePath('/donate')">{{ $t('donate.title') }}</NuxtLink>
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
	import Utils from "~/utils";
	export default {
		data () {
			return {
			version: version,
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
			layout() {
				return (this.$device.isMobile) ? 'app' : 'web';
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