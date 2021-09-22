<template>
	<button type="button" :title="!isFavorite ? $t('favorites.add') : $t('favorites.remove')" @click="click = true, !isFavorite ? addFavorite() : removeFavorite()" @mouseover="hover = true, setClass()" @mouseleave="click = false, hover = false">
		<i class="bi" :class="iconClass"  v-if="icon"></i>
		<span :class="expanded ? `d-none d-${expand}-inline expanded` : 'visually-hidden'"
			v-html="!isFavorite ? $t('favorites.add') : $t('favorites.remove')"
		/>
	</button>
</template>

<script>
	import Favorites from "~/utils/favorites";
	export default {
		data() {
			return {
				click: false,
				hover: false,
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
			},
			expanded: {
				type: Boolean,
				default: false
			},
			icon: {
				type: Boolean,
				default: true
			}
		},
		computed: {
			iconClass() {
				return this.setClass();
			}
		},
		methods: {
			setClass() {
				let iconClass = 'bi-heart';
				if(this.isFavorite && !this.hover) iconClass = 'bi-heart-fill';
				if(this.isFavorite && this.hover && !this.click) iconClass = 'bi-heart-half';
				if(!this.isFavorite && this.hover) iconClass = 'bi-heart-fill';
				if(this.expanded) iconClass += ` me-${expand}-3`;
				return iconClass;
			},
			// Add isFavorite
			addFavorite() {
				if(this.isFavorite) return;
				let added = Favorites.add(this.type, this.slug);
				if(added) this.isFavorite = true;
			},
			// Remove isFavorite
			removeFavorite() {
				if(!this.isFavorite) return;
				let removed = Favorites.remove(this.type, this.slug);
				if(removed) this.isFavorite = false;
			}
		}
	}
</script>