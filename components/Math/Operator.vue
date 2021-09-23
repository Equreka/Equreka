<template>
	<span class="math math-symbol-equality" v-html="operator"/>
</template>

<script>
	export default {
		props: {
			data: {
				type: String,
				default: 'equal',
			},
			display: {
				type: String,
				default: 'inline',
			},
			format: {
				type: String,
				default: 'tex',
			}
		},
		computed: {
			operator() {
				let display = this.display;
				let types = {
					'text': this.symbol,
					'inline': '$'+this.symbol+'$',
					'block': '$$'+this.symbol+'$$',
				}
				if(this.format != 'tex') display = 'text';
				return types[display];
			},
			symbol() {
				let
					symbol = this.data,
					format = this.format,
					types = {
						'text': {
							// Plus
							'plus': '+',
							// Minus
							'minus': '-',
							// Plus-minus
							'plus-minus': '±',
							// Multiplication
							'times': '×',
							'multiplication': '×',
							// Division
							'divide': '÷',
							'division': '÷',
							// Equal
							'equal': '=',
							'not-equal': '≠',
							// Equivalent
							'equivalent': '≡',
							'not-equivalent': '≡⃥',
							// Less than
							'less-than': '<',
							'not-less-than': '',
							// Less than or equal
							'less-than-or-equal': '≤',
							'not-less-than-or-equal': '≤',
							// Greater than
							'greater-than': '>',
							'not-greater-than': '>',
							// Greater than or equal
							'greater-than-or-equal': '≥',
							'not-greater-than-or-equal': '≥',
							// Approximately
							'approximately': '≈',
							'not-approximately': '≢',
							// Approximately equal
							'approximately-equal': '≅',
							'not-approximately-equal': '≆',
							// Approximately equivalent
							'approximately-equivalent': '≃',
							'not-approximately-equivalent': '≢',
						},
						'html': {
							// Plus
							'plus': '&plus;',
							// Minus
							'minus': '&minus;',
							// Plus-minus
							'plus-minus': '&plusmn;',
							// Multiplication
							'times': '&times;',
							'multiplication': '&times;',
							// Division
							'divide': '&divide;',
							'division': '&divide;',
							// Equal
							'equal': '&equals;',
							'not-equal': '&NotEqual;',
							// Equivalent
							'equivalent': '&equiv;',
							'not-equivalent': '&nequiv;',
							// Less than
							'less-than': '&lt;',
							'not-less-than': '&NotLess;',
							// Less than or equal
							'less-than-or-equal': '&leq;',
							'not-less-than-or-equal': '&NotLessEqual;',
							// Greater than
							'greater-than': '&gt;',
							'not-greater-than': '&NotGreater;',
							// Greater than or equal
							'greater-than-or-equal': '&geq;',
							'not-greater-than-or-equal': '&NotGreaterEqual;',
							// Approximately
							'approximately': '&approx;',
							'not-approximately': '&napprox;',
							// Approximately equal
							'approximately-equal': '&approxeq;',
							'not-approximately-equal': '&napproxeq;',
							// Approximately equivalent
							'approximately-equivalent': '',
							'not-approximately-equivalent': '',
						},
						'tex': {
							// Plus
							'plus': '+',
							// Minus
							'minus': '-',
							// Plus-minus
							'plus-minus': '±',
							// Multiplication
							'times': '\\times',
							'multiplication': '\\times',
							// Division
							'divide': '\\div',
							'division': '\\div',
							// Plus Minus
							'plus-minus': '\\pm',
							// Equal
							'equal': '=',
							'not-equal': '\\neq',
							// Equivalent
							'equivalent': '\\equiv',
							'not-equivalent': '\\not\\equiv',
							// Less than
							'less-than': '<',
							'not-less-than': '\\not<',
							// Less than or equal
							'less-than-or-equal': '\\leq',
							'not-less-than-or-equal': '\\not\\leq',
							// Greater than
							'greater-than': '>',
							'not-greater-than': '\\not>',
							// Greater than or equal
							'greater-than-or-equal': '\\geq',
							'not-greater-than-or-equal': '\\not\\geq',
							// Approximately
							'approximately': '\\approx',
							'not-approximately': '\\not\\approx',
							// Approximately equal
							'approximately-equal': '\\approxeq',
							'not-approximately-equal': '\\not\\approxeq',
							// Approximately equivalent
							'approximately-equivalent': '\\approxeq',
							'not-approximately-equivalent': '\\not\\approxeq',
						}
					}
				return types[format][symbol];
			}
		}
	}
</script>