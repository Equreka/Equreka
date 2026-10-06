/**
 * The slice of `navigator.clipboard` the copy action needs; absent in
 * insecure contexts (plain-http LAN previews) and older engines.
 */
export interface ClipboardWriter {
	writeText(text: string): Promise<void>;
}

export interface CopyTextArea {
	value: string;
	setAttribute(name: string, value: string): void;
	select(): void;
	setSelectionRange(start: number, end: number): void;
	remove(): void;
}

/**
 * The DOM operations the execCommand fallback needs, behind an interface
 * so tests drive the fallback without a DOM. `appendTextArea` returns a
 * textarea already attached to the document body.
 */
export interface CopyDocument {
	appendTextArea(): CopyTextArea;
	execCopy(): boolean;
}

export interface CopyEnvironment {
	clipboard: ClipboardWriter | undefined;
	document: CopyDocument | undefined;
}

/**
 * Legacy Copy.vue fallback: an off-screen, read-only textarea selected and
 * copied through `execCommand('copy')`, then removed whatever happens.
 */
export function copyWithExecCommand(text: string, doc: CopyDocument): boolean {
	const area = doc.appendTextArea();
	try {
		area.setAttribute('readonly', '');
		area.setAttribute('aria-hidden', 'true');
		area.setAttribute('style', 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;');
		area.value = text;
		area.select();
		area.setSelectionRange(0, text.length);
		return doc.execCopy();
	} catch {
		return false;
	} finally {
		area.remove();
	}
}

function browserDocument(): CopyDocument | undefined {
	if (typeof document === 'undefined') return undefined;
	return {
		appendTextArea: () => document.body.appendChild(document.createElement('textarea')),
		execCopy: () => document.execCommand('copy'),
	};
}

function browserEnvironment(): CopyEnvironment {
	return {
		clipboard: typeof navigator === 'undefined' ? undefined : navigator.clipboard,
		document: browserDocument(),
	};
}

/**
 * Async Clipboard API first; when it is missing or rejects (permission
 * denied, document not focused) the execCommand fallback runs. Resolves
 * to whether the text reached the clipboard.
 */
export async function copyText(
	text: string,
	environment: CopyEnvironment = browserEnvironment(),
): Promise<boolean> {
	const viaClipboard =
		environment.clipboard === undefined
			? false
			: await environment.clipboard.writeText(text).then(
					() => true,
					() => false,
				);
	if (viaClipboard) return true;
	return environment.document === undefined
		? false
		: copyWithExecCommand(text, environment.document);
}
