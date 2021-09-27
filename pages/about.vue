<template>
	<main role="main" class="about">
		<div class="container">
			<div class="card">
				<div class="card-body">
					<h2 class="mb-4">
						{{ $t('about.title') }}
					</h2>
					<p class="lead">
						Equreka is a 100% free and ad-free, open-source platform for everyone. Hopefully you will find this usefull and will inspire to learn more, create and contribute to human-kind.
					</p>
					<p class="mb-5">
						You can contribute in many ways, from sharing to contributing directly to the project in our Github.
					</p>

					<h3 class="mb-3">
						Free and Open-source? <small class="text-muted">where is the catch?</small>
					</h3>
					<p class="lead">
						There is NO catch, it's as simple as that. By being open-source, the project obtains reliability, transparency and gives the opportunity for anyone (who wants to) to contribute and do their bit.
					</p>

					<blockquote class="rounded shadow-sm mb-5">
						<p>
							I firmly believe that knowledge should be free, open, easily accessible and if can be, as easy to understand as possible.
						</p>
						<figcaption class="blockquote-footer">
							Derian, Creator of Equreka
						</figcaption>
					</blockquote>

					<h3 class="mb-3">Special thanks to</h3>
					<p>
						Science and all the people that creates awesome stuff, all philosophers, all alchemists, all scientists, to all those people who contributed to science, to civilization, to humanity. All open source projects and specially the ones that made possible this project
					</p>
					<p>Here are some projects (in alphabetical order) that made this project possible:</p>
					<div class="card card-body rounded shadow-sm mb-3">
						<div class="hstack flex-wrap gap-3">
							<a class="" target="_blank" rel="noopener nofollow" v-for="(url, title) in projects" :key="title" :href="url">{{ title }}</a>
						</div>
					</div>
					<p class="text-muted small">You can check our <a  target="_blank" rel="noopener nofollow" href="https://github.com/Equreka">Github</a> for a more complete list in our source-code.</p>
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