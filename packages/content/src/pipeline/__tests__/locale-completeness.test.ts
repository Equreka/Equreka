import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { compileContent } from '../compile.js';
import { loadContent } from '../load.js';
import {
	checkLocaleCompleteness,
	LOCALE_DEBT_FILE,
	type LocaleDebt,
	readLocaleDebt,
} from '../locale-completeness.js';
import type { Issue } from '../types.js';

const PACKAGE_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const CONTENT_DIR = join(PACKAGE_ROOT, 'content');

/** Equals the debt size; lower it in the same change that shrinks the debt, so the list can never grow back. */
const LOCALE_DEBT_CEILING = 87;

const dirs: string[] = [];

afterEach(() => {
	for (const dir of dirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

/**
 * A synthetic package root: `files` maps `<collection>/<file>.yaml` to its
 * body under `content/`, and `debt`, when given, becomes the debt file.
 */
function packageWith(files: Record<string, string>, debt?: unknown): string {
	const root = mkdtempSync(join(tmpdir(), 'equreka-locale-'));
	dirs.push(root);
	for (const [relPath, body] of Object.entries(files)) {
		const path = join(root, 'content', relPath);
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, body);
	}
	if (debt !== undefined) {
		writeFileSync(
			join(root, LOCALE_DEBT_FILE),
			typeof debt === 'string' ? debt : JSON.stringify(debt),
		);
	}
	return root;
}

function judge(files: Record<string, string>, debt: LocaleDebt = {}): Issue[] {
	return checkLocaleCompleteness(loadContent(join(packageWith(files), 'content')), debt).issues;
}

const messagesOf = (issues: readonly Issue[]): string[] =>
	issues.map((entry) => `${entry.file === '' ? '(corpus)' : entry.file}: ${entry.message}`);

const PHYSICS = {
	'categories/physics.yaml': [
		"name:\n  en: 'Physics'",
		"order: '2'",
		"description:\n  en: 'The science of matter.'",
		'',
	].join('\n'),
	'categories/physics.es.yaml': "name: 'Física'\ndescription: 'La ciencia de la materia.'\n",
};

const PYTHAGORAS = {
	'equations/pythagorean-theorem.yaml': [
		"name:\n  en: 'Pythagorean theorem'",
		"level: 'intro'",
		"expression: '\\var{a}^{2}+\\var{v_{0}}^{2}=\\var{c}^{2}'",
		'terms:',
		"  a:\n    kind: 'symbol'\n    label:\n      en: 'Leg'",
		"  v_{0}:\n    kind: 'symbol'\n    label:\n      en: 'Other leg'",
		"  c:\n    kind: 'symbol'\n    label:\n      en: 'Hypotenuse'",
		'',
	].join('\n'),
	'equations/pythagorean-theorem.es.yaml': [
		"name: 'Teorema de Pitágoras'",
		'terms:',
		"  a:\n    label: 'Cateto'",
		"  c:\n    label: 'Hipotenusa'",
		'',
	].join('\n'),
};

const TEMPERATURE_PATH = {
	'paths/temperature-scales.yaml': [
		"name:\n  en: 'Temperature scales'",
		"level: 'intro'",
		'steps:',
		"  - id: 'kelvin'\n    kind: 'entry'\n    ref:\n      collection: 'units'\n      slug: 'kelvin'",
		"  - id: 'composing'\n    kind: 'prose'\n    body:\n      en: 'Compose them.'",
		"  - id: 'check-boiling'\n    kind: 'check'\n    prompt:\n      en: 'Where does water boil?'\n    answer:\n      en: 'At 373.15 K.'",
		'',
	].join('\n'),
	'paths/temperature-scales.es.yaml': [
		"name: 'Escalas de temperatura'",
		'steps:',
		"  check-boiling:\n    prompt: '¿Dónde hierve el agua?'\n    answer: 'A 373.15 K.'",
		'',
	].join('\n'),
};

describe('locale completeness', () => {
	it('accepts an entity whose every English field has its translation', () => {
		expect(judge(PHYSICS)).toEqual([]);
	});

	it('names a missing description, at the sidecar the translation belongs in', () => {
		const issues = judge({
			...PHYSICS,
			'categories/physics.es.yaml': "name: 'Física'\n",
		});
		expect(messagesOf(issues)).toEqual([
			'categories/physics.es.yaml: incomplete es translation — missing: description',
		]);
		expect(issues[0]?.stage).toBe('locale');
	});

	it('judges an entity with no sidecar at all on every field it authors', () => {
		const issues = judge({ 'categories/physics.yaml': PHYSICS['categories/physics.yaml'] });
		expect(messagesOf(issues)).toEqual([
			'categories/physics.es.yaml: incomplete es translation — missing: name, description',
		]);
	});

	it('does not ask for a translation of an optional field the entity leaves out', () => {
		expect(
			judge({
				'categories/physics.yaml': "name:\n  en: 'Physics'\norder: '2'\n",
				'categories/physics.es.yaml': "name: 'Física'\n",
			}),
		).toEqual([]);
	});

	it('names a missing symbol-term label by its term key', () => {
		expect(messagesOf(judge(PYTHAGORAS))).toEqual([
			'equations/pythagorean-theorem.es.yaml: incomplete es translation — missing: terms.v_{0}.label',
		]);
	});

	it('names missing path step prose by step id', () => {
		expect(messagesOf(judge(TEMPERATURE_PATH))).toEqual([
			'paths/temperature-scales.es.yaml: incomplete es translation — missing: steps.composing.body',
		]);
	});

	it('lets the debt carry an incomplete entity and reports it as covered', () => {
		const root = packageWith(TEMPERATURE_PATH);
		const result = checkLocaleCompleteness(loadContent(join(root, 'content')), {
			es: ['paths/temperature-scales'],
		});
		expect(result.issues).toEqual([]);
		expect(result.coverage).toEqual([{ locale: 'es', total: 1, complete: 0, inDebt: 1 }]);
	});

	it('flags a debt entry whose entity is complete or does not exist as stale', () => {
		expect(messagesOf(judge(PHYSICS, { es: ['categories/physics', 'units/metre'] }))).toEqual([
			"(corpus): stale locale debt: remove 'categories/physics' from locale-debt.json es (its es translation is complete)",
			"(corpus): stale locale debt: remove 'units/metre' from locale-debt.json es (no such entity)",
		]);
	});

	it('requires the debt to be sorted and free of duplicates', () => {
		const files = {
			...TEMPERATURE_PATH,
			'categories/physics.yaml': PHYSICS['categories/physics.yaml'],
		};
		expect(
			messagesOf(judge(files, { es: ['paths/temperature-scales', 'categories/physics'] })),
		).toEqual([
			"(corpus): locale-debt.json es: entries must be sorted — 'categories/physics' comes after 'paths/temperature-scales'",
		]);
		expect(
			messagesOf(
				judge(files, {
					es: ['categories/physics', 'paths/temperature-scales', 'paths/temperature-scales'],
				}),
			),
		).toEqual(["(corpus): locale-debt.json es: duplicate entry 'paths/temperature-scales'"]);
	});

	it('counts coverage over authored entity files', () => {
		const result = checkLocaleCompleteness(
			loadContent(join(packageWith({ ...PHYSICS, ...PYTHAGORAS }), 'content')),
			{ es: ['equations/pythagorean-theorem'] },
		);
		expect(result.coverage).toEqual([{ locale: 'es', total: 2, complete: 1, inDebt: 1 }]);
	});
});

describe('readLocaleDebt', () => {
	it('reads a missing debt file as an empty debt', () => {
		expect(readLocaleDebt(packageWith({}))).toEqual({ debt: {}, issues: [] });
	});

	it('reports malformed JSON and an unknown locale instead of reading them as empty', () => {
		expect(messagesOf(readLocaleDebt(packageWith({}, '{ "es": [')).issues)).toEqual([
			expect.stringMatching(/^\(corpus\): locale-debt\.json: /),
		]);
		expect(messagesOf(readLocaleDebt(packageWith({}, { fr: ['units/metre'] })).issues)).toEqual([
			'(corpus): locale-debt.json: fr: Invalid key in record',
		]);
	});
});

describe('locale stage in the pipeline', () => {
	/**
	 * Metre takes kilo and micro; second takes kilo but has no Spanish, so
	 * the generated kilosecond has none either. Micrometre is a hand
	 * override whose English description has only the template-generated
	 * Spanish one the expansion would merge in.
	 */
	const PREFIXED = {
		'prefixes/kilo.yaml': "name:\n  en: 'Kilo'\nsymbol:\n  tex: 'k'\nvalue: '1e3'\n",
		'prefixes/kilo.es.yaml': "name: 'Kilo'\n",
		'prefixes/micro.yaml': "name:\n  en: 'Micro'\nsymbol:\n  tex: 'μ'\nvalue: '1e-6'\n",
		'prefixes/micro.es.yaml': "name: 'Micro'\n",
		'units/metre.yaml': [
			"name:\n  en: 'Metre'",
			"namePlural:\n  en: 'metres'",
			"symbol:\n  tex: 'm'",
			"unitOf:\n  - 'length'",
			"system: 'si'",
			"prefixes:\n  - 'kilo'\n  - 'micro'",
			'',
		].join('\n'),
		'units/metre.es.yaml': "name: 'Metro'\nnamePlural: 'metros'\n",
		'units/second.yaml': [
			"name:\n  en: 'Second'",
			"namePlural:\n  en: 'seconds'",
			"symbol:\n  tex: 's'",
			"unitOf:\n  - 'time'",
			"system: 'si'",
			"prefixes:\n  - 'kilo'",
			'',
		].join('\n'),
		'units/micrometre.yaml': [
			"name:\n  en: 'Micrometre'",
			"symbol:\n  tex: 'μm'",
			"unitOf:\n  - 'length'",
			"prefixOf:\n  prefix: 'micro'\n  base: 'metre'",
			"description:\n  en: 'Also called the micron.'",
			'',
		].join('\n'),
		'units/micrometre.es.yaml': "name: 'Micrómetro'\n",
	};

	it('judges overrides on what they author and never judges a generated unit', async () => {
		const root = packageWith(PREFIXED, { es: ['units/second'] });
		const report = await compileContent('check', { packageRoot: root, cacheDir: null });
		expect(report.generatedUnits).toContain('kilosecond');
		expect(report.overriddenUnits).toContain('micrometre');
		expect(report.corpus.units.get('micrometre')?.description?.es).toBeDefined();
		expect(messagesOf(report.issues.filter((entry) => entry.stage === 'locale'))).toEqual([
			'units/micrometre.es.yaml: incomplete es translation — missing: description',
		]);
		expect(report.locale).toEqual([{ locale: 'es', total: 5, complete: 3, inDebt: 1 }]);
	}, 60_000);
});

describe('real corpus', () => {
	const { debt, issues } = readLocaleDebt(PACKAGE_ROOT);

	it('reads the committed debt file cleanly', () => {
		expect(issues).toEqual([]);
	});

	it('produces no locale error with the committed debt', () => {
		expect(messagesOf(checkLocaleCompleteness(loadContent(CONTENT_DIR), debt).issues)).toEqual([]);
	});

	it('holds the debt at its ceiling, which only ever goes down', () => {
		const size = Object.values(debt).reduce((sum, ids) => sum + (ids?.length ?? 0), 0);
		expect(
			size,
			'the locale debt grew: translate the new entity instead of listing it',
		).toBeLessThanOrEqual(LOCALE_DEBT_CEILING);
		expect(size, `the locale debt shrank: lower LOCALE_DEBT_CEILING to ${size}`).toBe(
			LOCALE_DEBT_CEILING,
		);
	});
});
