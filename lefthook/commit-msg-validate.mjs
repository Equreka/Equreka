import { readFileSync } from 'node:fs';

/**
 * Conventional Commits validator for the commit-msg hook.
 * Accepts: type(scope)!: subject — types limited to the set below.
 * Merge/revert/fixup commits pass through untouched.
 */
const TYPES = [
	'feat',
	'fix',
	'docs',
	'style',
	'refactor',
	'perf',
	'test',
	'build',
	'ci',
	'chore',
	'content',
];

const file = process.argv[2];
const message = readFileSync(file, 'utf8').split('\n')[0].trim();

const passthrough = /^(Merge|Revert|fixup!|squash!)/.test(message);
const pattern = new RegExp(`^(${TYPES.join('|')})(\\([a-z0-9,-]+\\))?!?: .{1,100}$`);

if (!passthrough && !pattern.test(message)) {
	console.error(`commit-msg: not Conventional Commits format: "${message}"`);
	console.error(`expected: type(scope)?: subject   types: ${TYPES.join('|')}`);
	process.exit(1);
}
