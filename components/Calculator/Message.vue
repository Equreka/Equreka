<template>
	<div id="calculator-message" class="calculator-message" v-if="data.value == null && data.error">
		<div class="card-body d-flex flex-column align-items-center justify-content-center text-center">
			<template v-if="data.error && data.error.message">
				<p class="math-error-type m-0">
					{{ $t(`calculator.errors.type.${data.error.type}`) }}
				</p>
				<p class="math math-error-message mt-2 mb-0 d-none">
					{{ data.error.message }}
				</p>
			</template>
			<p class="math math-error-type m-0" v-else-if="data.error && data.error.type">
				{{ $t(`calculator.errors.type.${data.error.type}`) }}
			</p>
			<p class="math math-error-type m-0" v-else>
				{{ $t('calculator.errors.type.input.needed') }}
			</p>
		</div>
	</div>
</template>

<script>
export default {
	props: {
		data: {
			required: true,
		}
	}
}
</script>