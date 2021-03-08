<template>
  <main>
    <div class="container">
      <h2>{{ $t('Contact') }}</h2>
      <p class="lead">Feel free to send a message if you want to say something to us!</p>
      <b-form>
        <label for=""></label>
        
        <b-form-group class="mb-4">
          <label class="form-label" for="input-mail">{{ $t('What\'s your e-mail?') }}</label>
          <b-input id="input-mail" placeholder="you@rock.com"></b-input>
        </b-form-group>

        <b-form-group class="mb-4">
          <label class="form-label" for="textarea-message">{{ $t('What\'s your message?') }}</label>
          <b-form-textarea id="textarea-message" rows="5" :placeholder="$t('What do you want to share to us?')"></b-form-textarea>
        </b-form-group>

        <b-button type="submit" variant="primary">{{ $t('page.report.button submit') }}</b-button>
      </b-form>
    </div>
  </main>
</template>