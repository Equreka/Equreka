<template> 
	<main role="main" class="category">
		<PageHeader :title="category.name" :class="category.slug" />
		<div class="container">
			<template v-for="data, type in types">
				<PageCollapse :key="type" :id="type" :class="type" :category="category.slug" :type="type" :data="data"  v-if="data.length > 0"/>
			</template>
		</div>
		<MathJax />
	</main>
</template>
<script>
	import NoDB from "~/utils/nodb";
	export default {
		async asyncData ({ $content, params, error }) {
			const category = await $content('categories', params.slug)
						.only(['name', 'slug'])
						.fetch()
						.catch((e) => {
							error({ statusCode: 404 })
						});
			// Get data
			let types = {};
			await Promise.all(
				NoDB.types.map(async (type) => {
					try {
						types[type] = await $content(type)
							.where({ category: params.slug })
							.sortBy(type == 'units' ? 'unitOf' : 'name')
							.fetch()
							.catch((e) => {
								error({ statusCode: 404 })
							});
					} catch {
						types[type] = [];
					}
				})
			);
			// Return data
			return {
				category,
				types
			}
		},
	}
</script>