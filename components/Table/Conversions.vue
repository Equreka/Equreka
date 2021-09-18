<template>
	<div class="table-responsive" v-if="show">
		<table class="table table-data table-conversions">
			<thead>
				<tr>
					<th scope="col" class="value">
						<Abbr string="value"/>
					</th>
					<th scope="col" class="symbol">
						<Abbr string="symbol"/>
					</th>
					<th scope="col" class="name">
						{{ $t('Name') }}
					</th>
				</tr>
			</thead>
			<tbody>
				<template v-for="item in data">
					<tr :key="item.slug" :class="item.symbol" v-if="item">
						<td class="math math-value value">
							{{ item.value }}
						</td>
						<td class="math math-symbol-unit unit">
							{{ item.unit.symbol }}
						</td>
						<td class="unit name">
							<NuxtLink :to="localePath(`/${item.unit.category}/units/${item.unit.slug}`)">
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