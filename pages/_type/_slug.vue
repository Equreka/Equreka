<template>
	<main role="main" class="data">
		<PageHeader :title="data.name" :data="data" />
		<div class="container">
			<!-- Terms -->
			<div class="row">
				<!-- Expression -->
				<div class="col-12" v-if="data.expression || data.symbol">
					<section class="card card-expression card-mathjax" :class="(type === 'equations' || type == 'formulas') ? '' : 'card-symbol'">
						<Loader />
						<div class="card-body">
							$$
							<!-- Equations || Formulas -->
							<template v-if="(type === 'equations' || type == 'formulas') && type != 'units'">
								<template v-if="data.expression">
									{{ data.expression }}
								</template>
							</template>
							<!-- Units || Variables -->
							<template v-else-if="type === 'magnitudes' || type === 'units' || type === 'variables'">
								\text{ {{data.name }} } ({{ data.symbol }})
							</template>
							$$
							<!-- Constants -->
							<template v-if="type === 'constants'">
								<EqurekaSymbol :data="data.symbol" />
								<span class="math math-symbol-equality">=</span>
								<EqurekaValue :data="data.values[0].value" format="TeX" />
								<EqurekaSymbol :data="data.values[0].unit.symbol" :sup="data.values[0].sup" />
							</template>
						</div>
					</section>
				</div>
				<!-- Table - Units -->
				<div class="col-12 col-lg-6" v-if="data.units && data.units.length > 0 && (type === 'variables' || type === 'magnitudes')">
					<section class="card card-units">
						<div class="card-body">
							<h3 class="card-title">{{ $t('section.units.title') }}</h3>
							<TableUnits :data="data.units"/>
						</div>
					</section>
				</div>
				<!-- Table - Variables -->
				<div class="col-12 col-lg-6" v-if="data.variables && data.variables.length > 0">
					<section class="card card-variables">
						<div class="card-body">
							<h3 class="card-title">{{ $t('section.variables.title') }}</h3>
							<TableVariables :data="data.variables"/>
						</div>
					</section>
				</div>
				<!-- Table - Magnitudes -->
				<div class="col-12 col-lg-6" v-if="data.magnitudes && data.magnitudes.length > 0">
					<section class="card card-magnitudes">
						<div class="card-body">
							<h3 class="card-title">{{ $t('section.magnitudes.title') }}</h3>
							<TableVariables :data="data.magnitudes"/>
						</div>
					</section>
				</div>
				<!-- Table - Constants -->
				<div class="col-12 col-lg-6" v-if="data.constants && data.constants.length > 0">
					<section class="card card-constants">
						<div class="card-body">
							<h3 class="card-title">{{ $t('section.constants.title') }}</h3>
							<TableConstants :data="data.constants"/>
						</div>
					</section>
				</div>
				<!-- Table - Values - Exact -->
				<div class="col-12 col-lg-6" v-if="data.values && showTableValuesExact">
					<section class="card card-values card-values-exact">
						<div class="card-body">
							<h3 class="card-title">{{ $t('section.values.approximate.title') }}</h3>
							<TableValues :data="data.values" />
						</div>
					</section>
				</div>
				<!-- Table - Values - Approximate -->
				<div class="col-12 col-lg-6" v-if="data.values && showTableValuesAprox">
					<section class="card card-values card-values-aprox">
						<div class="card-body">
							<h3 class="card-title">{{ $t('section.values.exact.title') }}</h3>
							<TableValues class="col" :data="data.values" exact/>
						</div>
					</section>
				</div>
				<!-- Table - Conversions -->
				<div class="col-12 col-lg-6" v-if="data.conversions && data.conversions.length > 0">
					<section class="card card-conversions">
						<div class="card-body">
							<h3 class="card-title">{{ $t('abbreviations.conversions.cap') }} <small class="ms-2">($1$ ${{ data.symbol }}$)</small></h3>
							<TableConversions :data="data.conversions"/>
						</div>
					</section>
				</div>
				<!-- Información -->
				<div class="col-12 col-lg-12">
					<section class="card card-information" v-if="data.description">
						<div class="card-body">
							<h3 class="card-title">{{ $t('section.information.title') }}</h3>
							<p v-if="data.unitOf"><span class="fw-bolder">Unit of:</span> {{ data.unitOf.name }}</p>
							<h4 class="card-title">{{ $t('section.information.description') }}</h4>
							<p v-html="parserLaTeX(data.description)"/>
						</div>
					</section>
				</div>
				<!-- Relations -->
				<div class="col-12 col-lg-12" v-if="data.relations">
					<section class="card card-description">
						<div class="card-body">
							<h3 class="card-title">{{ $t('section.relations.title') }}</h3>
						</div>
					</section>
				</div>
				<!-- Code -->
				<div class="col-12 col-lg-12" v-if="data.expression || data.symbol">
					<section class="card card-code">
						<div class="card-body">
							<h3 class="card-title">{{ $t('section.code.title') }}</h3>
							<div class="input-group">
								<input class="form-control" :id="`copy-${slug}`" :value="data.expression || data.symbol" />
								<ActionsCopy class="btn btn-dark rounded-end" :target="`#copy-${slug}`" expanded/>
							</div>
						</div>
					</section>
				</div>
				<!-- References -->
				<div class="col-12 col-lg-12" v-if="data.references && data.references.length > 0">
					<section class="card card-references">
						<div class="card-body">
							<h3 class="card-title">{{ $t('section.references.title') }}</h3>
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
		<MathJax :startup="startup"/>
	</main>
</template>


<script>
	import Utils from "~/utils";
	import getData from "~/utils/data";
	export default {
		data () {
			return {
				selector: Utils.TERM_SELECTOR.substring(1),
				startup: {
					ready: () => {
						MathJax.startup.defaultReady();
						MathJax.startup.promise.then(() => {
							const div = document.body.querySelector('.card-mathjax');
									div.classList.add('rendered');
							setTimeout(() => {
								div.querySelector('.loader').remove();
								Utils.initTermHover();
							}, 500);
						});
					}
				}
			}
		},
		async asyncData ({ $content, params, error }) {
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
		computed: {
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
		methods: {
			parserLaTeX(data) {
				return Utils.parserLaTeX(data);
			}
		}
	}
</script>