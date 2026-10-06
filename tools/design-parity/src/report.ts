import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ShellId, Theme, Thresholds, Waiver } from './config.js';
import type { ProbeResult } from './probes.js';

export interface ScenarioResult {
	id: string;
	view: string;
	shell: ShellId;
	theme: Theme;
	area: 'chrome' | 'content' | 'interactive';
	mode: 'full' | 'chrome';
	diffPct: number | null;
	diffPctRuns: (number | null)[];
	chromeDiffPct: number | null;
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
	const measured = input.scenarios.flatMap((scenario) =>
		scenario.diffPct === null ? [] : [scenario.diffPct],
	);
	const meanDiff =
		measured.length === 0 ? 0 : measured.reduce((sum, value) => sum + value, 0) / measured.length;
	const deterministic = input.scenarios.every((scenario) =>
		scenario.diffPctRuns.every((value) => value === scenario.diffPctRuns[0]),
	);
	const probesRan = input.probes !== undefined;
	const pass =
		!input.partial &&
		probesRan &&
		input.probeErrors.length === 0 &&
		passing === input.scenarios.length &&
		unwaived === 0;
	const summary = [
		`${passing}/${input.scenarios.length} scenarios within ${input.thresholds.scenarioMaxDiffPct}%`,
		`${errors} errored`,
		`mean diff ${meanDiff.toFixed(3)}%`,
		probesRan
			? `${unwaived} unwaived probe mismatches (${probeMismatches.length - unwaived} waived) across ${input.probes?.length ?? 0} probed values`
			: 'probes skipped',
		`${input.runs} run(s), ${deterministic ? 'deterministic' : 'NON-DETERMINISTIC'}`,
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
		'| Scenario | Area | Mode | Diff % | Chrome % | Status | Note |',
		'| --- | --- | --- | ---: | ---: | --- | --- |',
		...report.scenarios.map(
			(scenario) =>
				`| ${scenario.id} | ${scenario.area} | ${scenario.mode} | ${scenario.diffPct ?? 'n/a'} | ${scenario.chromeDiffPct ?? 'n/a'} | ${scenario.status} | ${cell(scenario.note)} |`,
		),
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
