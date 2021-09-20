<template>
	<button type="button" :title="$t('Report an error')" @click="reportPage">
		<i class="bi bi-flag" :class="icon && expanded ? `me-${expand}-3` : ''" v-if="icon"></i>
		<span :class="expanded ? `d-none d-${expand}-inline expanded` : 'visually-hidden'">
			{{ $t('Report an error') }}
		</span>
	</button>
</template>

<script>
export default {
	props: {
		expand: {
			type: String,
			default: 'md',
		},
		expanded: {
			type: Boolean,
			default: false,
		},
		icon: {
			type: Boolean,
			default: true,
		}
	},
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