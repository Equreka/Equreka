<template>
	<div class="table-responsive" v-if="show">
		<table class="table table-data table-variables">
			<thead>
				<tr>
					<th scope="col" class="symbol">
						<Abbr string="symbol"/>
					</th>
					<th scope="col" class="name">
						{{ $t('table.name') }}
					</th>
					<th scope="col" class="unit" colspan="2">
						{{ $t('table.unit') }}
					</th>
				</tr>
			</thead>
			<tbody>
				<template v-for="item in data">
					<tr :class="`equreka-term equreka-${type} equreka-${item.symbol.text}`" :key="item.slug" v-if="item && item.slug">
						<!-- Magnitude/Variable: Symbol -->
						<td>
							<MathSymbol :data="item.symbol" />
						</td>
						<!-- Magnitude/Variable: Name -->
						<td>
							<NuxtLink :to="localePath(item.path)">
								{{ item.name }}
							</NuxtLink>
						</td>
						<!-- Magnitude/Variable: Unit: Symbol -->
						<td>
							<MathSymbol :data="item.baseUnit.symbol" />
						</td>
						<!-- Magnitude/Variable: Unit: Name -->
						<td>
							<NuxtLink :to="localePath(item.baseUnit.path)">
								{{ item.baseUnit.name }}
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
			type: {
				type: String,
				default: 'variable'
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
			}
		}
	}
</script>