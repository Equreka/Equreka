<template>
	<span class="math math-jax math-expression">
		$${{ content }}$$
	</span>
</template>

<script>
	export default {
		props: {
			expression: {
				type: String | Object,
				default: null,
			},
			text: {
				type: String | Object,
				default: null,
			},
			symbol: {
				type: String | Object,
				default: null,
			},
			unit: {
				type: String | Object | Boolean,
				default: false,
			}
		},
		computed: {
			content() {
				let content;
				if(this.expression && this.expression) content = this.expression;
				if(this.text) content = `\\text{${this.text}} - ${this.symbol.tex}`;
				return content;
			}
		}
	}
</script>