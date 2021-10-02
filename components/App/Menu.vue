<template>    
	<header class="app-menu">
		<nav class="navbar">
			<NuxtLink class="btn" v-for="item in menu" :key="item.slug" :class="item.slug" :to="localePath(item.to)" :title="$t(`${item.slug}.title`)">
				<span class="visually-hidden" v-text="$t(`${item.slug}.title`)" />
				<i class="bi" :class="item.icon" />
			</NuxtLink>
		</nav>
	</header>
</template>

<script>
	import NoDB from "~/utils/nodb";
	export default {
		data () {
			return {
				menu: NoDB.menu,
				themes: NoDB.themes
			}
		}
	}
</script>