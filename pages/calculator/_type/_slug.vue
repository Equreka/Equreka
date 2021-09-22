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
				<div class="card-body d-flex flex-column align-items-center justify-content-center">
					<!--
						<EqurekaSymbol :data="output.variable ? output.variable : ''"/>
						<EqurekaValue :data="output.value ? output.value : 0" format="tex" />
						<EqurekaSymbol :data="output.units ? output.units : ''" />-->
					<!-- Calculator: Result -->
					<transition name="fade">
						<div id="calculator-result" class="calculator-result" v-if="output.value != null && !output.error">
							<EqurekaSymbol :data="output.variable" format="html"/>
							<span class="math math-symbol-equality">=</span>
							<EqurekaValue :data="output.value"  format="html" />
							<EqurekaSymbol :data="output.units" format="html"/>
						</div>
					</transition>
					<!-- Calculator: Message -->
					<transition name="fade">
						<div id="calculator-message" class="calculator-message" v-if="output.value == null && output.error">
							<div class="card-body d-flex flex-column align-items-center justify-content-center text-center">
								<template v-if="output.error && output.error.message">
									<p class="math-error-type m-0">{{ $t(`calculator.errors.type.${output.error.type}`) }}</p>
									<p class="math math-error-message mt-2 mb-0 d-none">{{ output.error.message }}</p>
								</template>
								<p class="math math-error-type m-0" v-else-if="output.error && output.error.type">
									{{ $t(`calculator.errors.type.${output.error.type}`) }}
								</p>
								<p class="math math-error-type m-0" v-else>
									{{ $t('calculator.errors.type.input.needed') }}
								</p>
							</div>
						</div>
					</transition>
				</div>
			</section>
			<!-- Inputs -->
			<section class="card card-inputs mx-auto" style="max-width: 800px">
				<div class="card-body">
					<form ref="calculatorForm" class="mx-auto" @submit.prevent>
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
							<!-- Actions -->
							<div class="col-12 text-center">
								<div class="row gx-2">
									<div class="col d-flex align-items-center justify-content-end">
										<button type="reset" class="btn btn-danger rounded-pill p-3" @click="reset">
											<i class="bi bi-arrow-clockwise"></i>
										</button>
									</div>
									<div class="col-auto d-flex align-items-center justify-content-center">
										<button tpe="submit" class="btn btn-success rounded-pill py-3 px-5 h-100" @click="getOutput">
											{{ $t('calculator.calculate') }}
										</button>
									</div>
									<div class="col d-flex align-items-center justify-content-start">
										<transition name="fade">
											<ActionsCopy class="btn btn-dark rounded-pill p-3" target="#calculator-result" v-if="output.value != null && !output.error"/>
										</transition>
									</div>
								</div>
								
							</div>
						</div>
					</form>
				</div>
			</section>
			<!-- Data -->
			<div class="row justify-content-center">
				<!-- Table - Variables -->
				<div class="col-12 col-lg-6" v-if="data.variables && data.variables.length > 0">
					<section class="card card-variables">
						<div class="card-body">
							<h3 class="card-title">{{ $t('abbreviations.variables.cap') }}</h3>
							<TableVariables :data="data.variables"/>
						</div>
					</section>
				</div>
				<!-- Table - Magnitudes -->
				<div class="col-12 col-lg-6" v-if="data.magnitudes && data.magnitudes.length > 0">
					<section class="card card-magnitudes">
						<div class="card-body">
							<h3 class="card-title">{{ $t('abbreviations.magnitudes.cap') }}</h3>
							<TableVariables :data="data.magnitudes"/>
						</div>
					</section>
				</div>
			</div>
		</div>
		<MathJax :key="render" />
	</main>
</template>


<script>
	import Calculator from "~/utils/calculator";
	import Utils from "~/utils";
	import UtilsData from "~/utils/data";
	const defaultOutput = {
				value: null,
				variable: null,
				units: null,
				error: {
					type: null,
					message: null
				}
			};
	export default {
		data () {
			return {
				render: 0,
				constants: {},
				input: {},
				output: defaultOutput
			}
		},
		async asyncData ({ $content, params, error }) {
			const category = params.category,
					type = params.type,
					slug = params.slug,
					data = await UtilsData($content, params, error, true);
			let constants = false;
			if (data.constants && data.constants.length > 0) {
				constants = {};
				data.constants.forEach(constant => {
					constants[constant.symbol] = constant.values[0].value;
				});
			}
			return {
				category,
				type,
				slug,
				data,
				constants
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
			parserTeX(data) {
				return Utils.parserTeX(data);
			},
			reset() {
				this.input = {};
				this.output = defaultOutput;
				this.$refs.calculatorForm.reset();
			},
			async getOutput(event) {
				event.preventDefault();
				const input = this.input;
				let functions = false;
				try {
					functions = await import(`~/calculator/${this.type}/${this.slug}.js`);
				} catch (error) {
					this.output = {
						error: {
							type: 'catch.error',
							message: error.message
						}
					}
					return;
				}
				if(functions && input) {
					if(this.constants) { 
						this.output = functions.default(input, this.constants);
					} else {
						this.output = functions.default(input);
					}
					setTimeout(() => {
						this.render += 1;
					}, 350);
					this.input = [];
				}
			}
		}
	}
</script>