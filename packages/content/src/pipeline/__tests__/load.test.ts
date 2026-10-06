import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { loadContent } from '../load.js';

const CONTENT_DIR = fileURLToPath(new URL('../../../content/', import.meta.url));

const dirs: string[] = [];

afterEach(() => {
	for (const dir of dirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

describe('loadContent', () => {
	it('ships the content license beside the collections (ADR 0011)', () => {
		expect(existsSync(join(CONTENT_DIR, 'LICENSE'))).toBe(true);
	});

	it('reads only collection YAML: license and notes leave the corpus and its hash untouched', () => {
		const root = mkdtempSync(join(tmpdir(), 'equreka-load-'));
		dirs.push(root);
		mkdirSync(join(root, 'variables'));
		writeFileSync(
			join(root, 'variables', 'radius.yaml'),
			"# yaml-language-server: $schema=../../dist/schemas/variables.schema.json\nname:\n  en: 'Radius'\nsymbol:\n  tex: 'r'\n",
		);
		const before = loadContent(root);
		writeFileSync(join(root, 'LICENSE'), 'Attribution-ShareAlike 4.0 International\n');
		writeFileSync(join(root, 'variables', 'NOTES.md'), '# not content\n');
		const after = loadContent(root);
		expect(after.issues).toEqual([]);
		expect(after.files.map((file) => file.relPath)).toEqual(['variables/radius.yaml']);
		expect(after.contentHash).toBe(before.contentHash);
	});
});
