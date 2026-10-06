import type { Page } from 'playwright-core';
import { settle } from './browser.js';
import type { ShellId, Step } from './config.js';
import type { SkippedStep } from './failures.js';

const STEP_TIMEOUT_MS = 10_000;
const TYPE_DELAY_MS = 60;

/**
 * Runs the setup steps of one side of a scenario and returns the
 * `optional` steps whose element never became visible. A non-optional
 * step that times out throws. Whether a skip is a note or an error is
 * decided by `captureFailures`, not here.
 */
export async function runSteps(
	page: Page,
	steps: readonly Step[],
	shell: ShellId,
): Promise<SkippedStep[]> {
	const skipped: SkippedStep[] = [];
	for (const step of steps) {
		if (step.shells !== undefined && !step.shells.includes(shell)) continue;
		const locator =
			'nth' in step && step.nth !== undefined
				? page.locator(step.selector).nth(step.nth)
				: page.locator(step.selector).first();
		try {
			await locator.waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
		} catch {
			const reason = `not visible within ${STEP_TIMEOUT_MS} ms`;
			if (step.optional === true) {
				skipped.push({ action: step.action, selector: step.selector, reason });
				continue;
			}
			throw new Error(`${step.action} ${step.selector}: ${reason}`);
		}
		switch (step.action) {
			case 'click':
				await locator.click();
				break;
			case 'hover':
				await locator.hover();
				break;
			case 'type':
				await locator.click();
				await locator.pressSequentially(step.text, { delay: TYPE_DELAY_MS });
				break;
			case 'waitFor':
				break;
		}
		await settle(page);
	}
	return skipped;
}
