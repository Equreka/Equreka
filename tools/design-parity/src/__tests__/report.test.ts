import { describe, expect, it } from 'vitest';
import { buildReport, gatingSummary, type ScenarioResult } from '../report.js';

function scenario(view: string, gates: ScenarioResult['gates']): ScenarioResult {
	return {
		id: `${view}--desktop-light`,
		view,
		shell: 'desktop',
		theme: 'light',
		area: 'content',
		mode: gates.includes('full') ? 'full' : 'chrome',
		gates,
		diffPct: 0,
		diffPctRuns: [0],
		aboveFoldPctRuns: [0],
		fullPctRuns: [0],
		unstable: [],
		chromeDiffPct: 0,
		aboveFoldPct: 0,
		aboveFoldMaskedPct: 0,
		fullDiffPct: 0,
		regions: {},
		status: 'pass',
		note: '',
		sheets: [],
	};
}

describe('gatingSummary', () => {
	it('splits views by what gates their content', () => {
		expect(
			gatingSummary([
				scenario('settings', ['full']),
				scenario('unit', ['chrome', 'aboveFold']),
				scenario('unit', ['chrome', 'aboveFold']),
				scenario('search-open', ['chrome']),
			]),
		).toEqual({
			contentByFullPage: ['settings'],
			contentByAboveFold: ['unit'],
			contentByProbesOnly: ['search-open'],
		});
	});
});

describe('buildReport', () => {
	const input = {
		probes: [],
		probeErrors: [],
		partial: false,
		runs: 2,
		chromium: 'test',
		currentBuild: 'test',
		legacyUrl: 'legacy',
		currentUrl: 'current',
		thresholds: {
			pixelmatchThreshold: 0.1,
			scenarioMaxDiffPct: 1.5,
			aboveFoldMaxDiffPct: 0.1,
			probeLengthTolerancePx: 1,
			probeTolerantProperties: [],
		},
		waivers: [],
		blocked: new Set<string>(),
	};

	it('states how many views and scenarios are gated by pixels on content', () => {
		const report = buildReport({
			...input,
			scenarios: [
				scenario('settings', ['full']),
				scenario('unit', ['chrome', 'aboveFold']),
				scenario('search-open', ['chrome']),
			],
		});
		expect(report.summary).toContain(
			'content gated by pixels in 2 of 3 views and 2 of 3 scenarios (full page: 1 views, above the fold: 1), by probes only in 1 views and 1 scenarios (search-open)',
		);
		expect(report.pass).toBe(true);
	});

	it('never passes a run whose metrics drift between runs', () => {
		const drifting = { ...scenario('unit', ['chrome', 'aboveFold']), aboveFoldPctRuns: [0.5, 0.6] };
		const report = buildReport({ ...input, scenarios: [drifting] });
		expect(report.meta.deterministic).toBe(false);
		expect(report.summary).toContain('NON-DETERMINISTIC');
		expect(report.pass).toBe(false);
	});
});
