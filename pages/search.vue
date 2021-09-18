<template>
	<main role="main" class="search">
		<SVGSearchEmpty />
		<div class="container">
			<header class="main-header">
				<h2 class="page-title">
					{{ $t('search.title') }}
				</h2>
			</header>
			<SearchBar :get="query"/>
		</div>
	</main>
</template>

<script>
	export default {
		data() {
			return {
				results: false,
				focus: false,
				query: null,
				data: {}
			}
		},
		async asyncData({ query }) {
			if(query.q) {
				return {
					query: query.q
				}
			}
		},
		head() {
			return {
				bodyAttrs: {
					class: `page-search`
				}
			}
		}
	}
</script>