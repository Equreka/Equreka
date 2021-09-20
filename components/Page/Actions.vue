<template>
	<div class="actions" v-if="data">
		<ActionsFavorite class="btn btn-link" :slug="data.slug" :type="type" />
		<ActionsCalculator class="btn btn-link" :slug="data.slug" :type="type" v-if="showCalculator"/>
		<ActionsDownload class="btn btn-link d-none d-md-flex" :data="data" :type="type"/>
		<ActionsReport class="btn btn-link"/>
	</div>
</template>

<script>
	export default {
		props: ['data', 'type', 'category'],
		computed: {
			showCalculator() {
				const route = this.$route.path;
				return this.data.supported && !route.includes('calculator');
			}
		}
	}
</script>