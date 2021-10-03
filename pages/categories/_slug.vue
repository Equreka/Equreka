<template> 
	<main role="main" class="category" :class="category">
		<PageHeader :title="$t(`abbreviations.${category}.cap`)" />
		<div class="container">
			<template v-for="data, type in types">
				<CardList class="card-type" :key="type" :slug="type" :data="data" :to="`/${type}`" :type="type"  v-if="data.length > 0"/>
			</template>
		</div>
		<MathAll />
	</main>
</template>

<script>
	import NoDB from "~/utils/nodb";
	export default {
		async asyncData({ $content, params, error }) {
			const category = params.slug;
			let types = {};
			await Promise.all(
				NoDB.types.map(async (type) => {
					try {
						types[type] = await $content(type)
							.where({ categories: { $contains: category } })
							.sortBy('unitOf')
							.sortBy('name')
							.fetch()
							.catch((e) => {
								error({ statusCode: 404 })
							});
					} catch {
						types[type] = [];
					}
				})
			);
			return {
				category,
				types
			}
		},
	}
</script>