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
					<!-- Dropdown: Categories -->
					<div class="dropdown dropdown-categories btn-group">
						<button class="btn btn-link dropdown-toggle dropdown-toggle-no-caret" type="button" id="dropdown-categories" data-bs-toggle="dropdown" aria-expanded="false" :title="$t('Menu')">
							<span class="visually-hidden">{{ $t('Menu') }}</span>
							<i class="bi bi-columns-gap"></i>
						</button>
						<ul class="dropdown-menu" aria-labelledby="dropdown-categories">
							<li><h6 class="dropdown-header">{{ $t('Categories') }}</h6></li>
							<li v-for="category in categories" :key="category">
								<NuxtLink class="dropdown-item" :to="localePath(`/${category}/`)">
									{{ $t(`abbreviations.${category}.cap`) }}
								</NuxtLink>
							</li>
						</ul>
					</div>
				</div>
				<!-- Center -->
				<div class="center">
					<SearchBar/>
				</div>
				<!-- Right -->
				<div class="right">
					<!-- Button: Favorites -->
					<NuxtLink class="btn" :to="localePath('/favorites/')" :title="$t('favorites.title')">
						<span class="visually-hidden">{{ $t('Favorites') }}</span>
						<i class="bi bi-heart"></i>
					</NuxtLink>
					<!-- Button: Favorites -->
					<NuxtLink class="btn" :to="localePath('/calculator/')" :title="$t('calculator.title')">
						<span class="visually-hidden">{{ $t('Favorites') }}</span>
						<i class="bi bi-plus-square"></i>
					</NuxtLink>
					<!-- Dropdown: Theme -->
					<div class="dropdown dropdown-theme btn-group">
						<button class="btn btn-link dropdown-toggle dropdown-toggle-no-caret" type="button" id="dropdown-theme" data-bs-toggle="dropdown" aria-expanded="false" :title="$t('Change theme')">
							<span class="visually-hidden">{{ $t('Change theme') }}</span>
							<i class="bi bi-moon theme-icon"></i>
						</button>
						<ul class="dropdown-menu dropdown-menu-end" aria-labelledby="dropdown-theme">
							<li><h6 class="dropdown-header">{{ $t('Theme') }}</h6></li>
							<li v-for="(option, code) in themes" :key="code">
								<button class="dropdown-item" @click="$colorMode.preference = code, themeTransition(code, $colorMode.value)">
									<i class="icon bi" :class="`bi-${code}`"></i>
									{{ $t(option) }}
								</button>
							</li>
						</ul>
					</div>
					<!-- Dropdown: Language -->
					<div class="dropdown dropdown-language btn-group">
						<button class="btn btn-link dropdown-toggle dropdown-toggle-no-caret" type="button" id="dropdown-language" data-bs-toggle="dropdown" aria-expanded="false" :title="$t('Change language')">
							<span class="visually-hidden">{{ $t('Change language') }}</span>
							<i class="bi bi-globe"></i>
						</button>
						<ul class="dropdown-menu dropdown-menu-end" aria-labelledby="dropdown-language">
							<li><h6 class="dropdown-header">{{ $t('Language') }}</h6></li>
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