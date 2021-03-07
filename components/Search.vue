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
          v-for="searchItem in searchData"
          :key="searchItem.title"
          v-bind:title="searchItem.title"
          v-bind:slug="searchItem.slug"
          v-bind:data="searchItem.data"
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
  export default {
    data() {
      return {
        searchFocus:   false,
        searchQuery:   '',
        searchResults: false,
        searchData: {
          entries: {
            title: 'Formulas or equations',
            slug:  '',
            data:  {}
          },
          variables: {
            title: 'Variables',
            slug:  'variables/',
            data:  {}
          },
          constants: {
            title: 'Constants',
            slug:  'constants/',
            data:  {}
          },
          units: {
            title: 'Units',
            slug:  'units/',
            data:  {}
          }
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
        
        // Entries
        this.searchData.entries.data = await fetch(
          process.env.baseUrl + '/api/entries/search/' + searchQuery
        ).then((res) => res.json());
        // Variables
        this.searchData.variables.data = await fetch(
          process.env.baseUrl + '/api/variables/search/' + searchQuery
        ).then((res) => res.json());
        // Constants
        this.searchData.constants.data = await fetch(
          process.env.baseUrl + '/api/constants/search/' + searchQuery
        ).then((res) => res.json());
        // Units
        this.searchData.units.data = await fetch(
          process.env.baseUrl + '/api/units/search/' + searchQuery
        ).then((res) => res.json());

        // Search results
        if(
          (this.searchData.entries.data   && this.searchData.entries.data.length   > 0) ||
          (this.searchData.variables.data && this.searchData.variables.data.length > 0) ||
          (this.searchData.constants.data && this.searchData.constants.data.length > 0) ||
          (this.searchData.units.data     && this.searchData.units.data.length     > 0)
        ) {
          this.searchResults = true;
          this.searchFocus = true;
        } else {
          this.searchResults = false;
        }
      }
    }
  }
</script>