<template> 
	<main role="main" class="category">
		<PageHeader :title="category.name" />
		<div class="container">
			<template v-for="typeData, type in data">
				<PageCollapse :key="type" :id="type" :class="type" :data="typeData" :category="slug" :type="type" v-if="typeData.length > 0"/>
			</template>
		</div>
	</main>
</template>
<script>
	export default {
		async asyncData ({ $content, params }) {
			const types = ['constants', 'equations', 'formulas', 'units', 'variables'],
					slug = params.category,
					category = await $content('categories', slug)
						.fetch();
			// Get data
			let data = {};
			await Promise.all(
				types.map(async (type) => {
					try {
						data[type] = await $content(type)
							.where({
								category: slug
							})
							.fetch();
					} catch {
						data[type] = [];
					}
				})
			);
			// Return data
			return {
				slug,
				category,
				data
			}
		}
	}
</script>