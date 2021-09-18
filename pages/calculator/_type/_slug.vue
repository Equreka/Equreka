<template>
	<main role="main" class="calculator data">
		<PageHeader :title="data.name" :data="data" />
		<div class="container position-relative">
			<section class="card card-expression card-calculator">
				<div class="background">
					<div class="latex">
						$${{ data.expression }}$$
					</div>
				</div>
				<div class="card-body">
					<template v-if="output.value != null && !output.error">
						<span v-html="formatOutput(output)" />
					</template>
					<div class="message text-center" v-else>
						<template v-if="output.error && output.error.message">
							<h5 class="math-error-type fs-4 m-2">{{ $t(`calculator.errors.type.${output.error.type}`) }}</h5>
							<p class="math math-error-message m-0">{{ output.error.message }}</p>
						</template>
						<p class="math math-error-type fs-3 m-0" v-else-if="output.error && output.error.type">
							{{ $t(`calculator.errors.type.${output.error.type}`) }}
						</p>
						<p class="math math-error-type fs-3 m-0" v-else>
							{{ $t('calculator.errors.type.input.needed') }}
						</p>
					</div>
				</div>
			</section>
			<!-- Inputs -->
			<section class="card card-inputs mx-auto" style="max-width: 800px">
				<div class="card-body">
					<form class="mx-auto" @submit.prevent>
						<div class="row gx-2 flex-wrap justify-content-md-center">
							<template v-if="data.variables && data.variables.length > 0">
								<div class="mb-3 col col-md-auto" v-for="variable in data.variables" :key="variable.slug">
									<div class="form-floating">
										<input 
											class="form-control form-control-sm" type="number" 
											:id="`input-${variable.slug}`" :placeholder="variable.name"
											v-model="input[variable.symbol]"
										>
										<label :for="`input-${variable.slug}`">
											{{ variable.name }} ({{ variable.units[0].symbol }})
										</label>
									</div>
								</div>
							</template>
							<template v-if="data.magnitudes && data.magnitudes.length > 0">
								<div class="mb-3 col col-md-auto" v-for="magnitude in data.magnitudes" :key="magnitude.slug">
									<div class="form-floating">
										<input 
											class="form-control form-control-sm" type="number" 
											:id="`input-${magnitude.slug}`" :placeholder="magnitude.name"
											v-model="input[magnitude.symbol]"
										>
										<label :for="`input-${magnitude.slug}`">
											{{ magnitude.name }} ({{ magnitude.units[0].symbol }})
										</label>
									</div>
								</div>
							</template>
							<div class="col-12 text-center">
								<button tpe="submit" class="btn btn-success rounded-pill py-3 px-5 h-100" @click="getOutput">
									{{ $t('calculator.calculate') }}
								</button>
							</div>
						</div>
					</form>
				</div>
			</section>
			<!-- Terms -->
			<section class="terms">
				<div class="row row-cols-1 row-cols-md-auto">
					<TableVariables class="col mb-3 mb-lg-0" :data="data.variables" :category="data.category"/>
					<TableConstants class="col" :data="data.constants" :category="data.category"/>
				</div>
			</section>
		</div>
		<script id="MathJax-script" async src="/assets/js/mathjax/tex-mml-chtml.js"></script>
	</main>
</template>


<script>
	import Calculator from "~/utils/calculator";
	import Utils from "~/utils";
	import UtilsData from "~/utils/data";
	export default {
		data () {
			return {
				input: [],
				output: {
					value: null,
					variable: null,
					unit: null,
					error: {
						type: null,
						message: null
					}
				}
			}
		},
		async asyncData ({ $content, params, error }) {
			const category = params.category,
					type = params.type,
					slug = params.slug,
					data = await UtilsData($content, params, error, true);
			return {
				category,
				type,
				slug,
				data
			}
		},
		mounted() {
			window.MathJax = {
				options: {
					enableMenu: false
				},
				loader: {
					load: ['[tex]/html']
				},
				tex: { 
					inlineMath: [['$', '$']],
				},
			}
		},
		head() {
			return {
				bodyAttrs: {
					class: `page-data page-${this.type} ${this.category}`
				}
			}
		},
		methods: {
			copyClipboard(clipboard) {
				Utils.copyClipboard(clipboard);
			},
			parserLaTeX(data) {
				return Utils.parserLaTeX(data);
			},
			formatNumber(number) {
				return Utils.formatNumber(number);
			},
			formatOutput(output) {
				return Calculator.formatOutput(output);
			},
			async getOutput(event) {
				event.preventDefault();
				const input = this.input;
				let functions;
				try {
					functions = await import(`~/calculator/${this.type}/${this.slug}.js`);
				} catch (error) {
					functions = {
						error: {
							type: 'catch.error',
							message: error.message
						}
					}
				}
				console.log(input);
				if(functions) {
					this.output = functions.default(input);
					this.input = [];
				}
			}
		}
	}
</script>