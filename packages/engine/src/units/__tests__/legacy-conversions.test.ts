/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { type EngineSlice, engineSlice } from '@equreka/schema';
import { describe, expect, it } from 'vitest';
import rows from '../../../test/fixtures/legacy-conversions.json';
import { createUnitRegistry } from '../index.js';

const slicePath = fileURLToPath(new URL('../../../../content/dist/engine.json', import.meta.url));

const slice: EngineSlice | null = existsSync(slicePath)
	? engineSlice.parse(JSON.parse(readFileSync(slicePath, 'utf8')))
	: null;

describe('legacy conversion golden fixtures — preflight', () => {
	it(`fixture rows load; content slice ${slice === null ? 'MISSING' : 'present'}`, () => {
		if (slice === null) {
			process.stderr.write(
				[
					'',
					'='.repeat(76),
					`WARNING: legacy-conversions golden suite SKIPPED (${rows.length} rows not verified).`,
					`Missing artifact: ${slicePath}`,
					'Build it with: pnpm --filter @equreka/content build',
					'='.repeat(76),
					'',
				].join('\n'),
			);
		}
		expect(rows.length).toBeGreaterThan(0);
	});
});

/**
 * Digits carrying information in the legacy expected literal: sign, decimal
 * point, exponent marker, and leading zeros excluded. Trailing zeros count —
 * the legacy exporter printed them, so they were asserted.
 */
function significantDigits(literal: string): number {
	const digits = (literal.split(/[eE]/)[0] ?? '')
		.replace('-', '')
		.replace('.', '')
		.replace(/^0+/, '');
	return digits.length === 0 ? 1 : digits.length;
}

/**
 * Per-row relative tolerance: 1e-9 base for exact rows, 1e-6 for inexact
 * ones, widened to half a ULP of the expected literal's own precision —
 * legacy values were rounded to ~6–15 digits, so a row printed with n
 * significant digits can never be asserted tighter than 0.5·10^(1−n).
 * Floored at 1e-12.
 */
function relativeTolerance(row: { expected: string; exact: boolean }): number {
	const base = row.exact ? 1e-9 : 1e-6;
	const halfUlp = 0.5 * 10 ** (1 - significantDigits(row.expected));
	return Math.max(1e-12, base, halfUlp);
}

describe.skipIf(slice === null)(`legacy conversion golden fixtures (${rows.length} rows)`, () => {
	const registry = slice === null ? null : createUnitRegistry(slice);

	it.each(rows)('$from → $to = $expected', (row) => {
		if (registry === null) throw new Error('unreachable: suite runs only when the slice exists');
		const result = registry.convert(Number(row.input), row.from, row.to);
		expect(
			result.ok,
			result.ok ? '' : `${row.from} → ${row.to}: ${result.error.code} ${result.error.message}`,
		).toBe(true);
		if (!result.ok) return;
		const expected = Number(row.expected);
		const scale = expected === 0 ? 1 : Math.abs(expected);
		const relativeError = Math.abs(result.value - expected) / scale;
		expect(
			relativeError,
			`${row.from} → ${row.to}: got ${result.value}, expected ${row.expected}`,
		).toBeLessThanOrEqual(relativeTolerance(row));
	});
});
