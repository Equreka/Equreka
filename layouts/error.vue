<template>
	<main role="main" class="error">
		<div class="container">
			<!-- Logo -->
			<NuxtLink class="brand" :to="localePath('/')">
				<Logo height="100px"/>
			</NuxtLink>
			<!-- Title -->
			<h1 class="mb-5">{{ $t('page.error.title') }}</h1>
			<h3>{{ errorMessage }}</h3>
			<p class="lead mb-5">
				{{ $t('page.error.lead') }}
			</p>
			<!-- Link -->
			<NuxtLink class="btn btn-primary" :to="localePath('/')">
				{{ $t('page.error.link') }}
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
				let errorMessage = this.$t('page.error.unknown');
				if (this.error.statusCode === 404) {
					errorMessage = this.$t('page.error.404')
				}
				if (this.error.message) {
					errorMessage = this.error.message
				}
				return errorMessage;
			}
		}
	}
</script>