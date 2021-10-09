<template>
	<main role="main" class="settings">
		<div class="container">
			<div class="card">
				<div class="card-body">
					<h2 class="mb-4">
						{{ $t('settings.title') }}
						<small>
							v{{ version }}
						</small>
					</h2>
					<!-- Language -->
					<h3 class="h6 mb-3">
						{{ $t('settings.language.title') }}
					</h3>
					<div class="dropdown mb-4">
						<button class="px-4 btn btn-primary dropdown-toggle" type="button" id="dropdown-language" data-bs-toggle="dropdown" aria-expanded="false">
							<i class="bi bi-translate me-2"></i>
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
					<h3 class="h6 mb-3">
						{{ $t('settings.theme.title') }}
					</h3>
					<div class="dropdown mb-4">
						<button class="px-4 btn btn-primary dropdown-toggle" type="button" id="dropdown-theme" data-bs-toggle="dropdown" aria-expanded="false" :title="$t('settings.theme.change')">
							<i class="me-2 bi" :class="`bi-${$colorMode.preference}`"></i>
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
									<i class="me-2 bi" :class="`bi-${code}`"></i>
									{{ $t(`settings.theme.options.${code}`) }}
								</button>
							</li>
						</ul>
					</div>
					<!-- Favorites -->
					<h3 class="h6 mb-3">
						{{ $t('settings.favorites.title') }}
					</h3>
					<div class="vstack gap-3">
						<button class="px-4 btn btn-primary align-self-start" @click="exportFavorites">
							<i class="me-2 bi bi-box-arrow-up"></i>
							<span>{{ $t('settings.favorites.export') }}</span>
						</button>
						<button class="px-4 btn btn-primary align-self-start" @click="importFavorites">
							<i class="me-2 bi bi-box-arrow-in-down"></i>
							<span>{{ $t('settings.favorites.import') }}</span>
						</button>
					</div>
				</div>
			</div>
			<div class="links mx-auto" v-if="layout == 'app'">
				<!-- Pages -->
				<div class="hstack justify-content-center gap-3 small mt-4 mb-3" v-if="layout == 'app'">
					<NuxtLink :to="localePath('/about')">{{ $t('about.title') }}</NuxtLink>
					<NuxtLink :to="localePath('/contact')">{{ $t('contact.title') }}</NuxtLink>
					<NuxtLink :to="localePath('/donate')">{{ $t('donate.title') }}</NuxtLink>
				</div>
				<!-- Social -->
				<div class="hstack justify-content-center gap-3 small">
					<a class="github" target="_blank" rel="noopener nofollow" href="https://github.com/Equreka" title="Github"><i class="icon bi bi-github"></i></a>
					<a class="facebook" target="_blank" rel="noopener nofollow" href="https://fb.me/Equreka" title="Facebook"><i class="icon bi bi-facebook"></i></a>
					<a class="twitter" target="_blank" rel="noopener nofollow" href="https://twitter.com/Equreka" title="Twitter"><i class="icon bi bi-twitter"></i></a>
					<a class="discord" target="_blank" rel="noopener nofollow" href="https://discord.gg/NZypuxvAB6" title="Discord"><i class="icon bi bi-discord"></i></a>
				</div>
			</div>
		</div>
	</main>
</template>

<script>
	import { version } from '../package.json'
	import Utils from "~/utils";
	import Favorites from "~/utils/favorites";
	export default {
		data () {
			return {
				version: version,
				favorites: false,
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
			},
			setLanguage(language) {
				Utils.setLanguage(language);
			},
			exportFavorites() {
				const data = Favorites.export();
				const blob = new Blob([data], { type: "text/json" });
				const link = document.createElement("a");

				link.download = 'equreka-favorites.json';
				link.href = window.URL.createObjectURL(blob);
				link.dataset.downloadurl = ["text/json", link.download, link.href].join(":");

				const evt = new MouseEvent("click", {
					view: window,
					bubbles: true,
					cancelable: true,
				});

				link.dispatchEvent(evt);
				link.remove()
			},
			async importFavorites(event) {
				let success = false;
				const file = event.target.files[0];
				if (!file) {
					return;
				}
				const reader = new FileReader();
				reader.onload = async (event) => {
					const data = JSON.parse(event.target.result);
					success = Favorites.import(data);
					if(success) {
						alert('success');
					} else {
						alert('error');
					}
					//this.favorites = await Favorites.getAll();
				}
				reader.readAsText(file);
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