import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type CollectionName, collectionLocaleTrees, TRANSLATION_LOCALES } from '@equreka/schema';
import { afterEach, describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { loadCollection, loadContent } from '../load.js';
import { localeGaps, readLocaleDebt } from '../locale-completeness.js';
import { inlineLocaleKeys, mergeSidecar, parseContentFilename } from '../locale-sidecar.js';
import { lintTex } from '../tex-lint.js';
import { validateContent } from '../validate.js';

const PACKAGE_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const CONTENT_DIR = join(PACKAGE_ROOT, 'content');

const dirs: string[] = [];

afterEach(() => {
	for (const dir of dirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

function header(collection: string, sidecar: boolean): string {
	return `# yaml-language-server: $schema=../../dist/schemas/${collection}${sidecar ? '.locale' : ''}.schema.json\n`;
}

function contentDirWith(collection: CollectionName, files: Record<string, string>): string {
	const root = mkdtempSync(join(tmpdir(), 'equreka-sidecar-'));
	dirs.push(root);
	mkdirSync(join(root, collection));
	for (const [name, body] of Object.entries(files)) {
		writeFileSync(
			join(root, collection, name),
			header(collection, name.split('.').length > 2) + body,
		);
	}
	return root;
}

const PATH_YAML = [
	'name:',
	"  en: 'Temperature scales'",
	"level: 'intro'",
	'steps:',
	"  - id: 'kelvin'",
	"    kind: 'entry'",
	'    ref:',
	"      collection: 'units'",
	"      slug: 'kelvin'",
	'    note:',
	"      en: 'Absolute scale.'",
	"  - id: 'composing'",
	"    kind: 'prose'",
	'    body:',
	"      en: 'Compose them.'",
	"  - id: 'check-boiling'",
	"    kind: 'check'",
	'    prompt:',
	"      en: 'Where does water boil?'",
	'    answer:',
	"      en: 'At 373.15 K.'",
	'',
].join('\n');

const messagesOf = (issues: readonly { file: string; message: string }[]): string[] =>
	issues.map((entry) => `${entry.file}: ${entry.message}`);

describe('parseContentFilename', () => {
	it('splits entity and sidecar filenames', () => {
		expect(parseContentFilename('si-base-units.yaml')).toEqual({
			ok: true,
			slug: 'si-base-units',
			locale: null,
		});
		expect(parseContentFilename('si-base-units.es.yaml')).toEqual({
			ok: true,
			slug: 'si-base-units',
			locale: 'es',
		});
	});

	it('rejects a source-locale sidecar, an unknown locale and extra segments', () => {
		expect(parseContentFilename('metre.en.yaml')).toMatchObject({
			ok: false,
			message: /source locale/,
		});
		expect(parseContentFilename('metre.fr.yaml')).toMatchObject({
			ok: false,
			message: /unknown locale 'fr'/,
		});
		expect(parseContentFilename('metre.es.old.yaml')).toMatchObject({ ok: false });
		expect(parseContentFilename('Metre.yaml')).toMatchObject({ ok: false });
	});
});

describe('sidecar merge in the loader', () => {
	it('merges name and description into the entity localizedText before validation', () => {
		const dir = contentDirWith('categories', {
			'physics.yaml':
				"name:\n  en: 'Physics'\norder: '2'\ndescription:\n  en: >-\n    The science of matter.\n",
			'physics.es.yaml': "name: 'Física'\ndescription: >-\n  La ciencia de la materia.\n",
		});
		const loaded = loadCollection(dir, 'categories');
		expect(loaded.issues).toEqual([]);
		expect(loaded.entries).toHaveLength(1);
		expect(loaded.entries[0]?.data).toMatchObject({
			name: { en: 'Physics', es: 'Física' },
			description: { en: 'The science of matter.', es: 'La ciencia de la materia.' },
		});
		expect(loaded.entries[0]?.sidecars.map((file) => file.relPath)).toEqual([
			'categories/physics.es.yaml',
		]);
		expect(loaded.files.map((file) => file.relPath)).toEqual([
			'categories/physics.yaml',
			'categories/physics.es.yaml',
		]);
	});

	it('merges step prose by step id, independent of order in the sidecar', () => {
		const dir = contentDirWith('paths', {
			'temperature-scales.yaml': PATH_YAML,
			'temperature-scales.es.yaml': [
				'steps:',
				'  check-boiling:',
				"    answer: 'A 373.15 K.'",
				"    prompt: '¿Dónde hierve el agua?'",
				'  kelvin:',
				"    note: 'Escala absoluta.'",
				'',
			].join('\n'),
		});
		const loaded = loadCollection(dir, 'paths');
		expect(loaded.issues).toEqual([]);
		const data = loaded.entries[0]?.data as { steps: Record<string, unknown>[] } | undefined;
		const steps = data?.steps ?? [];
		expect(steps.map((step) => step.id)).toEqual(['kelvin', 'composing', 'check-boiling']);
		expect(steps[0]?.note).toEqual({ en: 'Absolute scale.', es: 'Escala absoluta.' });
		expect(steps[1]?.body).toEqual({ en: 'Compose them.' });
		expect(steps[2]).toMatchObject({
			prompt: { en: 'Where does water boil?', es: '¿Dónde hierve el agua?' },
			answer: { en: 'At 373.15 K.', es: 'A 373.15 K.' },
		});
	});

	it('merges equation symbol-term labels by term key', () => {
		const dir = contentDirWith('equations', {
			'pythagorean-theorem.yaml': [
				"name:\n  en: 'Pythagorean theorem'",
				"expression: '\\var{a}^{2}=\\var{c}^{2}'",
				'terms:',
				"  a:\n    kind: 'symbol'\n    label:\n      en: 'Leg'",
				"  c:\n    kind: 'symbol'\n    label:\n      en: 'Hypotenuse'",
				'',
			].join('\n'),
			'pythagorean-theorem.es.yaml': "terms:\n  c:\n    label: 'Hipotenusa'\n",
		});
		const loaded = loadCollection(dir, 'equations');
		expect(loaded.issues).toEqual([]);
		expect(loaded.entries[0]?.data).toMatchObject({
			terms: {
				a: { label: { en: 'Leg' } },
				c: { label: { en: 'Hypotenuse', es: 'Hipotenusa' } },
			},
		});
	});

	it('rejects a sidecar for an unknown slug', () => {
		const dir = contentDirWith('categories', {
			'physics.yaml': "name:\n  en: 'Physics'\norder: '2'\n",
			'phisics.es.yaml': "name: 'Física'\n",
		});
		expect(messagesOf(loadCollection(dir, 'categories').issues)).toEqual([
			"categories/phisics.es.yaml: sidecar for unknown entity 'phisics' (no phisics.yaml)",
		]);
	});

	it('rejects a sidecar key that is not a localized field', () => {
		const dir = contentDirWith('paths', {
			'temperature-scales.yaml': PATH_YAML,
			'temperature-scales.es.yaml': "level: 'intro'\nsteps:\n  composing:\n    bdy: 'Prosa.'\n",
		});
		const messages = messagesOf(loadCollection(dir, 'paths').issues);
		expect(messages).toHaveLength(2);
		expect(messages.join('\n')).toMatch(
			/temperature-scales\.es\.yaml: \(root\): Unrecognized key: "level"/,
		);
		expect(messages.join('\n')).toMatch(/steps\.composing: Unrecognized key: "bdy"/);
	});

	it('rejects translations of a step id or optional field the entity does not author', () => {
		const dir = contentDirWith('paths', {
			'temperature-scales.yaml': PATH_YAML,
			'temperature-scales.es.yaml': [
				"description: 'Sin descripción en inglés.'",
				'steps:',
				'  missing:',
				"    body: 'Prosa.'",
				'  composing:',
				"    note: 'Una nota que el paso en prosa no tiene.'",
				'',
			].join('\n'),
		});
		expect(messagesOf(loadCollection(dir, 'paths').issues)).toEqual([
			'paths/temperature-scales.es.yaml: description: the entity has no en text here to translate',
			"paths/temperature-scales.es.yaml: steps.missing: the entity has no item with id 'missing'",
			'paths/temperature-scales.es.yaml: steps.composing.note: the entity has no en text here to translate',
		]);
	});

	it('rejects inline translations in the entity file, naming the sidecar to use', () => {
		const dir = contentDirWith('paths', {
			'temperature-scales.yaml': PATH_YAML.replace(
				"      en: 'Compose them.'",
				"      en: 'Compose them.'\n      es: 'Compónlas.'",
			).replace("  en: 'Temperature scales'", "  en: 'Temperature scales'\n  fr: 'Échelles'"),
		});
		expect(messagesOf(loadCollection(dir, 'paths').issues)).toEqual([
			"paths/temperature-scales.yaml: name.fr: only 'en' is authored inline — translations live in temperature-scales.<locale>.yaml",
			"paths/temperature-scales.yaml: steps.composing.body.es: only 'en' is authored inline — translations live in temperature-scales.<locale>.yaml",
		]);
	});

	it('rejects sidecar filenames with an unsupported locale', () => {
		const dir = contentDirWith('categories', {
			'physics.yaml': "name:\n  en: 'Physics'\norder: '2'\n",
			'physics.fr.yaml': "name: 'Physique'\n",
		});
		expect(messagesOf(loadCollection(dir, 'categories').issues)).toEqual([
			"categories/physics.fr.yaml: unknown locale 'fr' (supported: es)",
		]);
	});

	it('folds sidecar bytes into the content hash', () => {
		const files = {
			'physics.yaml': "name:\n  en: 'Physics'\norder: '2'\n",
			'physics.es.yaml': "name: 'Física'\n",
		};
		const base = loadContent(contentDirWith('categories', files)).contentHash;
		const edited = loadContent(
			contentDirWith('categories', { ...files, 'physics.es.yaml': "name: 'Fisica'\n" }),
		).contentHash;
		expect(edited).not.toBe(base);
	});
});

describe('translated-text findings', () => {
	it('name the sidecar the text came from, not the entity file', () => {
		const dir = contentDirWith('paths', {
			'temperature-scales.yaml': PATH_YAML,
			'temperature-scales.es.yaml': "steps:\n  composing:\n    body: 'Compónlas: $\\frac{1}$.'\n",
		});
		const { corpus, issues } = validateContent(loadContent(dir));
		expect(issues).toEqual([]);
		const findings = lintTex(corpus, new Set()).filter((entry) => entry.severity === 'error');
		expect(findings).toHaveLength(1);
		expect(findings[0]).toMatchObject({
			file: 'paths/temperature-scales.es.yaml',
			message: expect.stringMatching(/^steps\.composing\.body\.es /),
		});
	});
});

describe('inlineLocaleKeys', () => {
	it('addresses record entries by key and array items by id', () => {
		expect(
			inlineLocaleKeys(collectionLocaleTrees.equations, {
				name: { en: 'Leg', es: 'Cateto' },
				terms: { 'v_{0}': { kind: 'symbol', label: { en: 'Speed', fr: 'Vitesse' } } },
			}),
		).toEqual(['name.es', 'terms.v_{0}.label.fr']);
		expect(
			inlineLocaleKeys(collectionLocaleTrees.paths, {
				name: { en: 'Scales' },
				steps: [{ id: 'composing', kind: 'prose', body: { en: 'Compose.', es: 'Compón.' } }],
			}),
		).toEqual(['steps.composing.body.es']);
	});
});

describe('mergeSidecar', () => {
	it('returns new values and never mutates the entity', () => {
		const entity = { name: { en: 'Leg' }, terms: { a: { kind: 'symbol', label: { en: 'Leg' } } } };
		const snapshot = structuredClone(entity);
		const merged = mergeSidecar(
			collectionLocaleTrees.equations,
			entity,
			{ name: 'Cateto', terms: { a: { label: 'Cateto' } } },
			'es',
		);
		expect(merged.errors).toEqual([]);
		expect(entity).toEqual(snapshot);
		expect(merged.data).toEqual({
			name: { en: 'Leg', es: 'Cateto' },
			terms: { a: { kind: 'symbol', label: { en: 'Leg', es: 'Cateto' } } },
		});
	});
});

/**
 * Reads one sidecar the way a translator sees it: plain nested strings,
 * array items keyed by id.
 */
function readSidecar(relPath: string): Record<string, unknown> {
	return parseYaml(readFileSync(join(CONTENT_DIR, relPath), 'utf8'), {
		schema: 'failsafe',
	}) as Record<string, unknown>;
}

describe('migrated corpus round-trip', () => {
	const loaded = loadContent(CONTENT_DIR);
	const { corpus, issues } = validateContent(loaded);

	it('loads with no inline translation and no sidecar issue', () => {
		expect(messagesOf(loaded.issues.filter((entry) => entry.severity === 'error'))).toEqual([]);
		expect(issues).toEqual([]);
	});

	it('translates every path completely, with no path in the locale debt', () => {
		const { debt } = readLocaleDebt(PACKAGE_ROOT);
		for (const locale of TRANSLATION_LOCALES) {
			const isPath = (id: string): boolean => id.startsWith('paths/');
			expect(
				localeGaps(loaded, locale).filter((gap) => isPath(gap.id)),
				locale,
			).toEqual([]);
			expect((debt[locale] ?? []).filter(isPath), locale).toEqual([]);
		}
	});

	it('lands each sidecar string on the step with the same id', () => {
		for (const [slug, path] of corpus.paths) {
			const sidecar = readSidecar(`paths/${slug}.es.yaml`) as {
				name: string;
				steps: Record<string, Record<string, string>>;
			};
			expect(path.name.es).toBe(sidecar.name);
			for (const [id, fields] of Object.entries(sidecar.steps)) {
				const step = path.steps.find((candidate) => candidate.id === id) as
					| Record<string, { es?: string } | undefined>
					| undefined;
				expect(step, `${slug}.${id}`).toBeDefined();
				for (const [field, text] of Object.entries(fields)) {
					expect(step?.[field]?.es, `${slug}.${id}.${field}`).toBe(text);
				}
			}
		}
	});

	it('keeps the migrated equation symbol labels', () => {
		expect(corpus.equations.get('pythagorean-theorem')?.terms.c).toMatchObject({
			label: { en: 'Hypotenuse', es: 'Hipotenusa' },
		});
		expect(corpus.equations.get('area-circle')?.terms.r).toMatchObject({
			label: { en: 'Radius', es: 'Radio' },
		});
	});
});
