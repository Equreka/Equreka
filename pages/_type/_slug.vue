<template>
	<main role="main" class="data">
		<PageHeader :title="data.name" :data="data" />
		<MathAll />
		<div class="container" :class="type">
			<!-- Terms -->
			<div class="row">
				<!-- Expression -->
				<div class="col-12" v-if="data.expression || data.symbol">
					<section class="card card-expression card-mathjax">
						<div class="card-body flex-wrap">
							<!-- Equations || Formulas -->
							<template v-if="(type === 'equations' || type == 'formulas') && type != 'units'">
								<MathExpression :expression="expression"/>
							</template>
							<!-- Constants -->
							<template v-else-if="type === 'constants'">
								<MathSymbol :data="data.symbol" />
								<MathOperator />
								<MathValue :data="data.values[0].value" :precision="22" :full="true" />
								<MathSymbol :data="data.values[0].units.symbol" :sup="data.values[0].sup" v-if="data.values[0].units.symbol.tex != ''"/>
							</template>
							<!-- Everything else -->
							<template v-else>
								<MathExpression :text="data.name" :symbol="data.symbol" :unit="baseUnit" />
								<MathValue class="d-block ms-3" :data="data.value" :max-digits="3" v-if="data.value"/>
							</template>
						</div>
					</section>
				</div>
				<!-- Table - Magnitudes -->
				<div class="col-12 col-lg" v-if="data.magnitudes && data.magnitudes.length > 0">
					<CardCollapse slug="magnitudes" class="card-magnitudes">
						<TableVariables :data="data.magnitudes" type="magnitude"/>
					</CardCollapse>
				</div>
				<!-- Table - Constants -->
				<div class="col-12 col-lg" v-if="data.constants && data.constants.length > 0">
					<CardCollapse slug="constants" class="card-constants">
						<TableConstants :data="data.constants"/>
					</CardCollapse>
				</div>
				<!-- Table - Variables -->
				<div class="col-12 col-lg" v-if="data.variables && data.variables.length > 0">
					<CardCollapse slug="variables" class="card-variables">
						<TableVariables :data="data.variables"/>
					</CardCollapse>
				</div>
				<!-- Table - Values - Approximate -->
				<div class="col-12 col-lg" :class="data.values && showTableValuesExact && showTableValuesAprox ? 'col-6' : 'col-12'" v-if="data.values && showTableValuesExact">
					<CardCollapse slug="values.approximate" class="card-values card-values-aprox">
						<TableValues :data="data.values" />
					</CardCollapse>
				</div>
				<!-- Table - Values - Exact -->
				<div class="col-12 col-lg" :class="data.values && showTableValuesExact && showTableValuesAprox ? 'col-6' : 'col-12'" v-if="data.values && showTableValuesAprox">
					<CardCollapse slug="values.exact" class="card-values card-values-exact">
						<TableValues class="col" :data="data.values" exact/>
					</CardCollapse>
				</div>
				<!-- Information -->
				<div class="col-12 col-lg-12">
					<CardCollapse slug="information" class="card-information" v-if="data.description">
						<!-- Base Unit -->
						<div class="hstack gap-2 my-3" v-if="baseUnit">
							<h6 class="m-0 me-1">
								{{ $t('section.information.base-unit') }}
							</h6>
							<NuxtLink class="badge badge-type" :class="baseUnit.dir.slice(1)" :key="baseUnit.slug" :to="localePath(baseUnit.path)" v-if="baseUnit.dir">
								<span>{{ baseUnit.name }}</span>
							</NuxtLink>
						</div>
						<!-- Units of -->
						<div class="hstack gap-2 my-3" v-if="unitOf">
							<h6 class="m-0 me-1">
								{{ $t('section.information.unit-of') }}
							</h6>
							<template v-for="item in unitOf">
								<NuxtLink class="badge badge-type" :class="item.dir.slice(1)" :key="item.slug" :to="localePath(item.path)" v-if="item.dir">
									<span>{{ item.name }}</span>
								</NuxtLink>
							</template>
						</div>
						<nuxt-content :document="data.descriptionMarkdown" />
					</CardCollapse>
				</div>
				<!-- Table - Units -->
				<div class="col-12 col-lg" v-if="data.units && data.units.length > 0 && (type === 'variables' || type === 'magnitudes' || type === 'units')">
					<CardCollapse slug="units" class="card-units">
						<TableUnits :data="data.units" :base="data.baseUnit"/>
					</CardCollapse>
				</div>
				<!-- Table - Conversions -->
				<div class="col-12 col-lg" v-if="data.conversions && data.conversions.length > 0">
					<CardCollapse slug="conversions" class="card-conversions">
						<TableConversions :data="data.conversions" :unit="data.symbol.tex"/>
					</CardCollapse>
				</div>
				<!-- Relations -->
				<div class="col-12 col-lg-12" v-if="data.relations">
					<section class="card card-description">
						<div class="card-body">
							<h3 class="card-title">
								{{ $t('section.relations.title') }}
							</h3>
						</div>
					</section>
				</div>
				<!-- Code -->
				<div class="col-12 col-lg-12" v-if="data.expression || data.symbol">
					<section class="card card-code">
						<div class="card-body">
							<h3 class="card-title">
								{{ $t('section.code.title') }}
							</h3>
							<div class="input-group">
								<input class="form-control" :id="`copy-${slug}`" :value="code" />
								<ActionsCopy class="btn btn-dark rounded-end" :target="`#copy-${slug}`" expanded/>
							</div>
						</div>
					</section>
				</div>
				<!-- References -->
				<div class="col-12 col-lg-12" v-if="data.references && data.references.length > 0">
					<section class="card card-references">
						<div class="card-body">
							<h3 class="card-title">
								{{ $t('section.references.title') }}
							</h3>
							<ul class="mb-0">
								<li v-for="item in data.references" :key="item.title">
									<a :href="item.url" target="_blank" rel="noopneer nofollow noreferrer">{{ item.title }} - {{ item.site }}</a>
								</li>
							</ul>
						</div>
					</section>
				</div>
				<!-- Actions -->
				<div class="col-12 col-lg-12" v-if="false">
					<section class="card-actions mb-3">
						<div class="hstack gap-2 flex-wrap">
							<ActionsFavorite class="btn btn-pink" :slug="data.slug" :type="type" expanded/>
							<ActionsDownload class="btn btn-success" :data="data" :type="type" expanded/>
							<ActionsReport class="btn btn-danger ms-auto" expanded/>
						</div>
					</section>
				</div>
			</div>
		</div>
	</main>
