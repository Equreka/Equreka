<template>
	<CardCollapse :slug="slug">
		<template slot="link">
			<NuxtLink class="btn btn-sm btn-go rounded-pill" :to="localePath(to)" v-if="to">
				<span>{{ $t('actions.view.all') }}</span>
				<i class="bi bi-arrow-right"></i>
			</NuxtLink>
		</template>
		<div class="list">
			<NuxtLink v-for="item in data" :key="item.slug" :to="localePath(pathCalc + item.path)">
				<MathSymbol class="badge badge-symbol" :data="item.symbol" display="inline" v-if="item.symbol && item.symbol.tex != ''"/>
				<span class="name">
					{{ item.name }}
				</span>
			</NuxtLink>
		</div>
	</CardCollapse>
</template>

<script>
	export default {
		props: {
			slug: {
				type: String,
				default: '',
			},
			data: {
				type: Array | Object | Boolean,
				required: true
			},
			to: {
				type: String | Boolean,
				default: false
			},
			type: {
				type: String,
				required: true
			},
			header: {
				type: Boolean,
				default: true
			},
			calculator: {
				type: Boolean,
				default: false
			}
		},
		computed: {
			pathCalc() {
				return (this.calculator || this.$route.path.includes('calculator')) ? '/calculator' : '';
			}
		}	
	}
</script>