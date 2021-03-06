<template>
  <header class="page-header" :class="category.slug">
    <div class="container">
      <div class="wrapper">
        <div class="info">
          <!-- Category -->
          <template v-if="main">
            <span class="category">{{ $t('Category') }}</span>
          </template>
          <template v-else>
            <NuxtLink class="category" :to="localePath('/' + category.slug)">{{ $t(category.name) }}</NuxtLink>
          </template>
          <!-- Type -->
          <template v-if="type">
            <i class="divider bi bi-chevron-right"></i>
            <NuxtLink class="type" :to="localePath('/' + category.slug + '/' + type)">{{ $t(type[0].toUpperCase() + type.substring(1)) }}</NuxtLink>
          </template>
          <!-- Name -->
          <h1 class="name">{{ $t(name) }}</h1>
        </div>

        <!-- Options -->
        <b-dropdown class="dropdown-options" variant="link" no-caret right v-if="data">
          <template #button-content>
            <i class="bi bi-three-dots-vertical"></i>
            <span class="visually-hidden">{{ $t('Options') }}</span>
          </template>
          <h6 class="dropdown-header">{{ $t('Options') }}</h6>
          <b-dropdown-item :href="json" :download="data.slug + '.json'">
            <i class="bi bi-download"></i>
            {{ $t('Download JSON') }}
          </b-dropdown-item>
          <b-dropdown-item>
            <i class="bi bi-heart"></i>
            {{ $t('Add to favorites') }}
          </b-dropdown-item>
          <b-dropdown-item @click="report()">
            <i class="bi bi-flag"></i>
            {{ $t('Report an error') }}
          </b-dropdown-item>
        </b-dropdown>
      </div>
    </div>
  </header>
</template>

<script>
  export default {
    props: {
      main: Boolean,
      category: [String, Object],
      type: String,
      slug: String,
      name: String,
      data: [Array, Object],
      json: String
    },
    methods: {
      report() {
        this.$router.push({ 
          path:  this.localePath('/report'), 
          query: this.$route.params
        })
      }
    },
    
  }
</script>