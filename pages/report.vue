<template>
	<main role="main" class="report">
		<div class="container">
			<h2 class="page-title">{{ $t('report.title') }}</h2>
			<p class="lead mb-4">{{ $t('report.lead') }}</p>
			<div class="card">
				<div class="card-body">
					<form method="post" @submit.prevent="submitForm">
						<div class="row">
							<div class="col-12">
								<h4>{{ data.name }}</h4>
							</div>
							<div class="col-12 col-md mb-3" v-for="value, name in query" :key="name" :id="name">
								<label class="form-label" :for="'input-' + name">{{ $t(`report.label-${name}`) }}</label>
								<input class="form-control disabled" type="text" :id="'input-' + name" :name="name" :value="value" disabled/>
							</div>
						</div>
						<div class="mb-4">
							<label class="form-label" for="textarea-message">
								{{ $t('report.label-reason') }}
							</label>
							<textarea id="textarea-message" class="form-control" rows="5" :placeholder="$t('report.input-placeholder-reason')"></textarea>
						</div>
						<button type="submit" class="btn btn-primary px-5">
							{{ $t('report.button-submit') }}
						</button>
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
				data: {},
				query: false
			}
		},
		async asyncData({ $content, query, error }) {
			if(!query.slug) error({ statusCode: 404 });
			const data = await $content(query.type, query.slug)
						.only(['name', 'slug', 'type'])
						.fetch();
			return {
				data,
				query
			}
	
		},
		methods: {
			submitForm (e) {
				e.preventDefault();
				return;
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