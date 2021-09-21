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
				<NuxtLink class="btn btn-sm btn-go rounded-pill" :to="localePath(to)">
					<span>{{ $t('actions.view.by') + $t(`abbreviations.${type}.cap`)}}</span>
					<i class="bi bi-arrow-right"></i>
				</NuxtLink>
			</div>
			<!-- List -->
			<div :id="`collapse-${type}`" class="collapse show">
				<div class="list">
					<NuxtLink v-for="item in data" :key="item.slug" :to="localePath(item.path)">
						<EqurekaSymbol class="badge" :data="item.symbol" v-if="item.symbol"/>
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
				type: String,
				required: true
			},
			type: {
				type: String,
				required: true
			},
			header: {
				type: Boolean,
				default: true
			}
		}
	}
</script>