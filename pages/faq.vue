<template>
	<main role="main" class="faq">
		<div class="container">
			<h2 class="page-title">{{ $t('faq.title') }}</h2>
			<p class="lead">{{ $t('faq.lead') }}</p>

			<h3>Why is it free?</h3>
			<p></p>
			
			<h3>{{ $t('faq.why-no-signup.question') }}</h3>
			<p>{{ $t('faq.why-no-signup.anwser') }}</p>
		</div>
	</main>
</template>

<script>
  export default {
    head() {
      return {
        bodyAttrs: {
          class: `page-faq`
        }
      }
    }
  }
</script>