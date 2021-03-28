<template>
  <main role="main" class="favorites">
    <div class="container">
      <h2 class="page-title">{{ $t('page.favorites.title') }}</h2>
      <p class="lead mb-4">{{ $t('page.favorites.lead') }}</p>

      <p v-if="!support">{{ $t('page.favorites.no-support', support) }}</p>
      <!-- Favorites -->
      <template v-if="favorites && haveFavorites(favorites)">
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
                  <td class="category" :class="data.category.slug">
                    <NuxtLink class="badge badge-category" :to="localePath('/' + data.category.slug)">
                      <Abbr :string="data.category.slug" />
                    </NuxtLink>
                  </td>              
                  <td class="type" :class="type">
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
                    <button type="button" class="btn p-1" variant="text" @click="removeFavorite(type, data._id)" :title="$t('page.favorites.remove')">
                      <span class="visually-hidden">{{ $t('page.favorites.remove') }}</span>
                      💔
                    </button>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </template>

      <!-- No data -->
      <template v-else-if="support">
        <h4>{{ $t('page.favorites.none') }}</h4>
        <svg class="page-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 460">
          <style>
            .color{fill:var(--bs-red)}
            .body-bg{fill:var(--body-bg)}
            .body-color{fill:var(--body-color)}
            .body-color-high{fill:var(--body-color-highlight)}
          </style>
          <path class="color" d="M573.25977 279.26375l-46.77977 46.17-105.72023 104.32-2.13965 2.11-11.91992 11.76-24.9902-24.69-2.20019-2.17-45.69-45.13h-.00976l-14.64013-14.47-8.6499-8.55-25.76025-25.44-3.4795-3.44-41.06006-40.56a117.65792 117.65792 0 01-20.52-27.63c-.5-.91-.97022-1.83-1.43018-2.75A117.50682 117.50682 0 01342.98 80.26375h.01025c.37989.06.75.12 1.12989.2a113.60526 113.60526 0 0111.91015 2.77 117.09292 117.09292 0 0129.11961 12.93q1.4253.885 2.82031 1.8a118.17183 118.17183 0 0118.46973 15.09l.3501-.35.3501.35a118.54248 118.54248 0 0110.83007-9.58c.82959-.65 1.66993-1.29 2.50977-1.91a117.44922 117.44922 0 0190.51025-21.06 111.92113 111.92113 0 0111.91993 2.78q1.96507.55509 3.8999 1.2c1.04.34 2.08008.69 3.10986 1.07a116.42525 116.42525 0 0124.39014 12.1q2.50488 1.63494 4.93994 3.42a117.54672 117.54672 0 0114.00977 178.19z"/>
          <path d="M526.48 325.43375l-105.72023 104.32-2.13965 2.11-11.91992 11.76-24.9902-24.69-2.20019-2.17-45.69-45.13c7.34034-1.71 18.62012.64 22.75 2.68 9.79 4.83 17.84034 12.76 27.78028 17.28a46.138 46.138 0 0028.33009 3.13c17.81982-3.74 31.60986-17.52 43.77-31.08 12.15966-13.57 24.58984-28.13 41.67968-34.42 9.01028-3.32 18.68996-4.07 28.35014-3.79z" opacity=".15"/>
          <path d="M368.87988 87.77375c-6.41992 5.07-13.31006 9.75-17.48 16.68-3.06982 5.12-4.3999 11.07-5.39013 16.95-1.91993 11.44-2.73975 23.16-6.5 34.12994-3.75 10.97-11.06983 21.45-21.91993 25.54-6.73 2.53-14.1499 2.39-21.31982 1.9-17.68994-1.2-35.5-4.37-51.41992-12.16-8.8999-4.36-17.53028-10.24-27.41992-10.89a25.39538 25.39538 0 00-6.02.33A117.494 117.494 0 01342.98 80.26375h.01025c.37989.06.75.12 1.12989.2a113.60526 113.60526 0 0111.91015 2.77 117.48205 117.48205 0 0112.84959 4.54z" opacity=".15"/>
        </svg>  
      </template>
    </div>
  </main>
</template>

<script>
  import Equreka from "@/equreka";;
  export default {
    data() {
      return {
        support: true,
        favorites: false
      }
    },
    async asyncData() {
      if (typeof(Storage) !== "undefined") {
        let dataStorage = [], data = [], dataOffline = [];
        await Promise.all((Equreka.TYPES).map(async (type) => {
          data[type] = await Equreka.getFavorites(type);
        }));
        
        return {
          support: true,
          favorites: {
            constants: data['constants'],
            equations: data['equations'],
            formulas:  data['formulas'],
            units:     data['units'],
            variables: data['variables']
          }
        }
      } else {
        return {
          support:   false,
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
        if(object) {
          return Equreka.haveFavorites(object);
        } else {
          return false;
        }
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