<template>
  <main role="main" class="contact">
    <div class="container">
		 <div class="card">
			 <div class="card-body">
				<h2 class="mb-4">
					{{ $t('contact.title') }}
				</h2>
				<p class="lead mb-4">
					{{ $t('contact.lead') }}
				</p>
				<form>
					<div class="form-floating mb-4">
						<input id="input-mail" class="form-control" :placeholder="$t('contact.placeholder-mail')" v-model="contact.mail"/>
						<label class="form-label" for="input-mail">
							{{ $t('contact.label-mail') }}
						</label>
					</div>
					<div class="form-floating mb-4">
						<textarea id="textarea-message" class="form-control" style="height:150px" :placeholder="$t('contact.placeholder-message')" v-model="contact.message" />
						<label class="form-label" for="textarea-message">
							{{ $t('contact.label-message') }}
						</label>
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
		data() {
			return {
				contact: {
					mail: '',
					message: ''
				}
			}
		},
		head() {
			return {
				bodyAttrs: {
					class: `page-contact`
				}
			}
		}
	}
</script>