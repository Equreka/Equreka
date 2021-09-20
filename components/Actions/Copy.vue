<template>
	<button type="button" :aria-label="$t('actions.copy.label')" @click="copyToClipboard(target)">
		<i class="bi bi-clipboard" :class="icon && expanded ? `me-${expand}-3` : ''" v-if="icon"></i>
		<span :class="expanded ? `d-none d-${expand}-inline expanded` : 'visually-hidden'">
			{{ $t('actions.copy.label') }}
		</span>
	</button>
</template>

<script>
	export default {
		props: {
			target: {
				type: String,
				required: true,
			},
			expand: {
				type: String,
				default: 'md',
			},
			expanded: {
				type: Boolean,
				default: false,
			},
			icon: {
				type: Boolean,
				default: true,
			}
		},
		methods: {
			copyToClipboard(selector) {
				const element = document.querySelector(selector);
				if (!element || !selector) return;
				// Fallback
				if (!navigator.clipboard) return this.fallback(element);
				// Continue
				const text = element.value || element.innerText;
				let success = false;
				if(navigator.clipboard.writeText(text)) {
					success = true;
					alert(this.$t('actions.copy.success'));
				} else {
					alert(this.$t('actions.copy.error'));
				}
				return success;
			},
			fallback(element) {
				// If element is not a textarea or input then we create it
				if(!(element.matches('input') || element.matches('textarea'))) {
					const text = element.innerText;
					element = document.createElement("textarea");
					element.value = text;
					element.style = "position: fixed; top: 0; left: 0; z-index: -10000; opacity: 0;";
					document.body.appendChild(element);
				}
				element.focus();
				element.select();
				element.setSelectionRange(0, 99999);
				let success = false;
				// Copy the text
				try {
					document.execCommand("copy");
					success = true;
				} catch (error) {
					success = false;
				}
				if(success) {
					alert(this.$t('actions.copy.success'));
				} else {
					alert(this.$t('actions.copy.error'));
				}
				// Remove appended element
				document.body.removeChild(element);
				return success;
			}
		}
	}
</script>