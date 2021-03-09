<template>
  <span class="abbr" :class="(always) ? 'always' : false">
    <span>{{ $t(string + '.cap') }}</span>
    <abbr :title="$t(string + '.cap')">{{ $t(string + '.abbr') }}</abbr>
  </span>
</template>

<script>
  export default {
    props: {
      string: String,
      always: Boolean
    }
  }
</script>