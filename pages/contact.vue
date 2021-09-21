<template>
  <main role="main" class="contact">
    <div class="container">
		 <div class="card">
			 <div class="card-body">
				<h2 class="page-title">{{ $t('contact.title') }}</h2>
				<p class="lead">{{ $t('contact.lead') }}</p>
				<form>
					<div class="mb-4">
						<label class="form-label" for="input-mail">{{ $t('contact.label-mail') }}</label>
						<input id="input-mail" class="form-control" :placeholder="$t('contact.placeholder-mail')" />
					</div>
					<div class="mb-4">
						<label class="form-label" for="textarea-message">{{ $t('contact.label-message') }}</label>
						<textarea id="textarea-message" class="form-control" rows="5" :placeholder="$t('contact.placeholder-message')"></textarea>
					</div>
					<button type="submit" class="btn btn-primary px-5">
						{{ $t('contact.button-submit') }}
					</button>
				</form>
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
					class: `page-contact`
				}
			}
		}
	}
</script>