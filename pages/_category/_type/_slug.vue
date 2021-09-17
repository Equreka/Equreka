<template>
	<main role="main" class="data">
		<PageHeader :title="data.name" :data="data" />
		<div class="container">
			<!-- Expression -->
			<section class="card card-expression card-mathjax" :class="(type === 'equations' || type == 'formulas') ? false : 'card-symbol'" v-if="data.expression || data.symbol">
				<Loader />
				<div class="card-body" v-if="(type === 'equations' || type == 'formulas') && type != 'units'">
					<template v-if="!data.expressionIntern">$${{ data.expression }}$$</template>
					<template v-else>$${{ parserLaTeX(data.expressionIntern) }}$$</template>
				</div>
				<div class="card-body" v-else>
					$$
					<template v-if="data.symbol">
						{{ data.symbol }}
					</template>
					<template v-else-if="data.symbolLatex">
						{{ parserLaTeX(data.symbolLaTeX) }}
					</template>
					<template v-if="data.values && data.values.length > 0">
						= {{ formatNumber(data.values[0].value) + data.values[0].unit.symbol }}
					</template>
					$$
				</div>
			</section>
			<!-- Terms -->
			<div class="row">
				<div class="col-12" v-if="data.units && data.units.length > 0 && (type === 'variables')">
					<section class="card card-units">
						<div class="card-body">
							<h3 class="card-title">{{ $t('abbreviations.units.cap') }}</h3>
							<TableUnits :data="data.units"/>
						</div>
					</section>
				</div>
				<div class="col-12 col-lg-6" v-if="data.variables && data.variables.length > 0">
					<section class="card card-variables">
						<div class="card-body">
							<h3 class="card-title">{{ $t('abbreviations.variables.cap') }}</h3>
							<TableVariables :data="data.variables"/>
						</div>
					</section>
				</div>
				<div class="col-12 col-lg-6" v-if="data.constants && data.constants.length > 0">
					<section class="card card-constants">
						<div class="card-body">
							<h3 class="card-title">{{ $t('abbreviations.constants.cap') }}</h3>
							<TableConstants :data="data.constants"/>
						</div>
					</section>
				</div>
				<!-- Values -->
				<div class="col-12 col-lg-6" v-if="data.values && data.values.length > 0">
					<section class="card card-constants">
						<div class="card-body">
							<h3 class="card-title">{{ $t('Approximate values') }}</h3>
							<TableValuesExact :data="data.values" />
						</div>
					</section>
				</div>
				<div class="col-12 col-lg-6" v-if="data.values && data.values.length > 0">
					<section class="card card-constants">
						<div class="card-body">
							<h3 class="card-title">{{ $t('Exact values') }}</h3>
							<TableValuesAprox class="col" :data="data.values" />
						</div>
					</section>
				</div>
			</div>
			<!-- Description -->
			<section class="card description" v-if="data.description">
				<div class="card-body">
					<h3 class="card-title">{{ $t('Description') }}</h3>
					<p v-html="parserLaTeX(data.description)" />
				</div>
			</section>
			<!-- Code -->
			<section class="card codes" v-if="data.expression">
				<div class="card-body">
					<h3 class="card-title">{{ $t('Code') }}</h3>
					<div class="input-group">
						<input class="form-control" :id="slug" :value="data.expression" />
						<button type="button" class="btn btn-dark" :aria-label="$t('Copy to clipboard')" @click="copyClipboard(`#${slug}`)">
							<i class="bi bi-clipboard"></i>
							<span class="visually-hidden">{{ $t('Copy to clipboard') }}</span>
						</button>
					</div>
				</div>
			</section>
		</div>
		<!-- Scripts -->
		<!--<script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>-->
		<script id="MathJax-script" async src="/assets/js/mathjax/tex-mml-chtml.js"></script>
	</main>
</template>


<script>
	import Utils from "~/utils";
	import UtilsData from "~/utils/data";
	export default {
		data () {
			return {
				selector: Utils.TERM_SELECTOR.substring(1),
			}
		},
		async asyncData ({ $content, params, error }) {
			const category = params.category,
					type = params.type,
					slug = params.slug,
					data = await UtilsData($content, params, error);
			return {
				category,
				type,
				slug,
				data
			}
		},
		mounted() {
			Utils.initTermHover();
			window.MathJax = {
				locale: 'es',
				loader: {
					load: ['[tex]/html']
				},
				tex: { 
					inlineMath: [['$', '$']],
					packages: { '[+]': ['html'] },
					processEscapes: true,
				},
				svg: {
					fontCache: 'global'
				},
				startup: {
					ready: () => {
						MathJax.startup.defaultReady();
						MathJax.startup.promise.then(() => {
							const div = document.body.querySelector('.card-mathjax');
									div.classList.add('rendered');
							setTimeout(() => {
								div.querySelector('.loader').remove();
							}, 500);
						});
					}
				}
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
			}
		}
	}
</script>