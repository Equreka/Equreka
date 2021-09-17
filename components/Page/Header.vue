<template>
	<header class="page-header" :class="category">
		<div class="container">
			<div class="wrapper">
				<div class="info">
					<span class="category" v-if="!type">
						{{ $t('Category') }}
					</span>
					<NuxtLink class="category" :to="localePath(`/${category}/`)" v-else>
						<Abbr :string="category"/>
					</NuxtLink>
					<template v-if="category && type && data">
						<i class="divider bi bi-chevron-right"></i>
						<NuxtLink class="type" :to="localePath(`/${category}/${type}`)">
							<Abbr :string="type" expand="sm"/>
						</NuxtLink>
					</template>

					<h1 class="title">{{ title }}</h1>
				</div>

				<!-- Actions -->
				<PageActions :favorite="favorite" :data="data" :type="type" :category="category"/>
				<div class="actions" v-if="data && false == true">

					<!-- Report -->
					<button type="button" class="btn btn-link" :title="$t('Report an error')" @click="reportPage()">
						<span class="visually-hidden">
						{{ $t('Report an error') }}
						</span>
						<i class="bi bi-flag"></i>
					</button>
				</div>
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
				let bodyClass = `${this.category}`;
				if(this.category && !this.slug) {
					bodyClass += ` category-${this.category}`;
				}
				if(this.type) {
					bodyClass += ` type-${this.type}`;
				}
				if(this.slug) {
					bodyClass += ` data-${this.slug}`;
				}
				return bodyClass;
			}
		}
	}
</script>