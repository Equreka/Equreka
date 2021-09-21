<template> 
	<main role="main" class="category" :class="type">
		<PageHeader :title="$t(`abbreviations.${type}.cap`)" />
		<div class="container">
			<template v-for="data, category in categories">
				<CardCollapse class="card-category" :key="category" :data="data" :to="`/categories/${category}`" :type="category" v-if="data.length > 0" />
			</template>
		</div>
		<MathJax />
	</main>
</template>

<script>
	import NoDB from '~/utils/nodb';
	export default {
		async asyncData({ $content, params, error }) {
			const { type } = params;
		
			let categories = {};
			await Promise.all(
				NoDB.categories.map(async (category) => {
					try {
						categories[category] = await $content(type)
							.only(['categories', 'name', 'slug', 'path'])
							.where({ categories: { $contains: category } })
							.sortBy(type == 'units' ? 'unitOf' : 'name')
							.fetch()
							.catch(() => error({ statusCode: 404 }));
					} catch {
						categories[category] = [];
					}
				})
			);

			// Return data
			return {
				type,
				categories
			}
		}
	}
</script>