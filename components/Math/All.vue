<template>
	<span v-if="false"/>
</template>

<script>
	export default {
		props: {
			safe: {
				type: Boolean,
				default: true
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
			},
			// MathJax config.startup
			startup: {
				type: Object,
			},
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
			update() {
				if(!this.update) return;
				this.renderUpdate();
			},
		},
		computed: {
			mathConfig() {
				let config = {
					options: {
						enableMenu: false,
					},
					loader: {
						load: ['[tex]/html']
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
					startup: {
						ready: () => {
							MathJax.startup.defaultReady();
							MathJax.startup.promise.then(() => {
								const mathJaxLoaded = new Event('math-jax-all-loaded');
								window.dispatchEvent(mathJaxLoaded);
								this.show();
							});
						}
					},
					...this.config
				};
				return config;
			}
		},
		methods: {
			render() {
				window.MathJax = this.mathConfig;
			},
			show() {
				let elements = document.querySelectorAll('.MathJax');
				if(elements && elements.length > 0) { 
					elements.forEach(element => {
						element.classList.add('math-jax-loaded');
						element.parentNode.classList.add('math-jax-loaded');
					});
				}
			},
			renderUpdate() {
				if(window.MathJax) {
					window.MathJax.typeset(['.MathJax']);
				}
			}
		}
	}
</script>