import assert from 'node:assert/strict';
import { lintText } from './yaml-lint.mjs';

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

let failures = 0;
for (const { name, text, expect } of CASES) {
	const violations = lintText(text);
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
console.log(`yaml-lint selftest: ok (${CASES.length} cases)`);
