<template> 
	<main role="main" class="category">
		<PageHeader :title="category.name" :class="category.slug" />
		<div class="container">
			<template v-for="data, type in types">
				<PageCollapse :key="type" :id="type" :class="type" :category="category.slug" :type="type" :data="data"  v-if="data.length > 0"/>
			</template>
		</div>
	</main>
</template>
<script>
	import NoDB from "~/utils/nodb";
	export default {
		async asyncData ({ $content, params }) {
			const category = await $content('categories', params.slug)
						.only(['name', 'slug'])
						.fetch();
			// Get data
			let types = {};
			await Promise.all(
				NoDB.types.map(async (type) => {
					try {
						types[type] = await $content(type)
							.where({ category: params.slug })
							.fetch();
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
		}
	}
</script>