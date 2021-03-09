<template>
  <div class="container">
    <h2>{{ $t('page.favorites.title') }}</h2>
    <p class="lead">{{ $t('page.favorites.lead') }}</p>
    <p v-if="!support">{{ $t('page.favorites.no-support', support) }}</p>
    <!-- Favorites -->
    <template v-if="favorites && haveFavorites(favorites)">
      <!-- Table -->
      <div class="table-responsive">
        <table class="table table-data table-favorites">
          <thead>
            <tr>
              <th scope="col" class="category"><Abbr string="category" /></th>
              <th scope="col" class="type">{{ $t('Type') }}</th>
              <th scope="col" class="name">{{ $t('Name') }}</th>
              <th scope="col" class="actions">{{ $t('Actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(favorite, type) in favorites">
              <tr v-for="data in favorite" :key="data.slug" :class="data.category.slug">              
                <td class="category">
                  <NuxtLink class="badge badge-category" :to="localePath('/' + data.category.slug)">
                    <Abbr :string="data.category.slug" />
                  </NuxtLink>
                </td>              
                <td class="type">
                  <NuxtLink class="badge badge-type" :to="localePath(`/${data.category.slug}/${type}`)">
                    <Abbr :string="type" />
                  </NuxtLink>
                </td>
                <td class="name">
                  <NuxtLink class="link-category" :to="localePath(`/${data.category.slug}/${type}/${data.slug}`)">
                    {{ data.name }}
                  </NuxtLink>
                </td>
                <td class="actions">
                  <b-button class="p-1" variant="text" @click="removeFavorite(type, data._id)" :title="$t('page.favorites.remove')">
                    <span class="visually-hidden">{{ $t('page.favorites.remove') }}</span>
                    💔
                  </b-button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </template>
    <!-- No data -->
    <div class="mt-4" v-else-if="support">
      <h4>{{ $t('page.favorites.none') }}</h4>
    </div>
  </div>
</template>

<script>
  import Equreka from '@/equreka';
  export default {
    data() {
      return {
        support: true,
        favorites: {}
      }
    },
    async asyncData() {
      if (typeof(Storage) !== "undefined") {
        let data = []
        await Promise.all((Equreka.TYPES).map(async (type) => {
          data[type] = await Equreka.getFavorites(type);
        }));

        return {
          support: true,
          favorites: {
            formulas:  {},
            equations: data['equations'],
            units:     data['units'],
            constants: data['constants'],
            variables: data['variables']
          }
        }
      } else {
        return {
          support: false,
          favorites: false
        }

      }
    },
    head() {
      return {
        bodyAttrs: {
          class: `page-favorites`
        }
      }
    },
    methods: {
      haveFavorites(object) {
        return Equreka.haveFavorites(object);
      },

      removeFavorite(type, id) {
        if(Equreka.removeFavorite(type, id)) {
          this.$router.app.refresh();
        } else {
          alert(this.$t('An error occurred'));
        }
      }
    },
  }
</script>