<template>
  <header class="page-header" :class="category">
    <div class="container">
      <div class="wrapper">
        <div class="info">
          
          <!-- Category -->
          <template v-if="!type && !data">
            <NuxtLink class="category" :to="localePath('/')">
              {{ $t('Category') }}
            </NuxtLink>
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
                {{ name }}
            </template>
          </h1>

        </div>

        <!-- Actions -->
        <div class="actions" v-if="data">
          <!-- Favorites -->
          <template v-if="!favorite">
            <button type="button" class="btn btn-link" :title="$t('favorites.add')" @click="addFavorite">
              <span class="visually-hidden">
                {{ $t('favorites.add') }}
              </span>
              <i class="bi bi-heart"></i>
            </button>
          </template>
          <template v-else>
            <button type="button" class="btn btn-link" :title="$t('favorites.remove')" @click="removeFavorite">
              <span class="visually-hidden">
                {{ $t('favorites.remove') }}
              </span>
              <i class="bi bi-heart-fill"></i>
            </button>
          </template>

          <!-- Download JSON -->
          <a class="btn btn-link" :title="$t('Download JSON')" :href="json" :download="`Equreka-${category}-${type}-${data.slug}.json`">
            <span class="visually-hidden">
              {{ $t('Download JSON') }}
            </span>
            <i class="bi bi-download"></i>
          </a>

          <!-- Report -->
          <button type="button" class="btn btn-link" :title="$t('Report an error')" @click="reportPage()">
            <span class="visually-hidden">
              {{ $t('Report an error') }}
            </span>
            <i class="bi bi-flag"></i>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script>
  import Equreka from "@/equreka";;
  export default {
    data() {
      return {
        favorite: false
      }
    },
    props: {
      category: String,
      type: String,
      name: String,
      data: [Array, Object],
      json: String
    },
    mounted() {
      if(this.type && this.data) {
        this.favorite = Equreka.checkFavorite(this.type, this.data._id);
      }
    },
    methods: {
      // Report page
      reportPage() {
        this.$router.push({ 
          path:  this.localePath('/report'), 
          query: this.$route.params
        })
      },
      // Add favorite
      addFavorite() {
        if(!this.favorite) {      
          if(Equreka.addFavorite(this.type, this.data._id)) {
            this.favorite = true;
            // setTimeout(() => { alert(this.$t('favorites.added')); }, 350);
          } else {
            alert(this.$t('page.favorites.no-support'));
          }
        }
      },
      // Remove favorite
      removeFavorite() {
        if(this.favorite) {
          if(Equreka.removeFavorite(this.type, this.data._id)) {
            this.favorite = false;
            // setTimeout(() => { alert(this.$t('favorites.removed')); }, 350);
          } else {
            alert(this.$t('page.favorites.no-support'));
          }
        }
      }
    }
  }
</script>