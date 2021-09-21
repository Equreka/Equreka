<template>
	<div class="items" v-if="data && data.length > 0">
		<h5 class="title fw-bold">
			<Abbr :string="type" expanded />
			<small class="badge ms-auto">{{ data.length }}</small>
		</h5>
		<NuxtLink class="item" role="menuitem" tabindex="0"
			v-for="item in data"
			:key="item.slug"
			:class="item.categories"
			:to="localePath(item.path)"
		>
			<span v-text="item.name" />
			<Abbr :string="item.categories[0]" class="badge badge-category" />
		</NuxtLink>
	</div>
</template>

<script>
	export default {
		props: ['data', 'type'],
	}
</script>