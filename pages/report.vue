<template>
  <main role="main">
    <div class="container">
      <h2>{{ $t('Page Report title') }}</h2>
      <p class="lead mb-4">{{ $t('Page Report lead') }}</p>
      <b-form @submit.prevent="submitForm">
        <div class="row">
          <b-form-group class="col-12 col-md mb-3" v-for="value, name in params" :key="name" :id="name">
            <label class="form-label" :for="'input-' + name">{{ $t('Page Report label ' + name) }}</label>
            <b-form-input class="disabled" type="text" :id="'input-' + name" :name="name" :value="value" disabled/>
          </b-form-group>
        </div>

        <b-form-group class="mb-4">
          <label class="form-label" for="textarea-message">{{ $t('Page Report label reason') }}</label>
          <b-form-textarea id="textarea-message" rows="5" :placeholder="$t('Page Report input placeholder reason')"></b-form-textarea>
        </b-form-group>

        <b-button type="submit" variant="primary">{{ $t('Page Report button submit') }}</b-button>
      </b-form>
    </div>
  </main>
</template>

<script>
  export default {
    data () {
      return {
        params: false
      }
    },
    async asyncData({ query, error }) {
      if(query.category) {
        return {
          params: query
        }
      } else {
        error({ message: 'Something is wrong' });
      }
    },
    head: {
      bodyAttrs: {
        class: 'page-report'
      }
    }
  }
</script>