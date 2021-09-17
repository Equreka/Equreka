<template>
	<div class="card card-collapse">
		<div class="card-body">
			<!-- Header -->
			<div class="collapse-header">
				<button class="btn btn-text btn-collapse" type="button" data-bs-toggle="collapse" :data-bs-target="`#collapse-${type}`" :aria-controls="`collapse-${type}`" aria-expanded="true">
					<h2 class="section-title">
					{{ $t(`abbreviations.${type}.cap`) }}
					</h2>
				</button>
				<NuxtLink class="btn btn-sm btn-category" :to="localePath(`/${category}/${type}`)">
					<span>{{ $t('Go to section')}}</span>
					<i class="bi bi-arrow-right"></i>
				</NuxtLink>
			</div>
			<!-- List -->
			<div :id="`collapse-${type}`" class="collapse show">
				<div class="list">
					<NuxtLink v-for="item in data" :key="item.slug" :class="type" :to="localePath(`/${category}/${type}/${item.slug}`)">
						{{ item.name }}
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
			category: {
				type: String,
				required: true
			},
			type: {
				type: String,
				required: true
			}
		}
	}
</script>