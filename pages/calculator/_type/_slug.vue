<template>
	<main role="main" class="calculator data">
		<PageHeader :title="data.name" :data="data" />
		<MathAll />
		<div class="container position-relative">
			<section class="card card-expression card-calculator">
				<div class="background" v-if="data.expression">
					<div class="latex">
						$${{ data.expression }}$$
					</div>
				</div>
				<div class="card-body d-flex flex-column align-items-center justify-content-center">
					<!-- Calculator: Result -->
					<transition name="fade">
						<div id="calculator-result" class="calculator-result" v-if="output.value != null && !output.error">
							<template v-if="type != 'units'">
								<MathSymbol :data="data.magnitudes.find(i => i.slug === output.magnitudes).symbol" format="html" v-if="output.magnitudes"/>
								<MathSymbol :data="data.variables.find(i => i.slug === output.variables).symbol" format="html" v-if="output.variables"/>
								<MathOperator :data="output.operator" format="html" />
								<MathValue :data="output.value" format="html" />
								<MathSymbol :data="output.units.symbol" :sup="output.sup" format="html" v-if="output.units"/>
							</template>
							<template v-else>
								<MathValue :data="output.value" format="html" />
								<MathSymbol :data="output.units.symbol" :sup="output.sup" format="html" v-if="output.units"/>
							</template>
						</div>
					</transition>
					<!-- Calculator: Message -->
					<transition name="fade">
						<CalculatorMessage :data="output" v-if="output.error" />
					</transition>
				</div>
			</section>
			<!-- Inputs -->
			<section class="card card-inputs mx-auto col-lg-6">
				<div class="card-body">
					<form ref="calculatorForm" class="mx-auto" @submit.prevent="getOutput">
						<div class="row gx-2 flex-wrap justify-content-md-center">
							<!-- Magnitudes -->
							<template v-if="data.magnitudes && data.magnitudes.length > 0">
								<div class="mb-3 col-12 col-md-auto" v-for="item in data.magnitudes" :key="item.slug">
									<template v-if="item.symbol && item.baseUnit">
										<div class="form-floating">
											<input
												class="form-control"
												type="number"
												step="0.000000000000000001"
												:id="`input-${item.slug}`"
												v-model.number="input.values[item.symbol.text]"
											>
											<label :for="`input-${item.slug}`" v-html="`${item.name} (${item.baseUnit.symbol.html})`" v-if="item.baseUnit.symbol"/>
										</div>
									</template>
								</div>
							</template>
							<!-- Variables -->
							<template v-if="data.variables && data.variables.length > 0">
								<div class="mb-3 col-12 col-md-auto" v-for="item in data.variables" :key="item.slug">
									<template v-if="item.symbol && item.baseUnit">
										<div class="form-floating">
											<input
												class="form-control"
												type="number"
												step="0.000000000000000001"
												:id="`input-${item.slug}`"
												v-model.number="input.values[item.symbol.text]"
											>
											<label :for="`input-${item.slug}`" v-html="`${item.name} (${item.baseUnit.symbol.html})`" v-if="item.baseUnit.symbol"/>
										</div>
									</template>
								</div>
							</template>
							<!-- Units Conversion -->
							<template v-if="data.conversions && data.conversions.length > 0">
								<div class="mb-3 col-12 col-sm order-1 order-sm-0" v-if="data.symbol">
									<div class="form-floating">
										<input
											class="form-control"
											type="number"
											step="0.000000000000000001"
											:id="`input-${data.slug}`"
											v-model="input.value"
										>
										<label :for="`input-${data.slug}`" v-html="`${data.name} (${data.symbol.html})`"/>
									</div>
								</div>
								<div class="mb-3 col-auto d-none d-sm-flex align-items-center justify-content-center px-2">
									<i class="bi bi-chevron-right text-muted fs-4"></i>
								</div>
								<div class="mb-3 col-12 col-sm order-0 order-sm-2">
									<!-- Units -->
									<div class="form-floating">
										<select id="convert-to" class="form-select" v-model="input.conversionKey">
											<template v-for="item, index in data.conversions">
												<option :key="index" :value="index" v-if="item.units.slug != data.slug">
													{{ item.units.name }} (<MathSymbol :data="item.units.symbol" display="raw"/>)
												</option>
											</template>
										</select>
										<label for="convert-to">
											{{ $t('calculator.conversions.to') }}
										</label>
									</div>
								</div>
							</template>
						</div>
						<!-- Actions -->
						<div class="actions text-center">
							<div class="row gx-2 justify-content-center">
								<div class="col d-flex align-items-center justify-content-center justify-content-md-end" style="max-width: 55px">
									<button type="reset" class="btn btn-danger rounded-pill p-3" @click="reset">
										<i class="bi bi-arrow-clockwise"></i>
									</button>
								</div>
								<div class="col col-sm-auto d-flex align-items-center justify-content-center">
									<button tpe="submit" class="btn btn-success align-items-center justify-content-center rounded-pill px-sm-5 w-100 h-100">
										{{ $t('calculator.calculate') }}
									</button>
								</div>
								<div class="col d-flex align-items-center justify-content-center justify-content-md-end" style="max-width: 55px">
									<transition name="fade">
										<ActionsCopy class="btn btn-dark rounded-pill p-3" target="#calculator-result"/>
									</transition>
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
	</main>
