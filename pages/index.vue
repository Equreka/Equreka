<template>
	<main role="main" class="home">
		<div class="container">
			<SearchBar class="mb-3" :limit="20" v-if="layout === 'app'"/>
			<div class="hstack align-items-stretch gap-2 mb-3" role="group">
				<button class="btn justify-content-center col rounded-pill" :class="toggle ? 'btn-primary' : 'btn-dark'" @click="toggle = true">
					{{ $t('categories.title') }}
				</button>
				<button class="btn justify-content-center col rounded-pill" :class="!toggle ? 'btn-primary' : 'btn-dark'" @click="toggle = false">
					{{ $t('types.title') }}
				</button>
			</div>
			<transition name="toggle">
				<div v-if="toggle">
					<div class="card card-category" v-for="category in categories" :key="category.slug" :class="category.slug">
						<div class="card-body">
							<h3 class="card-title">
								{{ $t(`categories.${category.slug}.title`) }}
							</h3>
							<p>
								{{ $t(`categories.${category.slug}.lead`) }}
							</p>
							<NuxtLink class="stretched-link" :to="localePath(`${category.dir}/${category.slug}/`)">
								<span class="visually-hidden">Go to category</span>
							</NuxtLink>
						</div>
					</div>
				</div>
			</transition>
			<transition name="toggle">
				<div v-if="!toggle">
					<div class="card card-category" v-for="type in types" :key="type" :class="type">
						<div class="card-body">
							<h3 class="card-title">{{ $t(`types.${type}.title`) }}</h3>
							<p>{{ $t(`types.${type}.description`) }}</p>
							<NuxtLink class="stretched-link" :to="localePath(`/${type}`)">
								<span class="visually-hidden">Go to category</span>
							</NuxtLink>
						</div>
					</div>
				</div>
			</transition>
		</div>
	</main>
</template>

<script>
	import NoDB from '~/utils/nodb';
	export default {
		data() {
			return {
				toggle: true,
			}
		},
		async asyncData ({ $content }) {
			const page = 'home',
					types = NoDB.types,
					categories = await $content('categories')
						.sortBy('id', 'asc')
						.fetch();
			return {
				page,
				types,
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