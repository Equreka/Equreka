<template> 
	<main role="main" class="category">
		<PageHeader :title="category.name" :class="category.slug" />
		<div class="container">
			<template v-for="typeData, type in typesData">
				<PageCollapse :key="type" :id="type" :class="type" :category="category.slug" :type="type" :data="typeData"  v-if="typeData.length > 0"/>
			</template>
		</div>
	</main>
</template>
<script>
	export default {
		async asyncData ({ $content, params }) {
			const types = ['constants', 'equations', 'formulas', 'magnitudes', 'units', 'variables'],
					category = await $content('categories', params.slug)
						.fetch();
			// Get data
			let typesData = {};
			await Promise.all(
				types.map(async (type) => {
					try {
						typesData[type] = await $content(type)
							.where({ category: params.slug })
							.fetch();
					} catch {
						typesData[type] = [];
					}
				})
			);
			// Return data
			return {
				category,
				typesData
			}
		}
	}
</script>