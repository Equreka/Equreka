import assert from 'node:assert/strict';
import { lintFile, lintText } from './yaml-lint.mjs';

/**
 * Adversarial fixtures proving every yaml-lint rule fires (and stays quiet
 * on compliant shapes). Runs as part of `pnpm quality` so a lint-engine
 * regression fails the gate before the corpus lint runs.
 */
const CASES = [
	{
		name: 'multiline double-quoted scalar hides a TeX backslash on a continuation line',
		text: 'description:\n  en: "wrapped double-quoted prose\n    with $\\mu$ TeX inside"\n',
		expect: /backslash inside double-quoted scalar/,
	},
	{
		name: 'same-line double-quoted backslash',
		text: 'symbol:\n  tex: "\\mu"\n',
		expect: /backslash inside double-quoted scalar/,
	},
	{
		name: "list-item ' #' swallow (pi.yaml references style)",
		text: "references:\n  - title: A000796 # oeis id\n    url: 'http://oeis.org/A000796'\n",
		expect: /' #' inside a plain scalar/,
	},
	{
		name: "' #' swallow after a value containing an apostrophe",
		text: "description:\n  en: the circle's ratio # tail is silently dropped\n",
		expect: /' #' inside a plain scalar/,
	},
	{
		name: '%YAML directive',
		text: '%YAML 1.1\n---\nvalue: 0o777\n',
		expect: /YAML directive is banned/,
	},
	{
		name: '%TAG directive',
		text: '%TAG !e! tag:example.com,2026:\n---\nname: !e!x y\n',
		expect: /YAML directive is banned/,
	},
	{
		name: 'unquoted rational num/den',
		text: 'toBase:\n  factor:\n    num: 5\n    den: 9\n',
		expect: /unquoted numeric on a decimal-string field/,
	},
	{
		name: 'unquoted decimal value',
		text: "value: 3.14159265358979323846\nunit: 'unitless'\n",
		expect: /unquoted numeric on a decimal-string field/,
	},
	{
		name: 'clean file stays quiet',
		text: [
			'name:',
			"  en: 'Pi'",
			'symbol:',
			"  tex: '\\pi'",
			"value: '3.14159' # quoted value, real comment",
			'toBase:',
			'  factor:',
			"    num: '5'",
			"    den: '9'",
			'description:',
			'  en: >-',
			"    folded prose with an apostrophe: the circle's ratio, a # hash,",
			'    and $\\mu$ TeX are all data here.',
			'references:',
			"  - title: 'A000796'",
			"    url: 'http://oeis.org/A000796'",
			'',
		].join('\n'),
		expect: null,
	},
	{
		name: 'editor schema header comment stays quiet',
		text: "# yaml-language-server: $schema=../../dist/schemas/units.schema.json\nname:\n  en: 'Metre'\nvalue: '1'\n",
		expect: null,
	},
	{
		name: 'block literal body stays quiet',
		text: 'description:\n  en: |-\n    line one # not a comment\n    "quoted \\m inside prose"\nsystem: \'si\'\n',
		expect: null,
	},
	{
		name: 'wrapped single-quoted prose with doubled apostrophes stays quiet',
		text: "description:\n  en: 'a circle''s circumference # inside quotes,\n    wrapped to the next line.'\n",
		expect: null,
	},
];

const header = (schema) =>
	`# yaml-language-server: $schema=../../dist/schemas/${schema}.schema.json\n`;

/**
 * Per-file rules, which depend on where the file sits: the schema header
 * each file kind requires, and the inline-translation ban on entity files.
 */
const FILE_CASES = [
	{
		name: 'inline es key in an entity file',
		relPath: 'paths/si-base-units.yaml',
		text: `${header('paths')}name:\n  en: 'SI'\n  es: 'SI'\n`,
		expect: /inline translation key/,
	},
	{
		name: 'inline es key inside a flow mapping',
		relPath: 'equations/area-square.yaml',
		text: `${header('equations')}name: { en: 'Square area', es: 'Área del cuadrado' }\n`,
		expect: /inline translation key/,
	},
	{
		name: 'inline es key on a nested step field',
		relPath: 'paths/temperature-scales.yaml',
		text: `${header('paths')}steps:\n  - id: 'intro'\n    kind: 'prose'\n    body:\n      en: >-\n        Prose.\n      es: >-\n        Prosa.\n`,
		expect: /inline translation key/,
	},
	{
		name: 'es: inside block-scalar prose is data, not a key',
		relPath: 'paths/x.yaml',
		text: `${header('paths')}description:\n  en: >-\n    In Spanish the word is\n    es: a verb.\n`,
		expect: null,
	},
	{
		name: 'missing schema header',
		relPath: 'units/metre.yaml',
		text: "name:\n  en: 'Metre'\n",
		expect: /first line must be the schema header/,
	},
	{
		name: 'sidecar pointing at the entity schema',
		relPath: 'paths/si-base-units.es.yaml',
		text: `${header('paths')}name: 'Las siete unidades base del SI'\n`,
		expect: /paths\.locale\.schema\.json/,
	},
	{
		name: 'sidecar with a double-quoted TeX scalar',
		relPath: 'paths/si-base-units.es.yaml',
		text: `${header('paths.locale')}steps:\n  metre:\n    note: "Lo fija $\\mu$"\n`,
		expect: /backslash inside double-quoted scalar/,
	},
	{
		name: 'compliant sidecar with a Windows-style path stays quiet',
		relPath: 'equations\\pythagorean-theorem.es.yaml',
		text: `${header('equations.locale')}terms:\n  a:\n    label: 'Cateto'\n`,
		expect: null,
	},
];

let failures = 0;
const cases = [
	...CASES.map((entry) => ({ ...entry, run: () => lintText(entry.text) })),
	...FILE_CASES.map((entry) => ({ ...entry, run: () => lintFile(entry.relPath, entry.text) })),
];
for (const { name, run, expect } of cases) {
	const violations = run();
	try {
		if (expect === null) {
			assert.equal(
				violations.length,
				0,
				`expected no violations, got: ${violations.map((v) => v.message).join('; ')}`,
			);
		} else {
			assert.ok(
				violations.some((v) => expect.test(v.message)),
				`expected a violation matching ${expect}, got: ${
					violations.length === 0 ? '(none)' : violations.map((v) => v.message).join('; ')
				}`,
			);
		}
		console.log(`ok    ${name}`);
	} catch (error) {
		failures += 1;
		console.error(`FAIL  ${name}\n      ${error.message}`);
	}
}

if (failures > 0) {
	console.error(`yaml-lint selftest: ${failures} failure(s)`);
	process.exit(1);
}
console.log(`yaml-lint selftest: ok (${cases.length} cases)`);
