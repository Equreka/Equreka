<template>
	<div class="actions" v-if="data">
		<ActionsCalculator class="btn btn-link" :slug="data.slug" :type="type" v-if="data.supported"/>
		<ActionsFavorite class="btn btn-link" :slug="data.slug" :type="type" />
		<ActionsDownload class="btn btn-link" :data="data" :type="type"/>

		<!-- Report -->
		<button type="button" class="btn btn-link" :title="$t('Report an error')" @click="reportPage()">
			<span class="visually-hidden">
			{{ $t('Report an error') }}
			</span>
			<i class="bi bi-flag"></i>
		</button>
	</div>
</template>

<script>
	export default {
		props: ['data', 'type', 'category'],
		methods: {
			// Report page
			reportPage() {
				this.$router.push({ 
					path:  this.localePath('/report'), 
					query: this.$route.params
				})
			},
		}
	}
</script>