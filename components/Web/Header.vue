<template>    
	<header class="header">
		<nav class="navbar navbar-expand-md">
			<div class="container">
				<!-- Left -->
				<div class="left">
					<!-- Logo -->
					<NuxtLink class="logo" :to="localePath('/')">
						<Logo/>
					</NuxtLink>
				</div>
				<!-- Center -->
				<div class="center">
					<SearchBar/>
				</div>
				<!-- Right -->
				<div class="right">
					<!-- Button: Calculator -->
					<NuxtLink class="btn" :to="localePath('/calculator/')" :title="$t('calculator.title')">
						<span class="visually-hidden">{{ $t('calculator.title') }}</span>
						<i class="bi bi-plus-square"></i>
					</NuxtLink>
					<!-- Button: Favorites -->
					<NuxtLink class="btn" :to="localePath('/favorites/')" :title="$t('favorites.title')">
						<span class="visually-hidden">{{ $t('favorites.title') }}</span>
						<i class="bi bi-heart"></i>
					</NuxtLink>
					<!-- Dropdown: Theme -->
					<div class="dropdown dropdown-theme btn-group">
						<button class="btn btn-link dropdown-toggle dropdown-toggle-no-caret" type="button" id="dropdown-theme" data-bs-toggle="dropdown" aria-expanded="false" :title="$t('settings.theme.change')">
							<span class="visually-hidden">{{ $t('settings.theme.change') }}</span>
							<i class="bi bi-moon theme-icon"></i>
						</button>
						<ul class="dropdown-menu dropdown-menu-end" aria-labelledby="dropdown-theme">
							<li>
								<h6 class="dropdown-header">{{ $t('settings.theme.choose') }}</h6>
							</li>
							<li v-for="(option, code) in themes" :key="code">
								<button class="dropdown-item" @click="$colorMode.preference = code, themeTransition(code, $colorMode.value)">
									<i class="icon bi" :class="`bi-${code}`"></i>
									{{ $t(`settings.theme.options.${code}`) }}
								</button>
							</li>
						</ul>
					</div>
					<!-- Dropdown: Language -->
					<div class="dropdown dropdown-language btn-group">
						<button class="btn btn-link dropdown-toggle dropdown-toggle-no-caret" type="button" id="dropdown-language" data-bs-toggle="dropdown" aria-expanded="false" :title="$t('settings.language.change')">
							<span class="visually-hidden">{{ $t('settings.language.change') }}</span>
							<i class="bi bi-globe"></i>
						</button>
						<ul class="dropdown-menu dropdown-menu-end" aria-labelledby="dropdown-language">
							<li><h6 class="dropdown-header">{{ $t('settings.language.choose') }}</h6></li>
							<li v-for="locale in availableLocales" :key="locale.code">
								<button class="dropdown-item" @click="$i18n.setLocale(locale.code);setLanguage(locale.code);" :to="switchLocalePath(locale.code)">
									{{ locale.name }}
								</button>
							</li>
						</ul>
					</div>
				</div>
			</div>
		</nav>
	</header>
</template>

<script>
	import Utils from "~/utils";
	import NoDB from "~/utils/nodb";
	export default {
		data () {
			return {
				themes: {
					'light':  'Light',
					'dark':   'Dark',
					'system': 'System default'
				},
				categories: NoDB.categories,
			}
		},
		mounted() {
			let lang = Utils.getLanguage();
			if(lang) this.$i18n.setLocale(lang);
		},
		computed: {
			availableLocales () {
				return this.$i18n.locales
			}
		},
		methods: {
			themeTransition(newTheme, actualTheme, systemQuery) {
				Utils.themeTransition(newTheme, actualTheme, systemQuery);
			},
			setLanguage(language) {
				Utils.setLanguage(language);
			}
		}
	}
</script>