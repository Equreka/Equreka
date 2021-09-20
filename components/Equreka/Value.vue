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
				default: 'html',
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
				if(format.toLowerCase() === 'html') format = 'HTML';
				if(format.toLowerCase() === 'tex')  format = 'TeX';
				return format;
			},
			formatedValue() {
				let value = this.data;
				// Convert string to number
				if(typeof value == 'string') value = Number(value);
				// Convert to scientific notation
				value = value.toPrecision(this.precision);
				// Split into value and exponent
				let split = value.split('e');
				// Already assuming the worst case lol
				if(!split || split.length == 1) return new Intl.NumberFormat(undefined, { maximumFractionDigits: this.precision }).format(value);
				let formatedValue = split[0];
				let exponent = split[1],
					 exponentSign = exponent ? exponent.charAt(0) : false,
					 exponentValue = exponent ? exponent.substr(1) : false,
					 exponentSignClass = false;
				// If exponent is negative, add a minus sign
				if(exponentSign) {
					exponentSignClass = exponentSign === '+' ? 'plus' : 'minus';
				}
				// Format the value
				let numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: this.precision }).format(formatedValue);
				// Styling for text
				formatedValue = `${numberFormat}×10${exponent}`;
				// Styling for HTML
				if(this.valueFormat === 'HTML') {
					// Format the exponent
					if(exponentSign && exponentValue) {
						exponent  = `<span class="math math-html math-exponent-sign math-exponent-sign-${exponentSignClass}">${exponentSign}</span>`
						exponent += `<span class="math math-html math-exponent-value">${exponentValue}</span>`;
					}
					formatedValue  = `<span class="math math-html math-value">${numberFormat}</span>`
					formatedValue += `<span class="math math-html math-exponent">×10</span><sup>${exponent}</sup>`;
				}
				// Styling for TeX
				if(this.valueFormat === 'TeX') {
					// Format the exponent
					if(exponentSign && exponentValue) {
						exponent  = `\\class{math math-tex math-exponent-sign math-exponent-sign-${exponentSignClass}}{${exponentSign}}`
						exponent += `\\class{math math-tex math-exponent-value}{${exponentValue}}`;
					}
					formatedValue  = `\\class{math math-tex math-value}{${numberFormat}}`
					formatedValue += `\\class{math math-tex math-exponent}{×10}^{${exponent}}`;
				}
				// Return formatted value
				return formatedValue;
			},
			html() {
				// Simple value
				if(this.valueFormat !== 'TeX') return this.formatedValue;
				// MathJax Inline
				if(this.display === 'inline') return `$${this.formatedValue}$`;
				// MathJax Block
				return `$$${this.formatedValue}$$`
			}
		}
	}
</script>