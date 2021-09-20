<template>
	<span class="equreka-symbol" :class="symbolClass" v-if="show" v-html="html" />
</template>

<script>
	export default {
		props: {
			data: {
				type: String | Object,
				required: true
			},
			sup: {
				type: Number | Boolean,
				default: false
			},
			format: {
				type: String,
				default: 'TeX',
			},
			display: {
				type: String,
				default: 'inline',
			}
		},
		computed: {
			show() {
				return this.data !== undefined && this.data !== null;
			},
			symbol() {
				if (typeof this.data === 'string') return this.data;
				// If key is in the symbol object
				if([this.symbolFormat] in this.data && this.data[this.format]) {
					return this.data[this.format];
				}
				// Fallback
				return this.data.fallback ? this.data.fallback : this.data.TeX;
			},
			symbolClass() {
				return `math math-${this.symbolFormat} math-symbol`;
			},
			symbolFormat() {
				return this.format.toLowerCase();
			},
			symbolSup() {
				if(this.sup === false) return '';
				let symbolSup = this.sup;
				if(this.symbolFormat === 'tex') symbolSup = `^{${this.sup}}`;
				if(this.symbolFormat === 'html') symbolSup = `<sup>${this.sup}</sup>`;
				return symbolSup;
			},
			html() {
				if(this.symbolFormat !== 'tex') return this.symbol;
				if(this.display === 'inline') return `$${this.symbol + this.symbolSup}$`;
				return `$$${this.symbol}$$`
			}
		}
	}
</script>