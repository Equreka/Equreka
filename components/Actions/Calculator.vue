<template>
	<NuxtLink :to="localePath(`/calculator/${type}/${slug}`)">
		<i class="bi bi-plus-square" :class="icon && expanded ? `me-${expand}-3` : ''" v-if="icon"></i>
		<span :class="expanded ? `d-none d-${expand}-inline expanded` : 'visually-hidden'">
			{{ $t('calculator.go-to-calculator') }}
		</span>
	</NuxtLink>
</template>

<script>
	export default {
		props: {
			type: {
				type: String,
				required: true,
			},
			slug: {
				type: String,
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
		}
	}
</script>