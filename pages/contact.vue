<template>
  <main role="main" class="contact">
    <div class="container">
      <h2 class="page-title">{{ $t('page.contact.title') }}</h2>
      <p class="lead">{{ $t('page.contact.lead') }}</p>
      <form method="post">        
        <div class="mb-4">
          <label class="form-label" for="input-mail">{{ $t('page.contact.label-mail') }}</label>
          <input id="input-mail" class="form-control" :placeholder="$t('page.contact.placeholder-mail')" />
        </div>

        <div class="mb-4">
          <label class="form-label" for="textarea-message">{{ $t('page.contact.label-message') }}</label>
          <textarea id="textarea-message" class="form-control" rows="5" :placeholder="$t('page.contact.placeholder-message')"></textarea>
        </div>

        <button type="submit" class="btn btn-primary">{{ $t('page.contact.button-submit') }}</button>
      </form>
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