<template>
		<div class="table-responsive" v-if="show">
			<table class="table table-data table-constants">
				<thead>
					<tr>
						<th scope="col" class="symbol">
							<Abbr string="symbol"/>
						</th>
						<th scope="col" class="name">
							{{ $t('table.name') }}
						</th>
						<th scope="col" class="value">
							{{ $t('table.value') }}
						</th>
						<th scope="col" class="unit" colspan="2">
							{{ $t('table.unit') }}
						</th>
					</tr>
				</thead>
				<tbody>
					<template v-for="item in data">
						<tr :key="item.slug" :class="`eqk constant ${item.symbol}`" v-if="item && item.symbol">
							<!-- Constant Symbol -->
							<td>
								<EqurekaSymbol :data="item.symbol" />
							</td>
							<!-- Constant: Name -->
							<td>
								<NuxtLink :to="localePath(item.path)">
									{{ item.name }}
								</NuxtLink>
							</td>
							<!-- Constant: Value-->
							<td>
								<EqurekaValue :data="item.values[0].value" />
							</td>
							<!-- Constant: Unit: Symbol-->
							<td v-if="item.units[0].symbol">
								<EqurekaSymbol :data="item.units[0].symbol" />
							</td>
							<!-- Constant: Unit: Name-->
							<td>
								<NuxtLink :to="localePath(item.units[0].path)">
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
		}
	}
</script>