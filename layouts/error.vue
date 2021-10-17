<template>
	<main role="main" class="error">
		<div class="container">
			<NuxtLink class="logo" :to="localePath('/')">
				<Logo class="mx-auto" width="100px" height="61px"/>
			</NuxtLink>
			<h1 class="fs-4 mt-5 mb-4">{{ $t('error.title') }}</h1>
			<h2 class="fs-1 text-highlight fw-bolder">{{ errorMessage }}</h2>
			<p class="lead text-muted mb-5">
				{{ $t('error.lead') }}
			</p>
			<NuxtLink class="btn btn-primary btn-sm py-2 px-4 rounded-pill" :to="localePath('/')">
				{{ $t('error.link') }}
			</NuxtLink>
		</div>
	</main>
</template>

<script>
	export default {
		layout: 'error-layout',
		props: ['error'],
		head: {
			bodyAttrs: {
				class: 'page-error'
			}
		},
		computed: {
			errorMessage() {
				let errorMessage = this.$t('error.general');
				if (this.error.message) {
					errorMessage = this.error.message
				}
				if (this.error.statusCode == 404) {
					errorMessage = this.$t('error.404')
				}
				return errorMessage;
			}
		}
	}
</script>