</template>


<script>
	import getData from "~/utils/data";
	const defaultInput = {
		value: null,
		values: {},
		magnitudes: null,
		variables: null,
		units: null,
		sup: null,
		ratio: null,
		conversionKey: 0,
	}
	const defaultOutput = {
		value: null,
		values: {},
		magnitudes: null,
		variables: null,
		units: null,
		sup: null,
		operator: 'equal',
		error: {
			type: null,
			message: null
		}
	};
	export default {
		data () {
			return {
				loading: true,
				input: defaultInput,
				output: defaultOutput
			}
		},
		async asyncData ({ $content, params, error }) {
			const { category, type, slug } = params;
			const data = await getData($content, params, error);

			return {
				category, type, slug, data
			}
		},
		head() {
			return {
				bodyAttrs: {
					class: `page-data page-${this.type} ${this.category}`
				}
			}
		},
		computed: {
			constants () {
				let constants = false;
				if (this.data.constants && this.data.constants.length > 0) {
					constants = {};
					this.data.constants.forEach(constant => {
						constants[constant.symbol.text] = constant.values[0].value;
					});
				}
				return constants;
			}
		},
		methods: {
			resetObject(object) {
				Object.keys(object).forEach(key => {
					if (object[key] && typeof object[key] === 'object') {
						this.resetObject(object[key]);
					} else {
						object[key] = null;
					}
				});
			},
			reset() {
				this.$refs.calculatorForm.reset();
				this.resetObject(this.input);
			},
			resetInput() {
				this.$refs.calculatorForm.reset();
				this.input = defaultInput;
			},
			async getOutput(event) {
				event.preventDefault();
				let	input = this.input,
						output = defaultOutput,
						type = this.type,
						slug = this.slug,
						constants = this.constants,
						functions = false,
						file = type === 'units' ? 'conversions' : slug;
				// Get functions
				try {
					functions = await import(`~/calculator/${type}/${file}.js`);
				} catch (error) {
					this.output = {
						error: {
							type: 'catch.error',
							message: error.message
						}
					}
					return;
				}
				if(type === 'units') {
					let item = this.data.conversions[this.input.conversionKey];
					input.units = item.units.slug;
					input.ratio = item.value;
					input.formula = item.formula ? item.formula : false;
				}
				// Get output
				if(functions && input) {
					if(this.constants) {
						output = functions.default(input, constants);
					} else {
						output = functions.default(input);
					}
					if(output.units) {
						output.units = await this.$content('units', output.units).fetch();
					}
					this.output = output;
				}
			}
		}
	}
</script>