(() => {
	if (!('serviceWorker' in navigator)) return;
	let updateAccepted = false;

	/**
	 * Minimal vanilla update prompt (registerType "prompt" semantics): shown
	 * when a new service worker is installed and waiting; Reload messages
	 * SKIP_WAITING and the controllerchange listener finishes the swap.
	 */
	function showUpdateToast(waiting) {
		if (document.getElementById('pwa-update-toast') !== null) return;
		const toast = document.createElement('div');
		toast.id = 'pwa-update-toast';
		toast.setAttribute('role', 'status');
		toast.style.cssText =
			'position:fixed;bottom:1rem;right:1rem;z-index:50;display:flex;align-items:center;gap:0.75rem;' +
			'padding:0.75rem 1rem;border:1px solid var(--eq-border);border-radius:0.5rem;' +
			'background:var(--eq-surface);color:var(--eq-ink);font:0.875rem/1.25rem var(--font-sans);' +
			'box-shadow:0 4px 12px rgb(0 0 0 / 0.15)';
		const label = document.createElement('span');
		label.textContent = 'Update available';
		const button = document.createElement('button');
		button.type = 'button';
		button.textContent = 'Reload';
		button.style.cssText =
			'border:0;border-radius:0.375rem;padding:0.375rem 0.75rem;background:var(--eq-accent);' +
			'color:var(--eq-accent-ink);font:inherit;font-weight:600;cursor:pointer';
		button.addEventListener('click', () => {
			updateAccepted = true;
			waiting.postMessage({ type: 'SKIP_WAITING' });
		});
		toast.append(label, button);
		document.body.append(toast);
	}

	window.addEventListener('load', () => {
		navigator.serviceWorker.addEventListener('controllerchange', () => {
			if (updateAccepted) window.location.reload();
		});
		navigator.serviceWorker
			.register('/sw.js')
			.then((registration) => {
				if (registration.waiting !== null && navigator.serviceWorker.controller !== null) {
					showUpdateToast(registration.waiting);
				}
				registration.addEventListener('updatefound', () => {
					const installing = registration.installing;
					if (installing === null) return;
					installing.addEventListener('statechange', () => {
						if (installing.state === 'installed' && navigator.serviceWorker.controller !== null) {
							showUpdateToast(installing);
						}
					});
				});
			})
			.catch(() => {});
	});
})();
