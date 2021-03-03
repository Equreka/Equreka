<template>
  <div class="form-search">
    <b-form-input 
      id="search-bar"
      type="search"
      placeholder="Search for constants, formulas or equations..."
      autocomplete="off"
      aria-label="Search"
      v-model="searchQuery"
    />
    <div class="results" v-if="searchResults">
      <SearchResult id="serach-bar-results"
        v-for="searchItem in searchData"
        :key="searchItem.title"
        v-bind:title="searchItem.title"
        v-bind:slug="searchItem.slug"
        v-bind:data="searchItem.data"
        @click.native="searchResults = false, searchQuery = ''"
      />
    </div>
    <div class="results" v-if="!searchResults && searchQuery.length >= 2">
      <div class="items">
        <h5 class="title m-0">I didn't found anytihng... 😧</h5>
      </div>
    </div>
    <div class="results" v-if="searchQuery.length == 1">
      <div class="items">
        <h5 class="title m-0">Try with more letters... 😉</h5>
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    data() {
      return {
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
            title: 'Contstants',
            slug:  'contstants/',
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
        if (searchQuery.length <= 1) {
          this.searchResults = false;
          return;
        } 
        searchQuery = searchQuery.replace(/[^\w\s]/gi, '');
        // API
        this.searchData.entries.data = await fetch(
          process.env.baseUrl + '/api/entries/search/' + searchQuery
        ).then((res) => res.json());

        this.searchData.variables.data = await fetch(
          process.env.baseUrl + '/api/variables/search/' + searchQuery
        ).then((res) => res.json());

        this.searchData.constants.data = await fetch(
          process.env.baseUrl + '/api/constants/search/' + searchQuery
        ).then((res) => res.json());

        this.searchData.units.data = await fetch(
          process.env.baseUrl + '/api/units/search/' + searchQuery
        ).then((res) => res.json());

        // Search results
        if(
          this.searchData.entries.data.length   > 0 ||
          this.searchData.variables.data.length > 0 ||
          this.searchData.constants.data.length > 0 ||
          this.searchData.units.data.length     > 0
        ) {
          this.searchResults = true;
        } else {
          this.searchResults = false;
        }
      }
    }
  }
</script>