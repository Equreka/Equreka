<template>
  <div class="items" v-if="data.length > 0">
    <h5 class="title">
      {{ $t(`abbreviations.${type}.cap`) }}
      <small class="badge ml-auto ml-md-2">{{data.length}}</small>
    </h5>
    <NuxtLink class="item" role="menuitem" tabindex="0"
      v-for="item of data"
      :key="item.slug"
      :class="item.category"
      :to="localePath(`/${item.category}/${type}/${item.slug}`)"
    >
      <span>
        {{ item.name }}
      </span>
      <Abbr :string="item.category" class="badge badge-category" />
    </NuxtLink>
  </div>
</template>

<script>
	export default {
		props: {
			data: [Array, Object],
			type: String,
		}
	}
</script>