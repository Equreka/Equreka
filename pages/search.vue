<template>
  <main role="main" class="search">
    <div class="container">
      <h2 class="page-title">{{ $t('page.search.title') }}</h2>
      <p class="lead">{{ $t('page.search.lead') }}</p>
      <!-- Input -->
      <div id="search-bar" class="search-bar lg mb-4">
        <form>
          <label for="search-bar" class="form-label visually-hidden">
            {{ $t('search.input-label') }}
          </label>
          <input id="search-bar" type="search" name="q" class="form-control" autocomplete="off"
            :placeholder="$t('search.input-placeholder')" :value="searchQuery" />
          <button class="btn btn-link" type="submit" :aria-label="$t('search.button-submit')">
            <i class="bi bi-search"></i>
          </button>
        </form>
      </div>
      <h4 class="h6 mb-3 d-none" v-if="searchQuery"><span class="text-muted">Search:</span> {{ searchQuery }}</h4>
      <!-- Reuslts -->
      <div class="search-results" v-if="searchQuery && searchResults">
        <SearchBarResults id="search-bar-results" v-for="(searchData, searchType) in searchData" :key="searchData.slug"
          v-bind:type="searchType.charAt(0).toUpperCase() + searchType.slice(1)" v-bind:slug="searchType"
          v-bind:data="searchData" />
      </div>
      <!-- No results -->
      <template v-else-if="searchQuery && !searchResults">
        <h5 class="title">{{ $t('search.no-results') }}</h5>
      </template>
      <!-- No query -->
      <template v-else>
        <svg class="page-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 466">
          <style>
            .color{fill:var(--bs-purple)}
            .body-bg{fill:var(--body-bg)}
            .body-color{fill:var(--body-color)}
            .body-color-high{fill:var(--body-color-highlight)}
          </style>
          <path d="M366.6 352.9l-249.8 64.3a33 33 0 01-40.2-23.7L1 100A33 33 0 0124.8 60L257.2 0l59.5 26.6 73.7 286a33 33 0 01-23.8 40.3z" class="body-color"/>
          <path d="M27.1 69a23.5 23.5 0 00-16.9 28.7L85.8 391a23.5 23.5 0 0028.6 16.9l249.9-64.3a23.5 23.5 0 0016.9-28.7L308.7 33.4 256.4 10z" class="body-bg"/>
          <path d="M316 28.1l-38.6 10a11 11 0 01-13.4-7.9l-7.3-28.6a.7.7 0 011-.8l58.5 26a.7.7 0 01-.1 1.3zM295.7 278.7L182 308a5.5 5.5 0 01-2.8-10.6L293 268a5.5 5.5 0 112.7 10.6zM322.3 291l-135.7 35a5.5 5.5 0 01-2.7-10.7l135.7-35a5.5 5.5 0 012.7 10.7z" class="body-color"/>
          <circle id="a597741b-ffcf-4aba-98b0-6652ef5d57c9" cx="135.6" cy="323.9" r="19.4" class="body-color"/>
          <path d="M283.6 227.9l-151 38.9a17 17 0 01-20.7-12.2l-31.7-123a17 17 0 0112.2-20.7l151.1-39a17 17 0 0120.7 12.3l31.7 123a17 17 0 01-12.3 20.7z" class="body-bg"/>
          <path d="M283.6 227.9l-151 38.9a17 17 0 01-20.7-12.2l-31.7-123a17 17 0 0112.2-20.7l151.1-39a17 17 0 0120.7 12.3l31.7 123a17 17 0 01-12.3 20.7zM93 112.9A15 15 0 0082.1 131l31.7 123a15 15 0 0018.3 10.7L283 226a15 15 0 0010.8-18.3l-31.6-123A15 15 0 00244 73.9z" class="body-color"/>
          <path id="b056fd3f-f1a0-44f0-b006-deff0bee637d" d="M546.8 252.4L470.6 272a2.7 2.7 0 01-3.3-1.7 2.6 2.6 0 011.8-3.4l77.7-20c3 1.6 2.3 4.9 0 5.5z" class="body-color" transform="translate(-311 -139)"/>
          <path id="f1ea6668-a825-428d-96fe-a2c4e1b5a672" d="M550.3 265.7L474 285.4a2.7 2.7 0 01-3.3-1.7 2.6 2.6 0 011.9-3.4l77.6-20c3.1 1.6 2.3 4.9 0 5.4z" class="body-color" transform="translate(-311 -139)"/>
          <path id="ee9aa382-a9c9-40d0-8ed3-22ec2dd616d6" d="M459.5 297.2l-23.3 6a3 3 0 01-3.6-2.1l-7-27.5a3 3 0 012.1-3.6l23.3-6a3 3 0 013.6 2.2l7 27.4a3 3 0 01-2 3.6z" class="body-color" transform="translate(-311 -139)"/>
          <path id="be954d2b-d8b8-4d26-80a0-a319e99a4b10" d="M557.1 293.2l-116.4 30a2.7 2.7 0 01-3.3-1.8 2.6 2.6 0 011.9-3.3L557 287.8c3.2 1.6 2.3 4.8.1 5.4z" class="body-color" transform="translate(-311 -139)"/>
          <path id="baaae9e4-1b4d-40c2-8a9d-f2abb078b489" d="M560.6 306.6l-116.4 30a2.7 2.7 0 01-3.3-1.8 2.6 2.6 0 011.8-3.3l117.8-30.3c3.1 1.5 2.3 4.8 0 5.4z" class="body-color" transform="translate(-311 -139)"/>
          <path id="a91bf4c9-37f6-4391-92ed-1882bd0ce21c" d="M564 320l-116.4 29.9a2.7 2.7 0 01-3.3-1.7 2.6 2.6 0 011.9-3.4l117.7-30.3c3.1 1.6 2.3 4.9 0 5.4z" class="body-color" transform="translate(-311 -139)"/>
          <path id="efb98e07-468b-4c85-9a64-ee4cc5493d6f" d="M567.4 333.3l-116.3 30a2.7 2.7 0 01-3.3-1.8 2.6 2.6 0 011.8-3.3L567.4 328c3 1.6 2.3 4.8 0 5.4z" class="body-color" transform="translate(-311 -139)"/>
          <path id="aeb1db98-32e5-40b8-ab89-fdad6a3263dc" d="M570.9 346.7l-116.4 30a2.7 2.7 0 01-3.3-1.8 2.6 2.6 0 011.9-3.3l117.7-30.3c3.1 1.6 2.3 4.8 0 5.4z" class="body-color" transform="translate(-311 -139)"/>
          <path id="be265de5-288f-49a7-867d-c42e7cdbf4db" d="M448 469.7a2 2 0 01-1.3 0l-5.3-2.3a2 2 0 111.6-3.8l3.4 1.5 4.5-10.6a2 2 0 012.7-1 2 2 0 011 2.6l-5.2 12.5a2 2 0 01-1.4 1.1z" class="body-bg" transform="translate(-311 -139)"/>
          <path d="M462.5 464.7h-258a33 33 0 01-33-33v-303a33 33 0 0133-33h240l51 40.6v295.4a33 33 0 01-33 33z" class="body-color"/>
          <path d="M204.5 105.2a23.5 23.5 0 00-23.5 23.5v303a23.5 23.5 0 0023.5 23.5h258a23.5 23.5 0 0023.5-23.5V140.9l-44.8-35.7z" class="body-bg"/>
          <path d="M412.3 193.3H294.8a5.5 5.5 0 010-11h117.5a5.5 5.5 0 110 11zM435 211.8H294.8a5.5 5.5 0 010-11H435a5.5 5.5 0 110 11z" class="color"/>
          <path d="M412.3 265.4H294.8a5.5 5.5 0 100 11h117.5a5.5 5.5 0 000-11zM435 284H294.8a5.5 5.5 0 100 11H435a5.5 5.5 0 000-11zM412.3 359.5H294.8a5.5 5.5 0 010-11h117.5a5.5 5.5 0 110 11zM435 378H294.8a5.5 5.5 0 010-11H435a5.5 5.5 0 110 11z" class="body-color"/>
          <circle id="abdb8e2f-a218-463c-85f4-c869fef49971" cx="245.9" cy="197.1" r="19.4" class="color"/>
          <path id="ba7dbbd6-0052-44b1-a552-47a8298b8d3e" d="M555 343.5a2 2 0 01-1.2-.4l-4.6-3.5a2 2 0 112.5-3.2l3 2.2 6.9-9a2 2 0 012.8-.4 2 2 0 01.4 2.8l-8.2 10.7a2 2 0 01-1.6.8z" class="body-bg" data-name="Path 395" transform="translate(-311 -139)"/>
          <path d="M267.3 280.2a19.4 19.4 0 01-19.4 19.4 4.2 4.2 0 01-.5 0 19.4 19.4 0 1120-19.4z" class="body-color"/>
          <circle id="e4a71040-498e-4958-ad41-c2d79154b8f7" cx="245.9" cy="363.3" r="19.4" class="body-color"/>
          <path d="M494.5 137.6h-40a11 11 0 01-11-11V97.1a.7.7 0 011.2-.5l50.2 39.8a.7.7 0 01-.4 1.2z" class="body-color"/>
          <path d="M267.3 280.2a19.4 19.4 0 01-19.4 19.4 4.2 4.2 0 01-.5 0 42 42 0 013.8-38.6 19.4 19.4 0 0116.1 19.2zM289.3 271a5.5 5.5 0 015.5-5.6h29.3a41.6 41.6 0 013.6 11h-32.9a5.5 5.5 0 01-5.5-5.5zM328.4 284a42 42 0 01-1.5 11h-32a5.5 5.5 0 110-11z" class="color"/>
          <path d="M400.8 351.7a6 6 0 01-8.2 2l-70-42.7a6 6 0 016.2-10.2l70 42.7a6 6 0 012 8.2z" class="body-color-high"/>
          <path d="M330.8 309a48 48 0 11-16-66 48 48 0 0116 66zm-71.7-43.7a36 36 0 1049.5-12 36 36 0 00-49.5 12z" class="body-color-high"/>
        </svg>
      </template>
    </div>
  </main>
