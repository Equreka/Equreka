import { APPS, type App } from './config.js';

export interface SkippedStep {
	action: string;
	selector: string;
	reason: string;
}

/**
 * The part of a capture manifest that decides whether the scenario can
 * be measured. `skipped` is optional because manifests written before it
 * existed (re-read by `--skip-capture`) lack it.
 */
export interface CaptureOutcome {
	error?: string;
	full?: string;
	skipped?: SkippedStep[];
}

export function describeSkip(step: SkippedStep): string {
	return `${step.action} ${step.selector} (${step.reason})`;
}

/**
 * Every scenario is gated, and the port is the side under test, so a
 * current-side setup step that did not complete, `optional` or not,
 * means the page is not in the state the scenario names. A skipped
 * `optional` step of the original is no failure: that is how a scenario
 * records a control the original lacks, and it stays a note.
 */
export function skippedStepFailures(app: App, skipped: readonly SkippedStep[]): string[] {
	if (app === 'legacy') return [];
	return skipped.map((step) => `current: step not completed, ${describeSkip(step)}`);
}

/**
 * Reasons a scenario is an error instead of a measurement.
 */
export function captureFailures(outcomes: Record<App, CaptureOutcome>): string[] {
	return APPS.flatMap((app) => {
		const outcome = outcomes[app];
		if (outcome.error !== undefined) return [`${app}: ${outcome.error}`];
		return [
			...(outcome.full === undefined ? [`${app}: no full-page capture`] : []),
			...skippedStepFailures(app, outcome.skipped ?? []),
		];
	});
}
