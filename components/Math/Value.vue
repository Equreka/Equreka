<template>
	<span class="equreka-value math math-value" v-if="show" v-html="html" />
</template>

<script>
	export default {
		props: {
			data: {
				type: String | Number,
				required: true
			},
			format: {
				type: String,
				default: 'tex',
			},
			display: {
				type: String,
				default: 'inline',
			},
			precision: {
				type: Number,
				default: 9,
			}
		},
		computed: {
			show() {
				return this.data !== undefined && this.data !== null;
			},
			valueFormat() {
				let format = this.format;
				if(format.toLowerCase() === 'html') format = 'html';
				if(format.toLowerCase() === 'tex')  format = 'tex';
				return format;
			},
			valueFormatted() {
				let value = this.data;
				// Convert string to number
				if(typeof value == 'string') value = Number(value);
				// Convert to scientific notation
				value = value.toPrecision(this.precision);
				// Split into value and exponent
				let split = value.split('e');
				// Already assuming the worst case lol
				if(!split || split.length == 1) return new Intl.NumberFormat(undefined, { maximumFractionDigits: this.precision }).format(value);
				let valueFormatted = split[0];
				let exponent = split[1],
					 exponentSign = exponent ? exponent.charAt(0) : false,
					 exponentValue = exponent ? exponent.substr(1) : false,
					 exponentSignClass = false;
				// If exponent is negative, add a minus sign
				if(exponentSign) {
					exponentSignClass = exponentSign === '+' ? 'plus' : 'minus';
				}
				// Format the value
				let numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: this.precision }).format(valueFormatted);
				// Styling for text
				valueFormatted = `${numberFormat}×10${exponent}`;
				// Styling for HTML
				if(this.valueFormat === 'html') {
					// Format the exponent
					if(exponentSign && exponentValue) {
						exponent  = `<span class="math math-html math-exponent-sign math-exponent-sign-${exponentSignClass}">${exponentSign}</span>`
						exponent += `<span class="math math-html math-exponent-value">${exponentValue}</span>`;
					}
					valueFormatted  = `<span class="math math-html math-value">${numberFormat}</span>`
					valueFormatted += `<span class="math math-html math-exponent">×10</span><sup>${exponent}</sup>`;
				}
				// Styling for TeX
				if(this.valueFormat === 'tex') {
					// Format the exponent
					if(exponentSign && exponentValue) {
						exponent  = `\\class{math math-tex math-exponent-sign math-exponent-sign-${exponentSignClass}}{${exponentSign}}`
						exponent += `\\class{math math-tex math-exponent-value}{${exponentValue}}`;
					}
					valueFormatted  = `\\class{math math-tex math-value}{${numberFormat}}`
					valueFormatted += `\\class{math math-tex math-exponent}{\\times 10}^{${exponent}}`;
				}
				// Return formatted value
				return valueFormatted;
			},
			html() {
				// Simple value
				if(this.valueFormat !== 'tex') return this.valueFormatted;
				// MathJax Inline
				if(this.display === 'inline') return `$${this.valueFormatted}$`;
				// MathJax Block
				return `$$${this.valueFormatted}$$`
			}
		}
	}
</script>