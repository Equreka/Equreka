<template> 
	<main role="main" class="category" :class="type">
		<PageHeader :title="$t(`abbreviations.${type}.cap`)" />
		<div class="container">
			<div class="card">
				<div class="card-body">
					<div class="row row-cols-1 row-cols-md-2">
						<div class="col">
							<TablePrefixes :data="prefixes" positive/>
						</div>
						<div class="col">
							<TablePrefixes :data="prefixes" negative/>
						</div>
					</div>
				</div>
			</div>
		</div>
		<MathAll />
	</main>
</template>

<script>
	export default {
		async asyncData({ $content, params, error }) {
			const type = 'prefixes';
			let prefixes = [];
			try {
				prefixes = await $content(type)
					.sortBy('value', 'desc')
					.fetch()
					.catch((error) => {
						error({ statusCode: 404 })
					});
			} catch {
				prefixes = [];
			}
			return {
				type,
				prefixes
			}
		}
	}
</script>