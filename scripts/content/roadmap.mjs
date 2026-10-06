import { join } from 'node:path';
import {
	CONTENT_ROOT,
	entryKey,
	isDone,
	readEntityFacts,
	readRoadmap,
	waveArgs,
	waveSummary,
} from './lib/roadmap-model.mjs';

/**
 * Content roadmap CLI (docs/content/README.md). Every progress number is
 * computed from packages/content/content at run time; roadmap.yaml stores
 * the plan only.
 */
const USAGE = [
	'usage: node scripts/content/roadmap.mjs <mode>',
	'  --wave <id> [--json]        remaining items of a wave, grouped by slice (Workflow args)',
	'  --status [--json]           per-wave progress table',
	'  --entry <collection>/<slug> computed facts of one entity (words, es completeness, done)',
].join('\n');

const root = process.cwd();
const contentRoot = join(root, CONTENT_ROOT);

function factsCache() {
	const cache = new Map();
	return (entry) => {
		const key = entryKey(entry);
		if (!cache.has(key)) cache.set(key, readEntityFacts(contentRoot, entry.collection, entry.slug));
		return cache.get(key);
	};
}

function printWave(args) {
	console.log(`${args.wave.id} — ${args.wave.title} (milestone ${args.wave.milestone})`);
	const s = args.summary;
	console.log(
		`  ${s.remaining} remaining · ${s.done} done · ${s.deferred} deferred · ${s.blocked} blocked · ${s.total} total`,
	);
	for (const slice of args.slices) {
		console.log(`\n[${slice.id}] ${slice.title} — ${slice.items.length} item(s)`);
		for (const item of slice.items) {
			const flags = item.flags.length > 0 ? ` [${item.flags.join(' ')}]` : '';
			const level = item.level === undefined ? '' : ` (${item.level})`;
			console.log(`  ${item.action.padEnd(7)} ${item.collection}/${item.slug}${level}${flags}`);
			if (item.edits !== undefined) console.log(`          also edits ${item.edits.join(', ')}`);
		}
	}
}

function printStatus(rows) {
	const header = [
		'wave',
		'total',
		'done',
		'remaining',
		'deferred',
		'blocked',
		'reviewed',
		'esGaps',
		'short',
	];
	const lines = [header, ...rows.map((row) => header.map((column) => String(row[column])))];
	const widths = header.map((_, index) => Math.max(...lines.map((line) => line[index].length)));
	for (const line of lines) {
		const cells = line.map((cell, index) =>
			index === 0 ? cell.padEnd(widths[index]) : cell.padStart(widths[index]),
		);
		console.log(cells.join('  '));
	}
}

function main(argv) {
	const json = argv.includes('--json');
	const roadmap = readRoadmap(root);
	const factsOf = factsCache();
	const waveFlag = argv.indexOf('--wave');
	if (waveFlag !== -1) {
		const waveId = argv[waveFlag + 1];
		if (waveId === undefined) throw new Error('--wave needs an id');
		const args = waveArgs(roadmap, waveId, factsOf);
		if (json) console.log(JSON.stringify(args, null, 2));
		else printWave(args);
		return;
	}
	if (argv.includes('--status')) {
		const rows = roadmap.waves.map((wave) => ({
			wave: wave.id,
			...waveSummary(
				roadmap.entries.filter((entry) => entry.wave === wave.id),
				factsOf,
			),
		}));
		const total = waveSummary(roadmap.entries, factsOf);
		if (json) console.log(JSON.stringify({ waves: rows, total }, null, 2));
		else printStatus([...rows, { wave: 'all', ...total }]);
		return;
	}
	const entryFlag = argv.indexOf('--entry');
	if (entryFlag !== -1) {
		const key = argv[entryFlag + 1] ?? '';
		const [collection, slug] = key.split('/');
		const facts = readEntityFacts(contentRoot, collection, slug);
		const entry = roadmap.entries.find((candidate) => entryKey(candidate) === key);
		const report = {
			key,
			roadmap:
				entry === undefined
					? null
					: { action: entry.action, wave: entry.wave, slice: entry.slice, state: entry.state },
			...facts,
			...(entry === undefined ? {} : { done: isDone(entry, facts) }),
		};
		console.log(JSON.stringify(report, null, 2));
		return;
	}
	console.error(USAGE);
	process.exit(2);
}

try {
	main(process.argv.slice(2));
} catch (error) {
	console.error(`roadmap: ${error.message}`);
	process.exit(2);
}
