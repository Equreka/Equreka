<template>
  <div class="items" v-if="data.length >= 1" role="menu" tabindex="-1">
    <h5 class="title">
      {{ $t(title) }}
      <small class="badge">{{data.length}}</small>
    </h5>
    <NuxtLink class="item" role="menuitem" tabindex="0"
      v-for="item of data"
      :key="item.slug"
      :class="item.category.slug"
      :to="localePath(`/${item.category.slug}/${slug}${item.slug}`)"
    >
      <span>
        {{ item.name }}
      </span>
      <span class="badge">
        {{ $t(item.category.name) }}
      </span>      
    </NuxtLink>
  </div>
</template>

<script>
  export default {
    props: {
      title: String,
      slug:  String,
      data:  [Array, Object]
    }
  }
</script>