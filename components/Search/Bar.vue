<template>
  <div id="search-bar" class="search-bar" v-if="display">
    <form :action="localePath('/search/')">
      <label for="search-bar" class="form-label visually-hidden">
        {{ $t('search.input-label') }}
      </label>
      <input
        id="search-bar"
        type="search"
        name="q"
        class="form-control"
        autocomplete="off"
        :placeholder="$t('search.input-placeholder')"
        v-model="query"
        @focus="focus = true"
        @blur="focus = false"
      />
      <button class="btn btn-link" type="submit" :aria-label="$t('search.button-submit')">
        <i class="bi bi-search"></i>
      </button>
    </form>
    <div class="search-results" role="menu" tabindex="-1" v-if="focus">
      <template v-if="results">
        <SearchBarResults id="search-bar-results"
          v-for="(item, type) in data"
          :key="item.slug"
          v-bind:type="type"
          v-bind:data="item"
          @click.native="query = '', results = false"
          @focus.native="focus = true, results = false"
        />
      </template>
      <template v-else-if="!results && focus && query.length > 0">
        <div class="items">
          <h5 class="title m-0">{{ $t('search.no-results') }}</h5>
        </div>
      </template>
      <template v-else>
        <div class="items">
          <h5 class="title m-0">{{ $t('search.try-for') }}</h5>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
	export default {
		props: {
			display: {
				type: Boolean,
				default: true
			}
		},
		data() {
			return {
				results: false,
				focus:   false,
				query:   '',
				data: {
					equations: [],
					formulas:  [],
					variables: [],
					constants: [],
					units:     []
				}
			}
		},
		watch: {
			async query(query) {
				this.search(query);
			}
		},
		methods: {
			async search(query) {
				// Validate query
				if(!query || query.length == 0 || query == "") {
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
		}
	}
</script>