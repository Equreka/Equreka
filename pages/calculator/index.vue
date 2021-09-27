<template>
	<div class="container">
		<header class="main-header">
			<h2 class="page-title">{{ $t('calculator.title') }}</h2>
			<p class="lead m-0">{{ $t('calculator.lead') }}</p>
		</header>
		<template v-for="data, type in data">
			<CardCollapse class="card-type" :key="type" :data="data" :to="`/${type}`" :type="type" v-if="data.length > 0" />
		</template>
	</div>
</template>

<script>
	export default {
		async asyncData({ $content }) {
			let data = {};
			await Promise.all(
				['equations', 'formulas'].map(async (type) => {
					try {
						data[type] = await $content(type)
							.only(['categories', 'name', 'slug', 'path'])
							.where({ supported: true })
							.sortBy(type == 'units' ? 'unitOf' : 'name')
							.fetch()
							.catch(() => error({ statusCode: 404 }));
					} catch {
						data[type] = [];
					}
				})
			);

			// Return data
			return {
				data
			}
		}
	}
</script>