<template>
	<div id="search-bar" class="search-bar" v-if="display">
		<form class="search-bar-form" :action="localePath('/search/')">
			<label for="search-bar" class="form-label visually-hidden">
				{{ $t('search.input-label') }}
			</label>
			<button class="search-bar-btn btn" type="submit" :aria-label="$t('search.button-submit')">
				<i class="bi bi-search"></i>
			</button>
			<input
				id="search-bar"
				type="search"
				name="q"
				class="search-bar-input form-control"
				autocomplete="off"
				:placeholder="$t('search.input-placeholder')"
				:value="query"
				@input="e => query = e.target.value"
				@keyup.enter="search"
				@keyup.esc="query = ''"
				@click="focus = true"
				@focus="focus = true"
				@blur="focus = false"
			/>
		</form>
		<div class="search-bar-results" role="menu" tabindex="" v-if="((query.length > 0 && query != '') || focus)">
			<div class="search-bar-items">
				<template v-if="results">
					<SearchResults
						v-for="(item, type) in data"
						:key="item.slug"
						:type="type"
						:data="item"
						@focus.native="focus = true, results = false"
						@click.native="clear($event)"
					/>
				</template>
				<div class="items" v-if="!results && focus">
					<h5 class="title m-0" v-text="(query.length > 0) ? $t('search.no-results') : $t('search.try-for')" />
				</div>
			</div>
		</div>
	</div>
</template>

<script>
	import NoDB from '~/utils/nodb';
	export default {
		props: {
			get: {
				type: String | Boolean,
				default: false,
			},
			limit: {
				type: Number,
				default: 30,
			},
			display: {
				type: Boolean,
				default: true
			}
		},
		data() {
			return {
				results: false,
				focus: false,
				query: '',
				data: {
					// I think this is the best way to order them.
					equations:  [],
					formulas:   [],
					constants:  [],
					magnitudes: [],
					variables:  [],
					units:      [],
				}
			}
		},
		watch: {
			async query(query) {
				this.search(query);
			}
		},
		methods: {
			clear() {
				setTimeout(() => {
					this.query = '';
					this.results = false;
				}, 250);
			},
			async search(query) {
				// Validate query
				if(!query || query.length == 0 || query == "") {
					this.results = false;
					return;
				}
				const limit = this.limit;
				// Get data with nuxt content is a breeze
				let search = await this.$content({ deep: true })
					.where({ dir: { $ne: '/categories' }})
					.only(['slug', 'name', 'categories', 'dir', 'path'])
					.search('name', query)
					.limit(limit)
					.fetch();
				// Organize by key
				let group = search.reduce((array, item) => {
					array[item.dir.substring(1)] = array[item.dir.substring(1)] || [];
					array[item.dir.substring(1)].push(item);
					return array;
				}, Object.create(null));
				// If object is not empty return
				if(!Object.keys(group).length > 0) {
					this.results = false;
					return;
				}
				// If we have results then...
				this.results = true;
				// This.data = group; Do the order in reverse, don't know why...
				// This ways will respect the order
				NoDB.types.forEach(type => {
					this.data[type] = group[type] || [];
				});
			}
		},
		mounted() {
			if(this.get && this.get !== '') {
				this.query = this.get;
			}
		},
	}
</script>