</template>


<script>
	import Utils from "~/utils";
	import getData from "~/utils/data";
	export default {
		async asyncData ({ $content, params, error, i18n }) {
			if(!params.slug) return;
			const { category, type, slug } = params;
			const data = await getData($content, params, error);
			return { category, type, slug, data }
		},
		head() {
			return {
				bodyAttrs: {
					class: `category-${this.category} type-${this.type} slug-${this.slug} ${this.type}`
				}
			}
		},
		mounted() {
			window.addEventListener('math-jax-all-loaded', () => {
				Utils.initTermHover()
			}, false);
		},
		computed: {
			code() {
				let code = false;
				if(this.data.expression) {
					if(typeof this.data.expression === "string") {
						code = this.data.expression;
					} else {
						code = this.data.expression;
					}
				}
				if(this.data.symbol) {
					if(typeof this.data.symbol === "string") {
						code = this.data.symbol;
					} else {
						code = this.data.symbol.tex || this.data.symbol.html || this.data.symbol.text;
					}
				}
				return code;
			},
			expression() {
				let expression = this.data.expressionIntern ? Utils.parserTeX(this.data.expressionIntern) : this.data.expression;
				return expression;
			},
			baseUnit() {
				let baseUnit = false;
				if(this.data.baseUnit) {
					this.data.units.forEach(unit => {
						if(unit.slug === this.data.baseUnit) {
							baseUnit = unit;
						}
					});
				}
				return baseUnit;
			},
			unitOf() {
				let unitOf = false;
				if(this.data.unitOf && this.data.unitOf.length > 0) {
					unitOf = this.data.unitOf;
				}
				return unitOf;
			},
			showTableValuesAprox() {
				let show = false;
				this.data.values.forEach((item) => {
					if (item.exact === true) {
						show = true;
					}
				});
				return show;
			},
			showTableValuesExact() {
				let show = false;
				this.data.values.forEach((item) => {
					if (!item.exact === true) {
						show = true;
					}
				});
				return show;
			}
		},
	}
</script>