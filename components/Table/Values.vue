<template>
	<div class="table-responsive" v-if="showTable">
		<table class="table table-data table-constants table-values">
			<thead>
				<tr>
					<th scope="col" class="name">
						<Abbr string="value"/>
					</th>
					<th scope="col" class="symbol">
						<Abbr string="symbol"/>
					</th>
					<th scope="col" class="unit">
						<Abbr string="unit"/>
					</th>
				</tr>
			</thead>
			<tbody>
				<template v-for="item in data">
					<tr :key="item.value" v-if="showItem(item.exact)">
						<td class="math math-value unit value">
							{{ formatNumber(item.value) }}
						</td>
						<td class="math math math-symbol-unit symbol">
							{{ item.unit.symbol }}
						</td>
						<td class="unit name">
							<NuxtLink :to="localePath(`${item.unit.dir}/${item.unit.slug}`)">
								{{ item.unit.name }}
							</NuxtLink>
						</td>
					</tr>
				</template>
			</tbody>
		</table>
	</div>
</template>

<script>
	import Utils from '~/utils';
	export default {
		props: {
			data: {
				type: Array | Object | Boolean,
				required: true
			},
			exact: {
				type: Boolean,
				default: null
			}
		},
		computed: {
			showTable() {
				let show = this.data && this.data.length > 0 ? true : false;
				if(show) {
					// Check if all item in array are false
					const isFalse = (item) => item == false;
					// If so then show = true, so we have to return the opposite value
					show = !this.data.every(isFalse);
				}
				return show;
			}
		},
		methods: {
			showItem(isExact) {
				if(this.exact === true) {
					return (this.exact && isExact) ? true : false;
				}
				return !isExact ? true : false;
			},
			formatNumber(number) {
				return Utils.formatNumber(number);
			}
		},
	}
</script>