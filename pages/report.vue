<template>
  <main role="main">
    <div class="container">
      <h2>{{ $t('page.report.title') }}</h2>
      <p class="lead mb-4">{{ $t('page.report.lead') }}</p>
      <b-form @submit.prevent="submitForm">
        <div class="row">
          <b-form-group class="col-12 col-md mb-3" v-for="value, name in params" :key="name" :id="name">
            <label class="form-label" :for="'input-' + name">{{ $t('page.report.label-' + name) }}</label>
            <b-form-input class="disabled" type="text" :id="'input-' + name" :name="name" :value="value" disabled/>
          </b-form-group>
        </div>

        <b-form-group class="mb-4">
          <label class="form-label" for="textarea-message">{{ $t('page.report.label-reason') }}</label>
          <b-form-textarea id="textarea-message" rows="5" :placeholder="$t('page.report.input-placeholder-reason')"></b-form-textarea>
        </b-form-group>

        <b-button type="submit" variant="primary">{{ $t('page.report.button-submit') }}</b-button>
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
        error({ statusCode: 404 });
      }
    },
    head() {
      return {
        bodyAttrs: {
          class: `page-report`
        }
      }
    }
  }
</script>