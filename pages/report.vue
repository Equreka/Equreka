<template>
	<main role="main" class="report">
		<div class="container">
			<h2 class="page-title">{{ $t('page.report.title') }}</h2>
			<p class="lead mb-4">{{ $t('page.report.lead') }}</p>
			<div class="card">
				<div class="card-body">
					<form method="post" @submit.prevent="submitForm">
						<div class="row">
							<div class="col-12 col-md mb-3" v-for="value, name in params" :key="name" :id="name">
								<label class="form-label" :for="'input-' + name">{{ $t(`page.report.label-${name}`) }}</label>
								<input class="form-control disabled" type="text" :id="'input-' + name" :name="name" :value="value" disabled/>
							</div>
						</div>
						<div class="mb-4">
							<label class="form-label" for="textarea-message">{{ $t('page.report.label-reason') }}</label>
							<textarea id="textarea-message" class="form-control" rows="5" :placeholder="$t('page.report.input-placeholder-reason')"></textarea>
						</div>
						<button type="submit" class="btn btn-primary">{{ $t('page.report.button-submit') }}</button>
					</form>
				</div>
			</div>
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