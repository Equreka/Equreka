<template>
  <div class="form-search">
    <b-form-input 
      id="search"
      class="border-0"
      type="search"
      placeholder="Search..."
      autocomplete="off"
      aria-label="Search"
      v-model="searchQuery"
    />
    <div class="results" v-if="entries.length">
      <div class="result" v-for="entry of entries" :key="entry.slug">
        <NuxtLink v-if="entry.category" :to="'/' + entry.category.slug + '/' + entry.slug" @click.native="entries = false">
          {{ entry.name }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    data() {
      return {
        searchQuery: '',
        entries: []
      }
    },
    watch: {
      async searchQuery(searchQuery) {
        if (!searchQuery) {
          this.entries = false;
          return;
        }
        this.entries = await fetch(
          process.env.baseUrl + '/api/entries/search/' + searchQuery
        ).then((res) => res.json());
      }
    }
  }
</script>