<template>    
	<header class="app-menu">
		<nav class="navbar">
			<NuxtLink class="btn" v-for="item in menu" :key="item.slug" :class="item.slug" :to="localePath(item.to)" :title="$t(item.name)">
				<span class="visually-hidden">{{ $t(item.name) }}</span>
				<i class="bi" :class="item.icon"></i>
			</NuxtLink>
		</nav>
	</header>
</template>

<script>
	import Utils from "~/utils";
	export default {
		data () {
			return {
				menu: [
					{ name: 'Home', slug: 'home', to: '/', icon: 'bi-house' },
					{ name: 'Search', slug: 'search', to: '/search/', icon: 'bi-search' },
					{ name: 'Calculator', slug: 'calculator', to: '/calculator/', icon: 'bi-plus-square' },
					{ name: 'Favorites', slug: 'favorites', to: '/favorites/', icon: 'bi-heart' },
					{ name: 'Settings', slug: 'settings', to: '/settings/', icon: 'bi-gear' }
				],
				themes: {
					'light':  'Light',
					'dark':   'Dark',
					'system': 'System default'
				}
			}
		},
		computed: {
			availableLocales () {
				return this.$i18n.locales
			}
		},
		methods: {
			themeTransition(newTheme, actualTheme, systemQuery) {
				Utils.themeTransition(newTheme, actualTheme, systemQuery);
			}
		}
	}
</script>