<template>
	<div class="actions" v-if="data">
		<ActionsFavorite class="btn btn-link" :slug="data.slug" :type="type" />
		<ActionsCalculator class="btn btn-link" :slug="data.slug" :type="type" v-if="data.supported"/>
		<ActionsDownload class="btn btn-link" :data="data" :type="type"/>
		<ActionsReport class="btn btn-link"/>
	</div>
</template>

<script>
	export default {
		props: ['data', 'type', 'category']
	}
</script>