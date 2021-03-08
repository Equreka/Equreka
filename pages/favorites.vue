<template>
  <div class="container">
    <h2>{{ $t('page.favorites.title') }}</h2>
    <p class="lead">{{ $t('page.favorites.lead') }}</p>
    <p v-if="!support">{{ $t('page.favorites.no-support', support) }}</p>
    <!-- Favorites -->
    <template v-if="favorites && Object.keys(favorites).length != 0">
      <!-- Table -->
      <div class="table-responsive">
        <table class="table table-data w-100">
          <thead>
            <tr>
              <th scope="col">{{ $t('Category') }}</th>
              <th scope="col">{{ $t('Type') }}</th>
              <th scope="col">{{ $t('Name') }}</th>
              <th scope="col">{{ $t('Actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(favorite, type) in favorites">
              <tr v-for="data in favorite" :key="data.slug" :class="data.category.slug" :type="type">              
                <td>
                  <NuxtLink class="badge badge-category" :to="localePath('/' + data.category.slug)">
                    {{ $t(data.category.name) }}
                  </NuxtLink>
                </td>              
                <td>
                  <NuxtLink class="link-category" :to="localePath(`/${data.category.slug}/${type}`)">
                    {{ $t(type.charAt(0).toUpperCase() + type.slice(1)) }}
                  </NuxtLink>
                </td>
                <td>
                  <NuxtLink class="link-category" :to="localePath(`/${data.category.slug}/${type}/${data.slug}`)">
                    {{ data.name }}
                  </NuxtLink>
                </td>
                <td>
                  <b-button class="link-category" variant="link" size="sm">
                    {{ $t('Remove') }}
                  </b-button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </template>
    <!-- No data -->
    <div class="mt-4" v-else>
      <h4>{{ $t('page.favorites.none') }}</h4>
    </div>
  </div>
</template>

<script>
  import Equreka from '@/constants';
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
        await Promise.all((Equreka.COLLECTIONS).map(async (type) => {
          data[type] = await Equreka.getFavorites(type);
        }));

        return {
          support: true,
          favorites: {
            formulas:  {},
            equations: data['equations'],
            units:     {},
            constants: data['constants'],
            variables: {}
          }
        }
      } else {
        return {
          support: false,
          favorites: false
        }

      }
    },
  }
</script>