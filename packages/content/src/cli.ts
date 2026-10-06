import { compileContent } from './pipeline/compile.js';
import { MOBILE_BUNDLE_BUDGET_BYTES, mobileBundledBytes } from './pipeline/emit.js';

function formatBytes(bytes: number): string {
	return bytes >= 1024 * 1024
		? `${(bytes / (1024 * 1024)).toFixed(2)} MiB`
		: `${(bytes / 1024).toFixed(1)} KiB`;
}

function percentOf(bytes: number, maxBytes: number): string {
	return `${((bytes / maxBytes) * 100).toFixed(1)}%`;
}

const command = process.argv[2];
if (command !== 'build' && command !== 'check') {
	console.error('usage: equreka-content <build | check>');
	process.exit(2);
}

const report = await compileContent(command);

for (const entry of report.issues) {
	const location = entry.file === '' ? '(corpus)' : entry.file;
	const line = `[${entry.stage}] ${location}: ${entry.message}`;
	if (entry.severity === 'error') {
		console.error(`error ${line}`);
	} else {
		console.warn(`warn  ${line}`);
	}
}

const errorCount = report.issues.filter((entry) => entry.severity === 'error').length;
const warningCount = report.issues.length - errorCount;
const total = Object.values(report.counts).reduce((sum, count) => sum + count, 0);
const countSummary = Object.entries(report.counts)
	.map(([collection, count]) => `${collection} ${count}`)
	.join(', ');

console.log(`@equreka/content ${command}: ${total} entities (${countSummary})`);
console.log(
	`prefix expansion: ${report.generatedUnits.size + report.overriddenUnits.size} prefixed units (${report.generatedUnits.size} generated, ${report.overriddenUnits.size} hand overrides)`,
);
for (const coverage of report.locale) {
	console.log(
		`locale ${coverage.locale}: ${coverage.complete}/${coverage.total} authored entities complete, ${coverage.inDebt} in debt`,
	);
}
console.log(`content hash ${report.contentHash.slice(0, 12)}…`);
const nonAlgebraic = [...report.corpus.equations.values()].filter(
	(equation) => !equation.algebraic,
).length;
console.log(
	`equations: ${report.corpus.equations.size} (${nonAlgebraic} non-algebraic: rendered and linted, never solved or parsed by the verifier)`,
);
for (const [slug, verification] of report.verifications) {
	const solved = Object.entries(verification.samples)
		.map(([key, samples]) => `${key}×${samples.join('/')}`)
		.join(' ');
	if (solved !== '') {
		console.log(`verified ${slug}: ${solved}${verification.cached ? ' (cached)' : ''}`);
	}
}
console.log(
	`math: ${report.math.uniqueTex} unique TeX, ${report.math.glyphs} glyphs ` +
		`(${report.math.rendered} rendered, ${report.math.cached} cached)`,
);
if (report.mode === 'build' && report.artifacts.length > 0) {
	const pathWidth = Math.max(...report.artifacts.map((artifact) => artifact.relPath.length));
	for (const artifact of report.artifacts) {
		const share =
			artifact.budget === undefined
				? 'unclassified'
				: artifact.budget.maxBytes === null
					? 'build-only'
					: `${percentOf(artifact.bytes, artifact.budget.maxBytes)} of ${formatBytes(artifact.budget.maxBytes)}`;
		const scope = artifact.budget?.mobileBundled === true ? ' · mobile' : '';
		console.log(
			`dist/${artifact.relPath.padEnd(pathWidth)} ${formatBytes(artifact.bytes).padStart(10)}  gzip ${formatBytes(artifact.gzipBytes).padStart(10)}  ${share}${scope}`,
		);
	}
	const mobileBytes = mobileBundledBytes(report.artifacts);
	console.log(
		`mobile-bundled total: ${formatBytes(mobileBytes)} of ${formatBytes(MOBILE_BUNDLE_BUDGET_BYTES)} (${percentOf(mobileBytes, MOBILE_BUNDLE_BUDGET_BYTES)})`,
	);
}
console.log(`${errorCount} error(s), ${warningCount} warning(s) — ${report.ok ? 'ok' : 'FAILED'}`);
process.exit(report.ok ? 0 : 1);
