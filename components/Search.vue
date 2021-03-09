<template>
  <div class="form-search">
    <form>
      <label for="search-bar" class="visually-hidden">{{ $t('search.input-label') }}</label>
      <b-form-input 
        id="search-bar"
        type="search"
        autocomplete="off"
        aria-label="Search"
        :placeholder="$t('search.input-placeholder')"
        v-model="searchQuery"
        @focus="searchFocus = true"
        @blur="searchFocus = false"
      />
      <b-button type="submit" variant="link" :aria-label="$t('search.button-submit')">
        <i class="bi bi-search"></i>
      </b-button>
    </form>
    <div class="results" role="menu" tabindex="-1" v-if="searchResults || searchFocus">
      <template v-if="searchResults">
        <SearchResult id="search-bar-results"
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
        searchFocus:   false,
        searchQuery:   '',
        searchResults: false,
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
          data[type] = await fetch(process.env.baseUrl + '/api/' + type + '/search/' + searchQuery).then((res) => res.json());
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