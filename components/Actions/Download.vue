
<template>
	<a :href="json" :download="`equreka.${data.dir.slice(1)}.${data.slug}.json`" :title="$t('actions.download.json')" v-if="json">
		<i class="bi bi-cloud-download" :class="icon && expanded ? `me-${expand}-3` : ''" v-if="icon"></i>
		<span :class="expanded ? `d-none d-${expand}-inline expanded` : 'visually-hidden'">
			{{ $t('actions.download.json') }}
		</span>
	</a>
</template>

<script>
	export default {
		props: {
			data: {
				type: Object,
				required: true,
			},
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
		computed: {
			json() {
				const jsonString = JSON.stringify(this.data, null, 2),
						encodedURI = encodeURIComponent(jsonString);
				return `data:text/json;charset=utf-8,${encodedURI}`;
			}
		}
	}
</script>