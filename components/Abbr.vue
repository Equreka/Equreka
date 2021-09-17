<template>
	<span class="abbr" :class="(always) ? 'always' : false">
		<abbr :class="show ? show + '-none'   : false" :title="$t(`abbreviations.${string}.cap`)">
			{{ $t(`abbreviations.${string}.abbr`) }}
		</abbr>
		<span :class="show ? show + '-inline' : false">
			{{ $t(`abbreviations.${string}.cap`) }}
		</span>
	</span>
</template>

<script>
	export default {
		props: {
			string: String,
			always: Boolean,
			expand: String
		},
		computed:{
			show() {
				if(this.expand) return `d-${this.expand}`;
				return false;
			}
		}
	}
</script>