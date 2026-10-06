import { type ChildProcess, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { RuntimeConfig } from './config.js';

const LEGACY_BOOT_TIMEOUT_MS = 300_000;
const CURRENT_BOOT_TIMEOUT_MS = 30_000;
const POLL_MS = 1_000;

async function reachable(url: string): Promise<boolean> {
	try {
		const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(5_000) });
		return response.status < 500;
	} catch {
		return false;
	}
}

async function waitUntilReachable(url: string, timeoutMs: number, child: ChildProcess) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (child.exitCode !== null) {
			throw new Error(`server for ${url} exited with code ${child.exitCode}`);
		}
		if (await reachable(url)) return;
		await new Promise((done) => setTimeout(done, POLL_MS));
	}
	throw new Error(`server for ${url} not reachable after ${timeoutMs} ms`);
}

function isInside(child: string, parent: string): boolean {
	const path = relative(parent, child);
	return path === '' || (!path.startsWith('..') && !path.includes(':'));
}

/**
 * Nuxt dev writes `.nuxt/` into its working directory, so it only ever
 * runs from a scratch copy: the original repository stays untouched.
 */
function spawnLegacy(config: RuntimeConfig): ChildProcess {
	const dir = config.legacyDir;
	if (dir === undefined) {
		throw new Error(
			`legacy app not reachable at ${config.legacyUrl}; set LEGACY_DIR to an installed scratch copy (README.md)`,
		);
	}
	if (isInside(dir, config.originalLegacyDir)) {
		throw new Error(`LEGACY_DIR points at the original repository (${dir}); use a scratch copy`);
	}
	const nuxtBin = join(dir, 'node_modules', 'nuxt', 'bin', 'nuxt.js');
	if (!existsSync(nuxtBin)) {
		throw new Error(`${nuxtBin} missing; run npm ci --legacy-peer-deps in the scratch copy`);
	}
	return spawn(
		process.execPath,
		[nuxtBin, 'dev', '--port', String(config.legacyPort), '--hostname', '127.0.0.1'],
		{
			cwd: dir,
			env: { ...process.env, NODE_OPTIONS: '--openssl-legacy-provider' },
			stdio: 'ignore',
			windowsHide: true,
		},
	);
}

/**
 * Other work may rebuild apps/web/dist while a run is in flight, which
 * would mix two builds in one report. Every run copies dist once and
 * serves that frozen snapshot; the build id names what was measured.
 * `reuse` serves the previous run's snapshot untouched, so a re-diff of
 * existing captures probes the same build they were taken from.
 */
function snapshotDist(config: RuntimeConfig, reuse: boolean): { dir: string; buildId: string } {
	const dir = join(config.outDir, 'dist-snapshot');
	if (reuse) {
		if (!existsSync(join(dir, 'index.html'))) {
			throw new Error(`${dir} missing; run once without --skip-capture`);
		}
	} else {
		const source = join(config.repoRoot, 'apps', 'web', 'dist');
		if (!existsSync(join(source, 'index.html'))) {
			throw new Error('apps/web/dist missing; run pnpm --filter web build first');
		}
		rmSync(dir, { recursive: true, force: true });
		cpSync(source, dir, { recursive: true });
	}
	const hash = createHash('sha256');
	hash.update(readFileSync(join(dir, 'index.html')));
	for (const asset of readdirSync(join(dir, '_astro')).sort()) hash.update(asset);
	return { dir, buildId: hash.digest('hex').slice(0, 12) };
}

function spawnCurrent(config: RuntimeConfig, dir: string): ChildProcess {
	return spawn(
		process.execPath,
		[
			join(config.repoRoot, 'apps', 'web', 'scripts', 'serve-dist.mjs'),
			String(config.currentPort),
			dir,
		],
		{ stdio: 'ignore', windowsHide: true },
	);
}

export interface Servers {
	currentBuild: string;
	stop: () => void;
}

/**
 * The current app is always served by this run from its own snapshot,
 * so its port must be free. The legacy server is reused when it already
 * answers (it takes minutes to boot); the stop function only kills what
 * this run started.
 */
export async function ensureServers(
	config: RuntimeConfig,
	reuseSnapshot: boolean,
): Promise<Servers> {
	if (await reachable(`${config.currentUrl}/`)) {
		throw new Error(
			`port ${config.currentPort} is busy; stop that server or set CURRENT_PORT (the harness serves its own dist snapshot)`,
		);
	}
	const started: ChildProcess[] = [];
	const stop = () => {
		for (const child of started) child.kill();
	};
	try {
		const snapshot = snapshotDist(config, reuseSnapshot);
		const current = spawnCurrent(config, snapshot.dir);
		started.push(current);
		await waitUntilReachable(`${config.currentUrl}/`, CURRENT_BOOT_TIMEOUT_MS, current);
		if (!(await reachable(`${config.legacyUrl}/`))) {
			const legacy = spawnLegacy(config);
			started.push(legacy);
			await waitUntilReachable(`${config.legacyUrl}/`, LEGACY_BOOT_TIMEOUT_MS, legacy);
		}
		return { currentBuild: snapshot.buildId, stop };
	} catch (error) {
		stop();
		throw error;
	}
}
