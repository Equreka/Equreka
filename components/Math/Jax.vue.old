<template>
	<span v-if="false" />
</template>

<script>
	export default {
		props: {
			// Selector to render
			// Can be a string with one or more selectors, or an array of selectors
			// Ex. .mathjax-container or #mathjax-container, .mathjax-div
			//     or ['#mathjax-container', '.mathjax-div']
			selector: {
				type: String | Array,
			},
			// Instead of key we use update to force re-rendering
			// So just use a number and increase it every time you want to re-render
			update: {
				type: String | Number | Boolean,
				default: false,
			},
			// MathJax config
			config: {
				type: Object,
			},
			// MathJax config.options
			options: {
				type: Object,
			},
			// MathJax config.loader
			loader: {
				type: Object,
			}, 
			// MathJax config.tex
			tex: {
				type: Object,
			},
			// MathJax config.startup
			startup: {
				type: Object,
			},
		},
		head() {
			return {
				script: [
					{
						id: 'MathJax-script',
						src: '/mathjax/tex-chtml.js',
						async: true,
					}
				]
			}
		},
		computed: {
			Config() {
				// If a config is passed then use it as is
				if(this.config) return this.config;
				// If no config is passed, use the default config
				let defaultConfig = {
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
					if(this[key]) defaultConfig[key] = this[key];
				});
				// Return the config
				return defaultConfig;
			}
		},
		// Used to force a re-render of MathJax
		watch: {
			update() {
				if(!this.update) return;
				let element = this.selector;
				if(!element || element == '' || typeof element === 'object') return;
				let typeOf = typeof element;
				// If is an array typeof will be object and we need
				// to chage it to 'array'
				if(Array.isArray(element)) typeOf = 'array';
				// Switch the type of the element
				let type = {
						'string': [element],
						'array': element,
					}
				// If we have MathJax then we can re-render
				if(window.MathJax) {
					// Everything is ok, so re-render our selector/s
					window.MathJax.typeset(type[typeOf]);
				}
			}
		},
		methods: {
			render() {
				if(window.MathJax) {
					window.MathJax = this.Config;
				}
			}
		},
		mounted() {
			this.render();
		}
	}
</script>