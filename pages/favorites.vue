<template>
	<main role="main" class="favorites">
		<SVGFavoritesEmpty v-if="!haveFavorites" />
		<div class="container">
			<header class="main-header">
				<div class="hstack align-items-center">
					<h2>
						{{ $t('favorites.title') }}
					</h2>
					<div class="ms-auto hstack gap-3">
						<button class="btn" :class="edit ? 'btn-success' : 'btn-warning'" @click="toggleEdit">
							<i class="bi" :class="edit ? 'bi-check2' : 'bi-pencil'"></i>
						</button>
					</div>
				</div>
				<p class="lead m-0">
					{{ $t('favorites.lead') }}
				</p>
			</header>
			<!-- Favorites -->
			<template  v-if="favorites && haveFavorites">
				<template v-for="data, type in favorites">
					<CardCollapse class="mb-3" :slug="type" :class="type" :key="type" v-if="data && data.length > 0">
						<TableFavorites :data="data" :type="type" :edit="edit"/>
					</CardCollapse>
				</template>
			</template>
			<!-- No data -->
			<template v-else>
				<div class="card">
					<div class="card-body">
						<h4 v-if="!haveFavorites && support">{{ $t('favorites.none') }}</h4>
						<p class="m-0" v-else>
							{{ $t('favorites.no-support') }}
						</p>
					</div>
				</div>
			</template>
		</div>
	</main>
</template>

<script>
	import NoDB from "~/utils/nodb";
	import Favorites from "~/utils/favorites";
	export default {
		data() {
			return {
				edit: false,
				support: true,
				favorites: false
			}
		},
		async asyncData({ $content }) {
			// No support for web storage
			if (!typeof(Storage) === "undefined") {
				return { 
					support: false 
				}
			}
			// Get data
			let favorites = {};
			await Promise.all(
				NoDB.types.map(
					async (type) => {
						favorites[type] = [];
						let localStorage = await Favorites.get(type);
						if (localStorage) {
							for (let i = 0; i < localStorage.length; i++) {
								let slug = localStorage[i],
										data = await $content(type, slug)
									.only(['name', 'slug', 'categories', 'supported', 'dir', 'path'])
									.fetch()
									.catch(() => false);
								if(data) {
									favorites[type].push(data);
								}
							}
						}
					}
				)
			);
			return {
				support: true,
				favorites
			}
		},
		head() {
			return {
				bodyAttrs: {
					class: `page-favorites`
				}
			}
		},
		computed: {
			haveFavorites() {
				return Favorites.have(this.favorites);
			}
		},
		methods: {
			toggleEdit() {
				this.edit = !this.edit;
			}
		},
	}
</script>