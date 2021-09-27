<template>
	<span ref="container" v-if="content">
		{{ content }}
	</span>
</template>

<script>
	export default {
		props: {
			data: {
				type: String | Boolean,
				default: false
			},
			safe: {
				type: Boolean,
				default: true
			},
			display: {
				type: String,
				default: 'block'
			},
			config: {
				type: Object,
			},
			update: {
				default: null
			},
			source: {
				type: String,
				default: 'local'
			},
			file: {
				type: String,
				default: 'tex-mml-chtml'
			}
		},
		head() {
			return {
				script: [{
					hid: 'MathJax-script',
					id: 'MathJax-script',
					src: this.source == 'local'
							? `/mathjax/${this.file}.js`
							: `https://cdn.jsdelivr.net/npm/mathjax@3/es5/${this.file}.js`,
					async: true,
					body: true
				}]
			}
		},
		mounted() {
			this.render();
		},
		watch: {
			data() {
				if(!this.data) return;
				this.renderUpdate();
			},
			update() {
				if(!this.update) return;
				this.renderUpdate();
			},
		},
		computed: {
			content() {
				let types = {
					'custom': this.data,
					'inline': '$'+ this.data +'$',
					'block':  '$$'+ this.data + '$$',
				}
				return types[this.display];
			},
			mathConfig() {
				let config = {
					options: {
						enableMenu: false,
					},
					tex: {
						inlineMath: [
							['$', '$'],
							['\\(', '\\)']
						],
						displayMath: [
							['$$', '$$'],
							['\\[', '\\]']
						],
						processEscapes: true,
						processEnvironments: true,
					},
					...this.config
				};
				return config;
			}
		},
		methods: {
			render() {
				if(!this.data) return;
				this.setContent();
				window.MathJax = this.mathConfig;
			},
			renderUpdate() {
				if(!this.data) return;
				this.setContent();
				if(window.MathJax) {
					window.MathJax.typeset([this.$refs.container]);
				}
			},
			setContent() {
				if(!this.data) return;
				if (this.safe) {
					this.$refs.container.textContent = this.content
				} else {
					this.$refs.container.innerHTML = this.content
				}
			}
		}
	}
</script>