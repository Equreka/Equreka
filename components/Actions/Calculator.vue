<template>
	<NuxtLink :to="localePath(path)">
		<i class="bi" :class="icon && expanded ? `${iconClass} me-${expand}-3` : iconClass" v-if="icon"></i>
		<span :class="expanded ? `d-none d-${expand}-inline expanded` : 'visually-hidden'">
			{{ $t('calculator.go-to-calculator') }}
		</span>
	</NuxtLink>
</template>

<script>
	export default {
		props: {
			to: {
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
		},
		computed: {
			iconClass() {
				return this.$route.path.includes('/calculator') ? 'bi-info-square' : 'bi-plus-square';
			},
			path() {
				return this.$route.path.includes('/calculator') ? this.to: `/calculator${this.to}`;
			}
		}
	}
</script>