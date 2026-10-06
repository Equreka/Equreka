import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	CONTENT_ROOT,
	listContent,
	readRoadmap,
	validateRoadmap,
} from '../content/lib/roadmap-model.mjs';

/**
 * Structural gate for docs/content/roadmap.yaml: offline, filename-only (no
 * content parse), so it stays fast inside `pnpm quality`. Progress is never
 * checked here; a create whose file exists is simply done.
 */
function main() {
	const root = process.cwd();
	const roadmap = readRoadmap(root);
	const errors = validateRoadmap(roadmap, listContent(join(root, CONTENT_ROOT)));
	if (errors.length > 0) {
		console.error(`roadmap-check: ${errors.length} violation(s):`);
		for (const error of errors) console.error(`  ${error}`);
		process.exit(1);
	}
	console.log(
		`roadmap-check: ok (${roadmap.entries.length} entries, ${roadmap.waves.length} waves)`,
	);
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main();
}
