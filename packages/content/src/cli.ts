import { compileContent } from './pipeline/compile.js';

const command = process.argv[2];
if (command !== 'build' && command !== 'check') {
	console.error('usage: equreka-content <build | check>');
	process.exit(2);
}

const report = compileContent(command);

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
console.log(`content hash ${report.contentHash.slice(0, 12)}…`);
for (const [slug, verification] of report.verifications) {
	const solved = Object.entries(verification.samples)
		.map(([key, samples]) => `${key}×${samples}`)
		.join(' ');
	if (solved !== '') {
		console.log(`verified ${slug}: ${solved}${verification.cached ? ' (cached)' : ''}`);
	}
}
if (report.mode === 'build') {
	for (const artifact of report.artifacts) {
		console.log(`dist/${artifact.relPath} ${(artifact.bytes / 1024).toFixed(1)}KB`);
	}
}
console.log(`${errorCount} error(s), ${warningCount} warning(s) — ${report.ok ? 'ok' : 'FAILED'}`);
process.exit(report.ok ? 0 : 1);
