
<template>
	<!-- Download JSON -->
	<a class="btn btn-link" :title="$t('Download JSON')" :href="json" :download="`equreka.${data.category}.${type}.${data.slug}.json`" v-if="json">
		<span class="visually-hidden">
			{{ $t('Download JSON') }}
		</span>
		<i class="bi bi-download"></i>
	</a>
</template>

<script>
	export default {
		props: ['data', 'type'],
		computed: {
			json() {
				const encodedURI = encodeURIComponent(JSON.stringify(this.data))
				return `data:text/json;charset=utf-8,${encodedURI}`;
			}
		}
	}
</script>