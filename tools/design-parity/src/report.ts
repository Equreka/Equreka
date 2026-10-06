import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ShellId, Theme, Thresholds, Waiver } from './config.js';
import type { ProbeResult } from './probes.js';
import type { UnstableCapture } from './stability.js';

export type Gate = 'chrome' | 'aboveFold' | 'full';

export interface ScenarioResult {
	id: string;
	view: string;
	shell: ShellId;
	theme: Theme;
	area: 'chrome' | 'content' | 'interactive';
	mode: 'full' | 'chrome';
	gates: readonly Gate[];
	diffPct: number | null;
	diffPctRuns: (number | null)[];
	aboveFoldPctRuns: (number | null)[];
	fullPctRuns: (number | null)[];
	unstable: UnstableCapture[];
	chromeDiffPct: number | null;
	aboveFoldPct: number | null;
	aboveFoldMaskedPct: number | null;
	fullDiffPct: number | null;
	regions: Record<string, number | 'legacy-only' | 'current-only'>;
	status: 'pass' | 'fail' | 'error';
	note: string;
	sheets: string[];
}

export interface ProbeMismatch {
	area: string;
	probe: string;
	property: string;
	shell: ShellId;
	theme: Theme;
	legacy: string;
	current: string;
	waived?: string;
}

export interface Report {
	pass: boolean;
	summary: string;
	scenarios: ScenarioResult[];
	probeMismatches: ProbeMismatch[];
	meta: {
		partial: boolean;
		runs: number;
		deterministic: boolean;
		byteIdenticalCaptures: boolean;
		gating: GatingSummary;
		chromium: string;
		currentBuild: string;
		legacyUrl: string;
		currentUrl: string;
		thresholds: Thresholds;
		waivers: Waiver[];
		probeCount: number;
		probeErrors: string[];
		blockedRequests: string[];
	};
}

/**
 * Counts views, not variants: a view's content is gated by pixels when
 * its full page or its above-the-fold band gates it, and only by the
 * computed-style probes otherwise.
 */
export interface GatingSummary {
	contentByFullPage: string[];
	contentByAboveFold: string[];
	contentByProbesOnly: string[];
}

function constant(values: readonly (number | null)[]): boolean {
	return values.every((value) => value === values[0]);
}

export function gatingSummary(scenarios: readonly ScenarioResult[]): GatingSummary {
	const views = new Map<string, readonly Gate[]>();
	for (const scenario of scenarios) views.set(scenario.view, scenario.gates);
	const pick = (test: (gates: readonly Gate[]) => boolean) =>
		[...views.entries()].filter(([, gates]) => test(gates)).map(([view]) => view);
	return {
		contentByFullPage: pick((gates) => gates.includes('full')),
		contentByAboveFold: pick((gates) => gates.includes('aboveFold')),
		contentByProbesOnly: pick((gates) => !gates.includes('full') && !gates.includes('aboveFold')),
	};
}

export interface ReportInput {
	scenarios: ScenarioResult[];
	probes: ProbeResult[] | undefined;
	probeErrors: string[];
	partial: boolean;
	runs: number;
	chromium: string;
	currentBuild: string;
	legacyUrl: string;
	currentUrl: string;
	thresholds: Thresholds;
	waivers: Waiver[];
	blocked: Set<string>;
}

export function buildReport(input: ReportInput): Report {
	const probeMismatches: ProbeMismatch[] = (input.probes ?? [])
		.filter((result) => !result.match)
		.map(({ area, probe, property, shell, theme, legacy, current, waived }) => ({
			area,
			probe,
			property,
			shell,
			theme,
			legacy,
			current,
			...(waived === undefined ? {} : { waived }),
		}));
	const unwaived = probeMismatches.filter((mismatch) => mismatch.waived === undefined).length;
	const passing = input.scenarios.filter((scenario) => scenario.status === 'pass').length;
	const errors = input.scenarios.filter((scenario) => scenario.status === 'error').length;
	const deterministic = input.scenarios.every(
		(scenario) =>
			constant(scenario.diffPctRuns) &&
			constant(scenario.aboveFoldPctRuns) &&
			constant(scenario.fullPctRuns),
	);
	const byteIdenticalCaptures = input.scenarios.every((scenario) => scenario.unstable.length === 0);
	const gating = gatingSummary(input.scenarios);
	const variantsWith = (gate: Gate) =>
		input.scenarios.filter((scenario) => scenario.gates.includes(gate));
	const passingWith = (
		gate: Gate,
		value: (scenario: ScenarioResult) => number | null,
		max: number,
	) =>
		variantsWith(gate).filter((scenario) => {
			const measured = value(scenario);
			return measured !== null && measured <= max;
		}).length;
	const { scenarioMaxDiffPct, aboveFoldMaxDiffPct } = input.thresholds;
	const pixelGatedViews = gating.contentByFullPage.length + gating.contentByAboveFold.length;
	const gatedViews = pixelGatedViews + gating.contentByProbesOnly.length;
	const pixelGatedVariants = input.scenarios.filter(
		(scenario) => scenario.gates.includes('full') || scenario.gates.includes('aboveFold'),
	).length;
	const probesRan = input.probes !== undefined;
	const pass =
		!input.partial &&
		probesRan &&
		input.probeErrors.length === 0 &&
		passing === input.scenarios.length &&
		unwaived === 0 &&
		deterministic;
	const summary = [
		`${passing}/${input.scenarios.length} scenarios pass every gate`,
		`content gated by pixels in ${pixelGatedViews} of ${gatedViews} views and ${pixelGatedVariants} of ${input.scenarios.length} scenarios (full page: ${gating.contentByFullPage.length} views, above the fold: ${gating.contentByAboveFold.length}), by probes only in ${gating.contentByProbesOnly.length} views and ${input.scenarios.length - pixelGatedVariants} scenarios${gating.contentByProbesOnly.length > 0 ? ` (${gating.contentByProbesOnly.join(', ')})` : ''}`,
		`chrome ${passingWith('chrome', (scenario) => scenario.chromeDiffPct, scenarioMaxDiffPct)}/${variantsWith('chrome').length} within ${scenarioMaxDiffPct}%`,
		`aboveFold ${passingWith('aboveFold', (scenario) => scenario.aboveFoldPct, aboveFoldMaxDiffPct)}/${variantsWith('aboveFold').length} within ${aboveFoldMaxDiffPct}%`,
		`full page ${passingWith('full', (scenario) => scenario.fullDiffPct, scenarioMaxDiffPct)}/${variantsWith('full').length} within ${scenarioMaxDiffPct}%`,
		`${errors} errored`,
		probesRan
			? `${unwaived} unwaived probe mismatches (${probeMismatches.length - unwaived} waived) across ${input.probes?.length ?? 0} probed values`
			: 'probes skipped',
		`${input.runs} run(s), ${deterministic ? 'deterministic' : 'NON-DETERMINISTIC'}${input.runs > 1 ? (byteIdenticalCaptures ? ', captures byte-identical' : ', captures NOT byte-identical') : ''}`,
		input.partial ? 'partial run (filters applied): pass is never true' : 'full run',
	].join('; ');
	return {
		pass,
		summary,
		scenarios: input.scenarios,
		probeMismatches,
		meta: {
			partial: input.partial,
			runs: input.runs,
			deterministic,
			byteIdenticalCaptures,
			gating,
			chromium: input.chromium,
			currentBuild: input.currentBuild,
			legacyUrl: input.legacyUrl,
			currentUrl: input.currentUrl,
			thresholds: input.thresholds,
			waivers: input.waivers,
			probeCount: input.probes?.length ?? 0,
			probeErrors: input.probeErrors,
			blockedRequests: [...input.blocked].sort(),
		},
	};
}

