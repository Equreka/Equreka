<template>
  <div id="search-bar" class="search-bar">
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
        v-model="searchQuery"
        :placeholder="$t('search.input-placeholder')"
        @focus="searchFocus = true"
        @blur="searchFocus = false"
      />
      <button class="btn btn-link" type="submit" :aria-label="$t('search.button-submit')">
        <i class="bi bi-search"></i>
      </button>
    </form>
    <div class="search-results" role="menu" tabindex="-1" v-if="searchResults || searchFocus">
      <template v-if="searchResults">
        <SearchBarResults id="search-bar-results"
          v-for="(searchData, searchType) in searchData"
          :key="searchData.slug"
          v-bind:type="searchType.charAt(0).toUpperCase() + searchType.slice(1)"
          v-bind:slug="searchType"
          v-bind:data="searchData"
          @click.native="searchResults = false, searchQuery = ''"
          @focus.native="searchFocus = true"
        />
      </template>
      <template v-else-if="!searchResults && searchQuery.length >= 2">
        <div class="items">
          <h5 class="title m-0">{{ $t('search.no-results') }}</h5>
        </div>
      </template>
      <template v-else-if="searchFocus">
        <div class="items">        
          <h5 class="title m-0">{{ $t('search.try-for') }}</h5>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
  import Equreka from '@/equreka'
  export default {
    data() {
      return {
        searchResults: false,
        searchFocus:   false,
        searchQuery:   '',
        searchData: {
          equations: {},
          formulas:  {},
          variables: {},
          constants: {},
          units:     {}
        }
      }
    },
    watch: {
      async searchQuery(searchQuery) {
        // Trim searchQuery
        searchQuery = searchQuery.replace(/[\])}[{(]/g, '').replace(/[^a-zA-Z ]/g, "").replace(/[^\w\s]/gi, "");
        // Validate searchQuery
        if(!searchQuery || searchQuery == "" || searchQuery.length <= 1) {
          this.searchResults = false;
          return;
        }

        let data = [];
        await Promise.all((Equreka.TYPES).map(async (type) => {
          data[type] = await fetch(`${process.env.api}/${type}/search/${searchQuery}`).then((res) => res.json());
        }));

        this.searchData.constants = data['constants'];
        this.searchData.equations = data['equations'];
        this.searchData.formulas =  data['formulas'];
        this.searchData.variables = data['variables'];
        this.searchData.units =     data['units'];

        // Search results
        if(
          (this.searchData.constants && this.searchData.constants.length > 0) ||
          (this.searchData.equations && this.searchData.equations.length > 0) ||
          (this.searchData.formulas  && this.searchData.formulas.length  > 0) ||
          (this.searchData.variables && this.searchData.variables.length > 0) ||
          (this.searchData.units     && this.searchData.units.length     > 0)
        ) {
          this.searchResults = true;
          this.searchFocus =   true;
        } else {
          this.searchResults = false;
        }
      }
    }
  }
</script>