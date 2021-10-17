<template>    
	<header class="header">
		<nav class="navbar navbar-expand-md">
			<div class="container">
				<!-- Left -->
				<div class="left">
					<NuxtLink class="logo" :to="localePath('/')">
						<Logo width="72px"/>
					</NuxtLink>
				</div>
				<!-- Center -->
				<div class="center">
					<SearchBar/>
				</div>
				<!-- Right -->
				<div class="right">
					<NuxtLink class="btn" v-for="item in menu" :key="item.slug" :class="item.slug" :to="localePath(item.to)" :title="$t(`${item.slug}.title`)">
						<span class="visually-hidden" v-text="$t(`${item.slug}.title`)" />
						<i class="bi" :class="item.icon" />
					</NuxtLink>
				</div>
			</div>
		</nav>
	</header>
</template>

<script>
	import NoDB from "~/utils/nodb";
	export default {
		data () {
			return {
				menu: NoDB.menu,
				themes: NoDB.themes,
				categories: NoDB.categories,
			}
		}
	}
</script>