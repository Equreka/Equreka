<template>
	<div class="card card-collapse" :class="`card-${type}`">
		<div class="card-body">
			<!-- Header -->
			<div class="collapse-header" v-if="header">
				<button class="btn btn-text btn-collapse" type="button" data-bs-toggle="collapse" :data-bs-target="`#collapse-${type}`" :aria-controls="`collapse-${type}`" aria-expanded="true">
					<h2 class="card-title">
						{{ $t(`abbreviations.${type}.cap`) }}
					</h2>
				</button>
				<NuxtLink class="btn btn-sm btn-go rounded-pill" :to="localePath(to)" v-if="to">
					<span>{{ $t('actions.view.all') }}</span>
					<i class="bi bi-arrow-right"></i>
				</NuxtLink>
			</div>
			<!-- List -->
			<div :id="`collapse-${type}`" class="collapse show">
				<div class="list">
					<NuxtLink v-for="item in data" :key="item.slug" :to="localePath(pathCalc + item.path)">
						<MathSymbol class="badge" :data="item.symbol" v-if="item.symbol"/>
						<span class="name">
							{{ item.name }}
						</span>
					</NuxtLink>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
	export default {
		props: {
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