import { describe, expect, it } from 'vitest';
import { captureFailures, type SkippedStep, skippedStepFailures } from '../failures.js';

const skip: SkippedStep = {
	action: 'waitFor',
	selector: '.eq-tool-value',
	reason: 'not visible within 10000 ms',
};

describe('captureFailures', () => {
	it('measures a scenario whose steps all completed', () => {
		expect(captureFailures({ legacy: { full: 'l.png' }, current: { full: 'c.png' } })).toEqual([]);
	});

	it('makes a skipped current-side step an error, even an optional one', () => {
		expect(
			captureFailures({
				legacy: { full: 'l.png', skipped: [] },
				current: { full: 'c.png', skipped: [skip] },
			}),
		).toEqual([
			'current: step not completed, waitFor .eq-tool-value (not visible within 10000 ms)',
		]);
	});

	it('keeps a skipped optional step of the original a note, not an error', () => {
		expect(
			captureFailures({
				legacy: { full: 'l.png', skipped: [{ ...skip, action: 'click', selector: '.toggle' }] },
				current: { full: 'c.png', skipped: [] },
			}),
		).toEqual([]);
	});

	it('reports a step that timed out and threw as the capture error', () => {
		expect(
			captureFailures({
				legacy: { full: 'l.png' },
				current: { error: 'waitFor .eq-calc-result: not visible within 10000 ms' },
			}),
		).toEqual(['current: waitFor .eq-calc-result: not visible within 10000 ms']);
	});

	it('treats a missing full-page capture as an error', () => {
		expect(captureFailures({ legacy: {}, current: { full: 'c.png' } })).toEqual([
			'legacy: no full-page capture',
		]);
	});
});

describe('skippedStepFailures', () => {
	it('fails probes only on the side under test', () => {
		expect(skippedStepFailures('legacy', [skip])).toEqual([]);
		expect(skippedStepFailures('current', [skip])).toHaveLength(1);
	});
});
