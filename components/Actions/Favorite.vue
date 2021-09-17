<template>
	<button type="button" class="btn" :title="!isFavorite ? $t('favorites.add') : $t('favorites.remove')" @click="!isFavorite ? add() : remove()">
		<span class="visually-hidden" v-html="!isFavorite ? $t('favorites.add') : $t('favorites.remove')" />
		<i class="bi" :class="!isFavorite ? 'bi-heart' : 'bi-heart-fill'" />
	</button>
</template>

<script>
	import Favorites from "~/utils/favorites";
	export default {
		data() {
			return {
				isFavorite: null
			}
		},
		mounted() {
			if(this.type && this.slug && Favorites.check(this.type, this.slug)) {
				this.isFavorite = true;
			}
		},
		props: {
			type: {
				type: String,
				required: true
			},
			slug: {
				type: String,
				required: true
			}
		},
		methods: {
			// Add isFavorite
			add() {
				if(this.isFavorite) return;
				let added = Favorites.add(this.type, this.slug);
				if(added) this.isFavorite = true;
			},
			// Remove isFavorite
			remove() {
				if(!this.isFavorite) return;
				let removed = Favorites.remove(this.type, this.slug);
				if(removed) this.isFavorite = false;
			}
		}
	}
</script>