<template> 
	<main role="main" class="category" :class="type">
		<PageHeader :title="$t(`abbreviations.${type}.cap`)" />
		<div class="container">
			<template v-for="data, category in categories">
				<CardCollapse class="card-category" :key="category" :data="data" :to="`/categories/${category}`" :type="category" v-if="data.length > 0" />
			</template>
		</div>
		<MathAll />
	</main>
</template>

<script>
	import NoDB from '~/utils/nodb';
	export default {
		async asyncData({ $content, params, error }) {
			const type = params.type;
			let categories = {};
			await Promise.all(
				NoDB.categories.map(async (category) => {
					try {
						categories[category] = await $content(type)
							.where({ categories: { $contains: category } })
							.sortBy('unitOf')
							.sortBy('name')
							.fetch()
							.catch((error) => {
								error({ statusCode: 404 })
							});
					} catch {
						categories[category] = [];
					}
				})
			);
			return {
				type,
				categories
			}
		}
	}
</script>