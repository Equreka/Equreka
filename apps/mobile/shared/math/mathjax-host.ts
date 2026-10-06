/**
 * MathJax's `util/context` module reads `window.navigator.appVersion` and
 * `.userAgent` while it evaluates, to name the host OS for file-path
 * handling. React Native defines `window` and a `navigator` that carries
 * only `product`, so every MathJax import would throw before the first
 * render, on device and under jest-expo alike. Imported before any MathJax
 * module, this leaves an empty string where a string is expected; nothing
 * in the runtime leg reads the resulting `context.os`.
 */
const host = globalThis as { navigator?: { appVersion?: unknown; userAgent?: unknown } };

if (host.navigator !== undefined) {
	for (const key of ['appVersion', 'userAgent'] as const) {
		if (typeof host.navigator[key] !== 'string') {
			Object.defineProperty(host.navigator, key, {
				value: '',
				configurable: true,
				writable: true,
			});
		}
	}
}
