export function firstLine(error: unknown): string {
	const message = error instanceof Error ? error.message : String(error);
	return message.split('\n')[0] ?? message;
}

/**
 * A 404 or 5xx page is a broken capture, not a 100% visual difference.
 */
export function assertLoaded(response: { status(): number } | null, url: string): void {
	if (response !== null && response.status() >= 400) {
		throw new Error(`${url} answered HTTP ${response.status()}`);
	}
}

/**
 * A capture whose web fonts did not load is a fault of the environment,
 * not a property of the page, so the capture is retried from scratch.
 */
export class FontLoadError extends Error {}
