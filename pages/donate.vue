<template>
	<main role="main" class="donate">
		<div class="container">
			<div class="card">
				<div class="card-body">
					<h2 class="page-title">{{ $t('donate.title') }}</h2>
					<p class="lead">{{ $t('donate.lead') }}</p>
					<p>{{ $t('donate.paragraph') }}</p>
					<div class="hstack gap-3">
						<a href="https://github.com/sponsors/DerianAndre" class="btn btn-dark btn-icon" target="_blank" rel="noopener nofollow">
							<i class="bi bi-github"></i>
							{{ $t('donate.button-github') }}
						</a>
						<a href="https://paypal.me/Derianandre" class="btn btn-primary btn-icon" target="_blank" rel="noopener nofollow">
							<i class="bi bi-credit-card"></i>
							{{ $t('donate.button-paypal') }}
						</a>
					</div>
				</div>
			</div>
		</div>
	</main>
</template>

<script>
	export default {
		head() {
			return {
				bodyAttrs: {
					class: `page-donate`
				}
			}
		}
	}
</script>