</template>

<script>
  import Equreka from "@/equreka";
  import jslinq from "jslinq";
  export default {
    data() {
      return {
        searchResults: false,
        searchQuery: '',
        searchData: {
          equations: [],
          formulas: [],
          variables: [],
          constants: [],
          units: []
        }
      }
    },
    async asyncData({ query }) {
      let searchQuery;
      if (!query.q) {
        return
      } else {
        searchQuery = query.q;
      }
      
      let searchData = {},
          searchResults;

      // Fetch Data
      await Promise.all((Equreka.TYPES).map(async (type) => {
        try {
          searchData[type] = await fetch(`${process.env.api}/${type}/search/${searchQuery}`).then((res) => res.json());
          
        } catch {
          try {
            let
              dataOffline = [],
              searchRegex = new RegExp(Equreka.sanitizeSearch(searchQuery), "i");
            const dbOffline = await import("@/static/data");
            dataOffline[type] = jslinq(dbOffline[type]);
            searchData[type] = dataOffline[type].where((el) => {
              if(Object.keys(el).length !== 0) {
                if(searchRegex.exec(el.slug) || searchRegex.exec(el.name)) {
                  return el
                }
              }
            }).toList();
          } catch {
            searchData[type] = [];
          }
        }
      }));
      
      // Search results
      if (
        (searchData.constants && searchData.constants.length > 0) ||
        (searchData.equations && searchData.equations.length > 0) ||
        (searchData.formulas && searchData.formulas.length > 0) ||
        (searchData.variables && searchData.variables.length > 0) ||
        (searchData.units && searchData.units.length > 0)
      ) {
        searchResults = true;
      } else {
        searchResults = false;
      }
      // Return results
      return {
        searchData: searchData,
        searchQuery: searchQuery,
        searchResults: searchResults,
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