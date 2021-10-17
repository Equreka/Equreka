<template>
	<div class="table-responsive">
		<table class="table table-data table-prefixes">
			<thead>
				<tr>
					<th scope="col">
						{{ $t('table.name') }}
					</th>
					<th scope="col">
						<Abbr string="symbol"/>
					</th>
					<th scope="col">
						Exponent
					</th>
					<th scope="col">
						Factor
					</th>
				</tr>
			</thead>
			<tbody>
				<template v-for="item in data">
					<tr :key="item.name" v-if="showItem(item.value)">
						<td>
							{{ item.name }}
						</td>
						<td>
							<MathSymbol :data="item.symbol"/>
						</td>
						<td>
							<MathValue :data="item.value" :maxDigits="true"/>
						</td>
						<td>
							<MathValue :data="item.value" :allDigits="true"/>
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
			positive: {
				type: Boolean,
				default: null
			}
		},
		computed: {
			showTable() {
				let show = this.data && this.data.length > 0 ? true : false;
				if(show) {
					// Check if all item in array are false
					const isPositive = (item) => item > 0;
					// If so then show = true, so we have to return the opposite value
					show = this.data.every(isPositive);
				}
				if(this.positive === null) {
					show = false;
					this.data.forEach((item) => {
						if (!item.value < 0) {
							show = true;
						}
					});
				}
				return show;
			}
		},
		methods: {
			showItem(value) {
				if(this.positive === true) {
					return (value > 1) ? true : false;
				} else {
					return (value < 1) ? true : false;
				}
			},
		},
	}
</script>