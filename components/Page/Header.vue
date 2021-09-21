<template>
	<header class="page-header" :class="type ? type : category">
		<div class="container">
			<div class="wrapper">
				<div class="info">
					<span class="category" v-if="!type">
						{{ $t('abbreviations.category.cap') }}
					</span>
					<span class="category" v-if="type && !data">
						{{ $t('abbreviations.type.cap') }}
					</span>
					<template v-if="data">
						<NuxtLink class="type" :to="localePath(`/${type}`)">
							<Abbr :string="type" expanded/>
						</NuxtLink>
					</template>
					<h1 class="title">{{ title }}</h1>
				</div>
				<!-- Actions -->
				<PageActions :data="data" :favorite="favorite" :type="type" :category="data.category"/>
			</div>
		</div>
	</header>
</template>

<script>
	import Favorites from "~/utils/favorites";
	export default {
		head() {
			return {
				bodyAttrs: {
					class: this.bodyClass
				}
			}
		},
		data() {
			return {
				favorite: false
			}
		},
		mounted() {
			if(this.type && this.data.slug && Favorites.check(this.type, this.data.slug)) {
				this.favorite = true;
			}
		},
		props: {
			title: {
				type: String,
				default: ''
			},
			data: {
				type: Object | Boolean,
				default: false
			}
		},
		computed: {
			category() {
				if(this.data) {
					return this.data.category;
				} else {
					return this.$route.params.category ? this.$route.params.category : false;
				}
			},
			type() {
				const type = this.$route.params.type;
				return type ? type : false;
			},
			slug() {
				const slug = this.$route.params.slug;
				return slug ? slug : false;
			},
			bodyClass() {
				let bodyClass = '';
				if(this.category) bodyClass += `category-${this.category}`;
				if(this.type) bodyClass += ` type-${this.type}`;
				if(this.slug) bodyClass += ` slug-${this.slug}`;
				if(this.category && !this.type) bodyClass += `${this.category}`;
				if(this.type) bodyClass += ` ${this.type}`;
				return bodyClass;
			}
		}
	}
</script>