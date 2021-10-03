<template>
	<div class="card card-collapse" :class="`card-${slug.replace('.', '-')}`">
		<div class="card-body">
			<!-- Header -->
			<div class="collapse-header">
				<button class="btn btn-text btn-collapse w-100" type="button" data-bs-toggle="collapse" :data-bs-target="`#collapse-${slug.replace('.', '-')}`" :aria-controls="`collapse-${slug.replace('.', '-')}`" aria-expanded="true">
					<h2 class="card-title">
						{{ $t(`abbreviations.${slug}.cap`) }}
					</h2>
				</button>
				<slot name="link" />
			</div>
			<!-- Content -->
			<div :id="`collapse-${slug.replace('.', '-')}`" class="collapse show">
				<slot />
			</div>
		</div>
	</div>
</template>

<script>
	export default {
		props: {
			slug: {
				type: String,
				default: '',
			},
		},
	}
</script>