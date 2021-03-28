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
  import Equreka from "@/equreka";
  import jslinq from "jslinq";
  export default {
    props: {
      display: {
        type: Boolean,
        default: true
      }
    },
    data() {
      return {
        searchResults: false,
        searchFocus:   false,
        searchQuery:   '',
        searchData: {
          equations: [],
          formulas:  [],
          variables: [],
          constants: [],
          units:     []
        }
      }
    },
    watch: {
      async searchQuery(searchQuery) {
        // Validate searchQuery
        if(!searchQuery || searchQuery == "" || searchQuery.length <= 1) {
          this.searchResults = false;
          return;
        }
        
        // Fetch Data
        await Promise.all((Equreka.TYPES).map(async (type) => {
          try {
            this.searchData[type] = await fetch(`${process.env.api}/${type}/search/${searchQuery}`).then((res) => res.json());
          } catch {
            try {
              let
                dataOffline = [],
                searchRegex = new RegExp(Equreka.sanitizeSearch(searchQuery), "i");
              const dbOffline = await import("@/static/data");
              dataOffline[type] = jslinq(dbOffline[type]);
              this.searchData[type] = dataOffline[type].where((el) => {
                if(Object.keys(el).length !== 0) {
                  if(searchRegex.exec(el.slug) || searchRegex.exec(el.name)) {
                    return el
                  }
                }
              }).toList();
            } catch {
              this.searchData[type] = [];
            }
          }
        }));

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