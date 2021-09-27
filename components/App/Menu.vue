<template>    
	<header class="app-menu">
		<nav class="navbar">
			<NuxtLink class="btn" v-for="item in menu" :key="item.slug" :class="item.slug" :to="localePath(item.to)" :title="$t(`${item.slug}.title`)">
				<span class="visually-hidden" v-text="$t(`${item.slug}.title`)" />
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
					{ slug: 'home', to: '/', icon: 'bi-house' },
					{ slug: 'search', to: '/search', icon: 'bi-search' },
					{ slug: 'calculator', to: '/calculator', icon: 'bi-plus-square' },
					{ slug: 'favorites', to: '/favorites', icon: 'bi-heart' },
					{ slug: 'settings', to: '/settings', icon: 'bi-gear' }
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