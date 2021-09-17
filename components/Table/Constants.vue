<template>
		<div class="table-responsive" v-if="show">
			<table class="table table-data table-constants">
				<thead>
					<tr>
						<th scope="col" class="symbol">
							<Abbr string="symbol"/>
						</th>
						<th scope="col" class="name">
							{{ $t('Name') }}
						</th>
						<th scope="col" class="value">
							{{ $t('Value') }}
						</th>
						<th scope="col" class="unit" colspan="2">
							{{ $t('Unit') }}
						</th>
					</tr>
				</thead>
				<tbody>
					<template v-for="item in data">
						<tr :key="item.slug" :class="`eqk constant ${item.symbol}`" v-if="item && item.symbol">
							<!-- Constant Symbol -->
							<td class="math math-symbol-constant">
								{{ item.symbol }}
							</td>
							<!-- Constant Name -->
							<td class="name">
								<NuxtLink :to="localePath(`/${item.category}/constants/${item.slug}`)">
									{{ item.name }}
								</NuxtLink>
							</td>
							<!-- Constant Value-->
							<td class="unit math math-value-constant">
								{{ formatNumber(item.values[0].value) }}
							</td>
							<!-- Constant Unit Symbol-->
							<td class="unit math math-symbol-unit" v-if="item.units[0].symbol">
								{{ item.units[0].symbol }}
							</td>
							<!-- Constant Unit Name-->
							<td class="unit name">
								<NuxtLink :to="localePath(`/${item.units[0].category}/units/${item.units[0].slug}`)">
									{{ item.units[0].name }}
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
			formatNumber(number) {
				return Utils.formatNumber(number);
			}
		},
	}
</script>