import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

/**
 * Optional Hermes parity gate (`pnpm --filter @equreka/engine test:hermes`):
 * bundles the engine plus scripts/hermes-smoke-entry.ts into one CJS file
 * and, when a `hermes` binary is already on PATH, executes it there. Without
 * the binary it prints a skip notice and exits 0 — the Hermes toolchain is
 * never downloaded and no native dependency is added.
 */
const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const outDir = mkdtempSync(join(tmpdir(), 'equreka-hermes-'));
const outFile = join(outDir, 'engine-smoke.cjs');

try {
	await build({
		entryPoints: [join(packageRoot, 'scripts', 'hermes-smoke-entry.ts')],
		bundle: true,
		format: 'cjs',
		platform: 'neutral',
		target: 'es2015',
		outfile: outFile,
		logLevel: 'warning',
	});

	const probe = spawnSync('hermes', ['--version'], { encoding: 'utf8', shell: false });
	if (probe.error !== undefined || probe.status !== 0) {
		console.log('hermes-smoke: SKIPPED — no hermes binary on PATH (bundle built fine).');
		process.exit(0);
	}

	const run = spawnSync('hermes', [outFile], { encoding: 'utf8', shell: false });
	if (run.stdout) process.stdout.write(run.stdout);
	if (run.stderr) process.stderr.write(run.stderr);
	if (run.status !== 0) {
		console.error(`hermes-smoke: FAILED (hermes exited ${run.status})`);
		process.exit(run.status ?? 1);
	}
	console.log('hermes-smoke: ok');
} finally {
	rmSync(outDir, { recursive: true, force: true });
}
