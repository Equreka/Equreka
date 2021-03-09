<template>
  <header class="page-header" :class="category">
    <div class="container">
      <div class="wrapper">
        <div class="info">
          <!-- Category -->
          <template v-if="!type && !data">
            <span class="category">
              {{ $t('Category') }}
            </span>
          </template>
          <template v-else>
            <NuxtLink class="category" :to="localePath('/' + category)">
              {{ $t('page.header.' + category) }}
            </NuxtLink>
          </template>
          <!-- Type -->
          <template v-if="type && data">
            <i class="divider bi bi-chevron-right"></i>
            <NuxtLink class="type" :to="localePath('/' + category + '/' + type)">
              {{ $t('page.header.' + type) }}
            </NuxtLink>
          </template>
          <!-- Name -->
          <h1 class="name">
            <template v-if="!data">
                {{ $t('page.header.' + name) }}
            </template>
            <template v-else>
                {{ $t(name) }}
            </template>
          </h1>

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
          <b-dropdown-item @click="addFavorite">
            <i class="bi bi-heart"></i>
            {{ $t('Add to favorites') }}
          </b-dropdown-item>
          <b-dropdown-item @click="reportPage()">
            <i class="bi bi-flag"></i>
            {{ $t('Report an error') }}
          </b-dropdown-item>
        </b-dropdown>
      </div>
    </div>
  </header>
</template>

<script>
  import Equreka from '@/equreka';
  export default {
    props: {
      category: String,
      type: String,
      name: String,
      data: [Array, Object],
      json: String
    },
    methods: {
      reportPage() {
        this.$router.push({ 
          path:  this.localePath('/report'), 
          query: this.$route.params
        })
      },
      addFavorite() {
        if(Equreka.addFavorite(this.type, this.data._id)) {
          alert(this.$t('Added to favorites'));
        } else {          
          alert(this.$t('page.favorites.no-support'))
        }
      }
    }
  }
</script>