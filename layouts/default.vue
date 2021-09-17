<template>
	<div class="layout" :class="layout">
		<AppHeader v-if="layout == 'app'"/>
		<WebHeader v-else/>
		<Nuxt/>
		<AppMenu v-if="layout === 'app'"/>
		<WebFooter v-else/>
	</div>
</template>

<script>
	export default {
		head () {
			return this.$nuxtI18nHead();
		},
		computed: {
			layout() {
				return (this.$device.isMobile) ? 'app' : 'web';
			}
		}
	}
</script>