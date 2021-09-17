<template>
	<main role="main" class="search">
		<div class="container">
			<header class="main-header">
				<h2 class="page-title">
					{{ $t('search.title') }}
				</h2>
			</header>
			<!-- Input -->
			<div id="search-bar" class="search-bar lg mb-4">
				<form>
					<label for="search-bar" class="form-label visually-hidden">
						{{ $t('search.input-label') }}
					</label>
					<input 
						id="search-bar" type="search" name="q" class="form-control" autocomplete="off"
						:placeholder="$t('search.input-placeholder')"
						v-model="input"
						@focus="focus = true"
						@blur="focus = false"
					/>
					<button class="btn btn-link" type="submit" :aria-label="$t('search.button-submit')">
						<i class="bi bi-search"></i>
					</button>
				</form>
			</div>
			<!-- Reuslts -->
			<div class="search-results" v-if="(query.length > 0) || results">
				<template v-if="results">
					<SearchBarResults
						id="search-bar-results" 
						v-for="(item, type) in data" 
						:key="item.slug"
						v-bind:type="type"
						v-bind:data="item" 
					/>
				</template>
				<template v-else-if="focus && !results && query.length > 0">
					<h5 class="title mb-0 mx-4">{{ $t('search.no-results') }}</h5>
				</template>
			</div>
			<SVGSearchEmpty v-if="!focus && !results || query.length == 0" />
		</div>
	</main>
</template>

<script>
	export default {
		data() {
			return {
				results: false,
				focus: false,
				query: '',
				input: '',
				data:    {
					equations: [],
					formulas:  [],
					variables: [],
					constants: [],
					units:     []
				}
			}
		},
		async asyncData({ query }) {
			if(query.q) {
				return {
					query: query.q
				}
			}
		},
		created() {
			const query = this.query && this.query.length > 0 ? this.query : false;
			if(query) {
				this.input = query;
				this.search(query);
			}
		},
		computed:{
			showResults() {
				const showResults = (this.results || this.focus) ? true : false
				return showResults;
			}
		},
		watch: {
			async input(val) {
				this.query = val;
				this.search(val);
			}
		},
		methods: {
			async search(query) {
				// Validate query
				if(!query || query.length == 0 || query == "") {
					this.results = false;
					return;
				}
				// Data
				const types = ['constants', 'equations', 'formulas', 'units', 'variables'];
				await Promise.all(
					types.map(async (type) => {
						try {
							this.data[type] = await this.$content(type)
								.only(['slug', 'name', 'category'])
								.limit(10)
								.search(query)
								.fetch();
						} catch {
							this.data[type] = [];
						}
					})
				);
				// Search results
				if(
					(this.data.constants && this.data.constants.length > 0) ||
					(this.data.equations && this.data.equations.length > 0) ||
					(this.data.formulas  && this.data.formulas.length  > 0) ||
					(this.data.variables && this.data.variables.length > 0) ||
					(this.data.units     && this.data.units.length     > 0)
				) {
					this.results = true;
				} else {
					this.results = false;
				}
			}
		},
		head() {
			return {
				bodyAttrs: {
					class: `page-search`
				}
			}
		}
	}
</script>