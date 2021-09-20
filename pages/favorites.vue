<template>
	<main role="main" class="favorites">
		<SVGFavoritesEmpty />
		<div class="container">
			<header class="main-header">
				<div class="hstack">
					<h2 class="page-title">
						{{ $t('favorites.title') }}
					</h2>
					<button class="ms-auto btn" :class="edit ? 'btn-success' : 'btn-warning'" @click="toggleEdit">
						<i class="bi" :class="edit ? 'bi-check2' : 'bi-pencil'"></i>
					</button>
				</div>
				<p class="lead m-0">
					{{ $t('favorites.lead') }}
				</p>
			</header>
			<!-- Favorites -->
			<template  v-if="favorites && haveFavorites(favorites)">
				<template v-for="data, type in favorites">
					<div class="card mb-3" :key="type" v-if="data && data.length > 0">
						<div class="card-body">
							<section>
								<h5>{{ $t(`abbreviations.${type}.cap`) }}</h5>
								<TableFavorites :data="data" :type="type" :edit="edit"/>
							</section>
						</div>
					</div>
				</template>
			</template>
			<!-- No data -->
			<template v-else>
				<div class="card">
					<div class="card-body">
						<h4 v-if="!haveFavorites(favorites) && support">{{ $t('favorites.none') }}</h4>
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
						const localStorage = await Favorites.get(type);
						if (localStorage) {
							for (let i = 0; i < localStorage.length; i++) {
								const slug = localStorage[i],
										data = await $content(type, slug)
									.only(['name', 'slug', 'category', 'supported', 'dir'])
									.fetch();
								favorites[type][i] = data;
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
		methods: {
			haveFavorites(object) {
				if(object) {
					return Favorites.have(object);
				} else {
					return false;
				}
			},
			toggleEdit() {
				this.edit = !this.edit;
			}
		},
	}
</script>