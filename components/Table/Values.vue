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
						<!-- Constant: Value -->
						<td>
							<EqurekaValue :data="item.value" :precision="item.exact ? 12 : 9" />
						</td>
						<!-- Constant: Unit: Symbol -->
						<td>
							<EqurekaSymbol :data="item.units.symbol" />
						</td>
						<!-- Constant: Unit: Name -->
						<td>
							<NuxtLink :to="localePath(item.units.path)">
								{{ item.units.name }}
							</NuxtLink>
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
				if(this.exact === null) {
					show = false;
					this.data.forEach((item) => {
						if (!item.exact === true) {
							show = true;
						}
					});
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
		},
	}
</script>