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
		toast.className = 'eq-toast';
		const label = document.createElement('span');
		label.textContent = 'Update available';
		const button = document.createElement('button');
		button.type = 'button';
		button.textContent = 'Reload';
		button.className = 'eq-btn eq-btn-primary eq-btn-pill eq-btn-sm';
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
