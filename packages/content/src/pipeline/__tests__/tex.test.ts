import { describe, expect, it } from 'vitest';
import { stripTexForSearch } from '../tex.js';

describe('stripTexForSearch', () => {
	it('folds hard line breaks and paragraph breaks to single spaces', () => {
		expect(stripTexForSearch('in use.\n- $M$ is used\n\nBecause')).toBe(
			'in use. - is used Because',
		);
	});

	it('never glues the words on either side of a break that follows math', () => {
		expect(stripTexForSearch('squared $(\\const{c}^{2})$.\nBecause')).toBe('squared . Because');
		expect(stripTexForSearch('mass\n$$E$$\nenergy')).toBe('mass energy');
	});
});
