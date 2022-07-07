<template>
	<div class="table-responsive" v-if="show">
		<table class="table table-data table-conversions">
			<thead>
				<tr>
					<th scope="col" class="name">
						{{ $t('table.name') }}
					</th>
					<th scope="col" class="conversion text-end">
						<Abbr string="conversion"/> <small>(1 {{ unit }})</small>
					</th>
					<th scope="col" class="symbol">
						<Abbr string="symbol"/>
					</th>
					<th scope="col" class="formula">
						<Abbr string="formula" expanded/>
					</th>
				</tr>
			</thead>
			<tbody>
				<template v-for="item in data">
					<tr :key="item.slug" :class="item.symbol" v-if="item && item.units.symbol">
						<!-- Conversion: Unit: Name -->
						<td>
							<NuxtLink :to="localePath(item.units.path)">
								{{ item.units.name }}
							</NuxtLink>
						</td>
						<!-- Conversion: Value -->
						<td class="text-end">
							<MathOperator data="approximately" format="html" v-if="item.exact == false"/> <MathValue :data="item.value" format="html"/>
						</td>
						<!-- Conversion: Unit: Symbol -->
						<td>
							<MathSymbol :data="item.units.symbol" />
						</td>
						<!-- Conversion: Formula -->
						<td>
							${{ formula(item.formula, item.value, item.units.symbol.tex) }}$
						</td>
					</tr>
				</template>
			</tbody>
		</table>
	</div>
</template>

<script>
	export default {
		props: {
			data: {
				type: Array | Object | Boolean,
				required: true
			},
			unit: {
				type: String,
				required: true
			}
		},
		computed: {
			show() {
				let show = this.data && this.data.length > 0 ? true : false;
				if(show) {
					// Check if all item in array are false
					const isFalse = (item) => item == false;
					// If so then show = true, so we have to return the opposite value
					show = !this.data.every(isFalse);
				}
				return show;
			},
			category() {
				if(this.data && this.data.category) {
					return this.data.category;
				} else {
					return this.$route.params.category ? this.$route.params.category : false;
				}
			},
			type() {
				return this.$route.params.type ? this.$route.params.type : false;
			},
		},
		methods: {
			formula(formula = false, ratio = false) {
				let formulaParsed = '-';
				if(formula) {
					formulaParsed = formula.replace(/(\d+)\/(\d+)/gm, '\\frac{$1}{$2}').replace('value', `[${this.unit}]`).replace('*', '\\times');
				}
				if(!formula && ratio && ratio != 1) {
					formulaParsed = `[${this.unit}] * ${String(ratio)}`;
				}
				return formulaParsed;
			},
		}
	}
</script>