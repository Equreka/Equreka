<template> 
	<main role="main" class="category" :class="type">
		<PageHeader :title="$t(`page.types.${type}.title`)" />
		<div class="container">
			<div class="card card-collapse" v-if="data && data.length > 0">
				<div class="card-body">
					<div class="list">
						<NuxtLink v-for="item in data" :key="item._id" :to="localePath(`/${type}/${item.slug}`)">
							{{ item.name }}
						</NuxtLink>
					</div>
				</div>
			</div>
		</div>
	</main>
</template>

<script>
	export default {
		async asyncData({ $content, params }) {
			const type = params.type,
					data = await $content(type)
						.fetch();
			// Return data
			return {
				type,
				data
			}
		}
	}
</script>