import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Idempotent bootstrap: copies envs/<name>/.env.example → .env unless one
 * already exists. Usage: node scripts/env/init-env.mjs development
 */
const name = process.argv[2] ?? 'development';
const dir = join(process.cwd(), 'envs', name);
const example = join(dir, '.env.example');
const target = join(dir, '.env');

if (!existsSync(example)) {
	console.error(`env:init: no ${example}`);
	process.exit(1);
}
if (existsSync(target)) {
	console.log(`env:init: ${target} already exists, leaving untouched`);
} else {
	copyFileSync(example, target);
	console.log(`env:init: created ${target}`);
}
