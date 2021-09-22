<template>
	<span v-if="false" />
</template>

<script>
	export default {
		props: {
			config: {
				type: Object,
			},
			options: {
				type: Object,
			},
			loader: {
				type: Object,
			}, 
			tex: {
				type: Object,
			}, 
			startup: {
				type: Object,
			}
		},
		head() {
			return {
				script: [
					{
						id: 'MathJax-script',
						src: '/mathjax/tex-mml-chtml.js',
						async: true,
					}
				]
			}
		},
		computed: {
			Config() {
				// If the config is not an object, then it is a string,
				if(this.config) return this.config;
				// If no config is passed, use the default config
				let config = {
					options: {
						enableMenu: false,
					},
					loader: {
						load: ['[tex]/html']
					},
					tex: { 
						inlineMath: [['$', '$']],
						packages: { '[+]': ['html'] },
					}
				};
				// Keys of config
				const keys = ['options', 'loader', 'tex', 'startup'];
				// Replace the default config with the passed config
				keys.forEach(key => {
					if(this[key]) config[key] = this[key];
				});
				// Return the config
				return config;
			}
		},
		watch: {
			key() {
				this.update();
			}
		},
		methods: {
			render() {
				if(window.MathJax) {
					window.MathJax = this.Config;
				}
			}
		},
		created() {
			this.render();
		}
	}
</script>