function cell(value: string): string {
	return value.replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function markdown(report: Report): string {
	const lines = [
		'# Design parity report',
		'',
		`**${report.pass ? 'PASS' : 'FAIL'}**: ${report.summary}`,
		'',
		`Chromium ${report.meta.chromium}; legacy ${report.meta.legacyUrl}; current ${report.meta.currentUrl} (dist snapshot ${report.meta.currentBuild}).`,
		'',
		'## Scenarios',
		'',
		`Gated metrics are in bold. Chrome and full page gate at ${report.meta.thresholds.scenarioMaxDiffPct}%, aboveFold at ${report.meta.thresholds.aboveFoldMaxDiffPct}%; ungated numbers are informational.`,
		'',
		'| Scenario | Area | Gates | Chrome % | AboveFold % | Masked % | Full page % | Status | Note |',
		'| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- |',
		...report.scenarios.map((scenario) => {
			const show = (gate: Gate, value: number | null) =>
				value === null ? 'n/a' : scenario.gates.includes(gate) ? `**${value}**` : String(value);
			return `| ${scenario.id} | ${scenario.area} | ${scenario.gates.join(' + ')} | ${show('chrome', scenario.chromeDiffPct)} | ${show('aboveFold', scenario.aboveFoldPct)} | ${scenario.aboveFoldMaskedPct ?? 'n/a'} | ${show('full', scenario.fullDiffPct)} | ${scenario.status} | ${cell(scenario.note)} |`;
		}),
		'',
		'## Probe mismatches',
		'',
		'| Area | Probe | Property | Shell | Theme | Legacy | Current | Waived |',
		'| --- | --- | --- | --- | --- | --- | --- | --- |',
		...report.probeMismatches.map(
			(mismatch) =>
				`| ${mismatch.area} | ${mismatch.probe} | ${mismatch.property} | ${mismatch.shell} | ${mismatch.theme} | \`${cell(mismatch.legacy)}\` | \`${cell(mismatch.current)}\` | ${cell(mismatch.waived ?? '')} |`,
		),
		'',
	];
	const unstable = report.scenarios.flatMap((scenario) =>
		scenario.unstable.map(
			(capture) =>
				`- ${scenario.id} ${capture.app} ${capture.capture}: ${capture.unstableRuns} run(s) differ from run 1, worst ${capture.worst.pixels} px (max channel delta ${capture.worst.maxChannelDelta})${capture.worst.box === null ? '' : ` in ${capture.worst.box.width}x${capture.worst.box.height} at ${capture.worst.box.x},${capture.worst.box.y}`}`,
		),
	);
	if (unstable.length > 0) {
		lines.push('## Unstable captures', '', ...unstable, '');
	}
	if (report.meta.probeErrors.length > 0) {
		lines.push('## Probe errors', '', ...report.meta.probeErrors.map((error) => `- ${error}`), '');
	}
	if (report.meta.blockedRequests.length > 0) {
		lines.push(
			'## Blocked external requests',
			'',
			...report.meta.blockedRequests.map((request) => `- ${request}`),
			'',
		);
	}
	return lines.join('\n');
}

export function writeReport(outDir: string, report: Report): void {
	writeFileSync(join(outDir, 'report.json'), `${JSON.stringify(report, null, '\t')}\n`);
	writeFileSync(join(outDir, 'report.md'), markdown(report));
}
