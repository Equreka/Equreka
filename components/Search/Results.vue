<template>
	<div class="items" v-if="data && data.length > 0">
		<h5 class="title fw-bold">
			{{ $t(`abbreviations.${type}.cap`) }}
			<small class="badge ms-auto">{{ data.length }}</small>
		</h5>
		<NuxtLink class="item" role="menuitem" tabindex="0"
			v-for="item in data"
			:key="item.slug"
			:class="item.category"
			:to="localePath(item.path)"
		>
			<span>
				{{ item.name }}
			</span>
			<Abbr :string="item.category" class="badge badge-category" />
		</NuxtLink>
	</div>
</template>

<script>
	export default {
		props: ['data', 'type'],
	}
</script>