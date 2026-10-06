import { describe, expect, it } from 'vitest';
import {
	type ClipboardWriter,
	type CopyDocument,
	type CopyTextArea,
	copyText,
	copyWithExecCommand,
} from '../clipboard';

interface FakeTextArea extends CopyTextArea {
	attributes: Record<string, string>;
	selected: boolean;
	removed: boolean;
}

interface FakeDocument extends CopyDocument {
	areas: FakeTextArea[];
	copied: string[];
}

function fakeTextArea(): FakeTextArea {
	return {
		value: '',
		attributes: {},
		selected: false,
		removed: false,
		setAttribute(name, value) {
			this.attributes[name] = value;
		},
		select() {
			this.selected = true;
		},
		setSelectionRange() {
			this.selected = true;
		},
		remove() {
			this.removed = true;
		},
	};
}

function fakeDocument(execResult: boolean | 'throw' = true): FakeDocument {
	const areas: FakeTextArea[] = [];
	const copied: string[] = [];
	return {
		areas,
		copied,
		appendTextArea() {
			const area = fakeTextArea();
			areas.push(area);
			return area;
		},
		execCopy() {
			if (execResult === 'throw') throw new Error('blocked');
			const area = areas.at(-1);
			if (execResult && area?.selected === true) copied.push(area.value);
			return execResult;
		},
	};
}

function writer(outcome: 'resolve' | 'reject', sink: string[] = []): ClipboardWriter {
	return {
		writeText: (text) => {
			if (outcome === 'reject') return Promise.reject(new Error('NotAllowedError'));
			sink.push(text);
			return Promise.resolve();
		},
	};
}

describe('copyText', () => {
	it('uses the async Clipboard API when it is available', async () => {
		const sink: string[] = [];
		const doc = fakeDocument();
		const copied = await copyText('m = 2 kg', {
			clipboard: writer('resolve', sink),
			document: doc,
		});
		expect(copied).toBe(true);
		expect(sink).toEqual(['m = 2 kg']);
		expect(doc.areas).toHaveLength(0);
	});

	it('falls back to execCommand when the Clipboard API is missing', async () => {
		const doc = fakeDocument();
		expect(await copyText('m = 2 kg', { clipboard: undefined, document: doc })).toBe(true);
		expect(doc.copied).toEqual(['m = 2 kg']);
	});

	it('falls back to execCommand when the Clipboard API rejects', async () => {
		const doc = fakeDocument();
		expect(await copyText('E = 1 J', { clipboard: writer('reject'), document: doc })).toBe(true);
		expect(doc.copied).toEqual(['E = 1 J']);
	});

	it('reports failure when neither path can copy', async () => {
		const blocked = fakeDocument(false);
		expect(await copyText('x', { clipboard: writer('reject'), document: blocked })).toBe(false);
		expect(await copyText('x', { clipboard: undefined, document: undefined })).toBe(false);
	});
});

describe('copyWithExecCommand', () => {
	it('copies from an off-screen read-only textarea and always removes it', () => {
		const doc = fakeDocument();
		expect(copyWithExecCommand('42', doc)).toBe(true);
		const [area] = doc.areas;
		expect(area?.attributes.readonly).toBe('');
		expect(area?.attributes['aria-hidden']).toBe('true');
		expect(area?.attributes.style).toContain('opacity:0');
		expect(area?.removed).toBe(true);
	});

	it('returns false and still cleans up when execCommand throws', () => {
		const doc = fakeDocument('throw');
		expect(copyWithExecCommand('42', doc)).toBe(false);
		expect(doc.areas[0]?.removed).toBe(true);
	});
});
