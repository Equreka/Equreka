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
				default: null,
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
				let symbolData = this.data,
				    symbol = symbolData.tex,
					 format = this.symbolFormat;
				// We don't have an object, so we assume it's a symbol string
				if (typeof this.data === 'string') return symbolData;
				// If key is in the symbol object
				if(format && [format] in this.data && this.data[format]) {
					symbol = this.data[format];
				}
				return symbol;
			},
			symbolClass() {
				return `math math-${this.symbolFormat} math-symbol`;
			},
			symbolFormat() {
				if(!this.format || this.format.toLowerCase() === 'tex') return 'tex';
				if(this.format.toLowerCase() === 'html') return 'HTML';
				if(this.format.toLowerCase() === 'text') return 'text';
				return 'fallback';
			},
			symbolSup() {
				if(this.sup === false) return '';
				let symbolSup = this.sup;
				if(this.symbolFormat === 'tex')  symbolSup = `^{${this.sup}}`;
				if(this.symbolFormat === 'html') symbolSup = `<sup>${this.sup}</sup>`;
				return symbolSup;
			},
			html() {
				if(this.symbolFormat.toLowerCase() !== 'tex') return this.symbol + this.symbolSup;
				if(this.display === 'raw') return this.symbol;
				if(this.display === 'inline') return '$' + this.symbol + this.symbolSup + '$';
				return '$$' + this.symbol + this.symbolSup + '$$';
			}
		}
	}
</script>