<template>
	<div class="actions" v-if="data">
		<ActionsCalculator class="btn btn-link" :to="data.path" :type="type" v-if="showCalculator"/>
		<ActionsFavorite   class="btn btn-link" :slug="data.slug" :type="type" />
		<ActionsDownload   class="btn btn-link d-none d-md-flex" :data="data" />
		<ActionsReport     class="btn btn-link d-none d-md-flex"/>
	</div>
</template>

<script>
	export default {
		props: ['data', 'type', 'category'],
		computed: {
			showCalculator() {
				const type = this.data.dir.substring(1);
				const disabled = ['constants', 'variables', 'magnitudes'];
				let show = true;
				if(type == 'equations' || type == 'formulas') {
					show = this.data.supported ? true : false;
				}
				if(disabled.includes(type) || this.data.supported === false) {
					show = false;
				}
				return show;
			}
		}
	}
</script>