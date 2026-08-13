import { engineSlice } from '@equreka/schema';
import { describe, expect, it } from 'vitest';
import { HAND_SLICE } from './hand-slice.js';

describe('hand-built slice', () => {
	it('conforms to the engineSlice contract', () => {
		const parsed = engineSlice.safeParse(HAND_SLICE);
		expect(parsed.success, parsed.success ? '' : parsed.error.message).toBe(true);
	});

	it('keeps every non-affine unit at offset "0" so convert needs one code path', () => {
		for (const unit of Object.values(HAND_SLICE.units)) {
			if (!unit.affine) expect(unit.offset, unit.slug).toBe('0');
		}
	});
});
