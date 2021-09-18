<template>
	<main role="main" class="home">
		<div class="container">
			<SearchBar class="mb-3" :limit="5" v-if="layout === 'app'"/>
			<div class="card card-category" v-for="category in categories" :key="category.slug" :class="category.slug">
				<div class="card-body">
					<h3 class="card-title">
						{{ $t(category.name) }}
					</h3>
					<p>
						{{ $t(`page.categories.${category.slug}.lead`) }}
					</p>
					<NuxtLink class="stretched-link" :to="localePath(`${category.dir}/${category.slug}/`)">
						<span class="visually-hidden">Go to category</span>
					</NuxtLink>
				</div>
			</div>
		</div>
	</main>
</template>

<script>
	export default {
		async asyncData ({ $content }) {
			const page = 'home',
					categories = await $content('categories')
						.sortBy('id', 'asc')
						.fetch();
			return {
				page,
				categories
			}
		},
		head() {
			return {
				bodyAttrs: {
					class: `page-home`
				}
			}
		},
		computed: {
			layout() {
				return (this.$device.isMobile) ? 'app' : 'web'
			}
		}
	}
</script>