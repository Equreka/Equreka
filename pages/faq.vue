<template>
  <main role="main" class="faq">
    <div class="container">
      <h2>{{ $t('page.faq.title') }}</h2>
      <p class="lead">{{ $t('page.faq.lead') }}</p>

      <h3>Why is it free?</h3>
      <h3>{{ $t('page.faq.why-no-signup.question') }}</h3>
      <p>{{ $t('page.faq.why-no-signup.anwser') }}</p>
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