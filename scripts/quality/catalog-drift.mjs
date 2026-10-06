import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Fails when any workspace package.json declares a dependency version
 * inline for a package that exists in the pnpm catalog — those must use
 * "catalog:" so pnpm-workspace.yaml stays the single version SSOT.
 * catalogMode:strict covers `pnpm add`; this covers manual edits.
 */
const root = process.cwd();

const workspaceYaml = readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8');
const catalogSection = workspaceYaml.split(/^catalog:/m)[1]?.split(/^\S/m)[0] ?? '';
const catalogNames = [...catalogSection.matchAll(/^ {2}'?([@a-z0-9/._-]+)'?:/gim)].map((m) => m[1]);

const manifests = [];
for (const dir of ['apps', 'packages', 'tools']) {
	let entries = [];
	try {
		entries = readdirSync(join(root, dir));
	} catch {
		continue;
	}
	for (const entry of entries) {
		const manifest = join(root, dir, entry, 'package.json');
		try {
			statSync(manifest);
			manifests.push(manifest);
		} catch {}
	}
}

const violations = [];
for (const manifest of manifests) {
	const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
	for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) {
		for (const [name, version] of Object.entries(pkg[section] ?? {})) {
			if (
				catalogNames.includes(name) &&
				!String(version).startsWith('catalog:') &&
				!String(version).startsWith('workspace:')
			) {
				violations.push(`${manifest} → ${section}.${name}: "${version}" (use "catalog:")`);
			}
		}
	}
}

if (violations.length > 0) {
	console.error(`catalog-drift: ${violations.length} violation(s):`);
	for (const violation of violations) console.error(`  ${violation}`);
	process.exit(1);
}
console.log(
	`catalog-drift: ok (${manifests.length} manifests, ${catalogNames.length} catalog entries)`,
);
