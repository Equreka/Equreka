<template>
	<main role="main" class="about">
		<div class="container">
			<div class="card">
				<div class="card-body">
					<h2 class="mb-4">
						{{ $t('about.title') }}
					</h2>
					<p class="lead">
						{{ $t('about.lead') }}
					</p>
					<p class="mb-5">
						{{ $t('about.paragraph') }}
					</p>
					<h3 class="mb-3" v-html="$t('about.free-and-open-source.title')" />
					<p class="lead">
						{{ $t('about.free-and-open-source.lead') }}
					</p>
					<blockquote class="rounded shadow-sm mb-5">
						<p>
							{{ $t('about.free-and-open-source.quote.paragraph') }}
						</p>
						<figcaption class="blockquote-footer">
							{{ $t('about.free-and-open-source.quote.author') }}
						</figcaption>
					</blockquote>
					<h3 class="mb-3">
						{{ $t('about.thanks.title') }}
					</h3>
					<p>
						{{ $t('about.thanks.lead') }}
					</p>
					<p>
						{{ $t('about.thanks.paragraph') }}
					</p>
					<div class="card card-body rounded shadow-sm mb-3">
						<div class="hstack flex-wrap gap-3">
							<a class="" target="_blank" rel="noopener nofollow" v-for="(url, title) in projects" :key="title" :href="url">{{ title }}</a>
						</div>
					</div>
					<p class="text-muted small" v-html="$t('about.thanks.check-github')" />
				</div>
			</div>
		</div>
	</main>
</template>

<script>
	export default {
		data() {
			return {
				projects: {
					'Bootstrap':            'https://github.com/twbs/bootstrap',
					'Bootstrap Icons':      'https://github.com/twbs/icons',
					'Capacitor':            'https://capacitorjs.com/',
					'Express':              'https://expressjs.com/es/',
					'Github':               'https://github.com/',
					'Mathjax':              'https://mathjax.com/',
					'MongoDB':              'https://mongodb.com/',
					'Mongoose':             'https://mongoosejs.com/',
					'Node.js':              'https://nodejs.org/',
					'Nuxt.js':              'https://nuxtjs.org/',
					'Stack Overflow':       'https://stackoverflow.com/',
					'Undraw':               'https://undraw.co/',
					'Vue.js':               'https://vuejs.org/',
					'Wikimedia Foundation': 'https://wikimediafoundation.org/',
				}
			}
		},
		head() {
			return {
				bodyAttrs: {
					class: `page-about`
				}
			}
		}
	}
</script>