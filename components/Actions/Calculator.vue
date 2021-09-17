<template>
	<NuxtLink class="btn" :to="localePath(`/calculator/${type}/${slug}`)">
		<span class="visually-hidden">
			{{ $t('calculator.go-to-calculator') }}
		</span>
		<i class="bi bi-plus-square"></i>
	</NuxtLink>
</template>

<script>
	export default {
		props: ['category', 'type', 'slug']
	}
</script>