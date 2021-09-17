<template>
	<button type="button" class="btn btn-link" :title="$t('Report an error')" @click="reportPage">
		<span class="visually-hidden">
			{{ $t('Report an error') }}
		</span>
		<i class="bi bi-flag"></i>
	</button>
</template>

<script>
export default {
	methods: {
		reportPage() {
			this.$router.push({ 
				path:  this.localePath('/report'),
				query: this.$route.params
			})
		},
	}
}
</script>