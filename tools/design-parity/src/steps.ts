import type { Page } from 'playwright-core';
import { settle } from './browser.js';
import type { ShellId, Step } from './config.js';

const STEP_TIMEOUT_MS = 10_000;
const TYPE_DELAY_MS = 60;

/**
 * Runs the setup steps of one side of a scenario. A missing element on
 * an `optional` step is a recorded note, not a failure: it is how a
 * scenario states "the original has this control, the port may not".
 */
export async function runSteps(
	page: Page,
	steps: readonly Step[],
	shell: ShellId,
): Promise<string[]> {
	const notes: string[] = [];
	for (const step of steps) {
		if (step.shells !== undefined && !step.shells.includes(shell)) continue;
		const locator =
			'nth' in step && step.nth !== undefined
				? page.locator(step.selector).nth(step.nth)
				: page.locator(step.selector).first();
		try {
			await locator.waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
		} catch {
			if (step.optional === true) {
				notes.push(`skipped ${step.action} ${step.selector} (not visible)`);
				continue;
			}
			throw new Error(`${step.action} ${step.selector}: element not visible`);
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
	return notes;
}
