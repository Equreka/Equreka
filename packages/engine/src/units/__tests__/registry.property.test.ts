import fc from 'fast-check';
import { describe, it } from 'vitest';
import { HAND_SLICE } from '../../__tests__/hand-slice.js';
import { expectClose, unwrap } from '../../__tests__/support.js';
import { createUnitRegistry } from '../index.js';

const registry = createUnitRegistry(HAND_SLICE);

const LENGTH_UNITS = ['metre', 'foot', 'inch', 'mile', 'cubit'] as const;
const TEMPERATURE_UNITS = ['kelvin', 'celsius', 'fahrenheit', 'rankine', 'delisle'] as const;
const ALL_UNITS = Object.keys(HAND_SLICE.units);

const unitPair = fc.oneof(
	fc.tuple(fc.constantFrom(...LENGTH_UNITS), fc.constantFrom(...LENGTH_UNITS)),
	fc.tuple(fc.constantFrom(...TEMPERATURE_UNITS), fc.constantFrom(...TEMPERATURE_UNITS)),
);

const finiteValue = fc.double({ min: -1e6, max: 1e6, noNaN: true });

describe('unit registry properties', () => {
	it('convert round-trips: convert(convert(v, a, b), b, a) ≈ v', () => {
		fc.assert(
			fc.property(unitPair, finiteValue, ([from, to], value) => {
				const there = unwrap(registry.convert(value, from, to));
				const back = unwrap(registry.convert(there, to, from));
				expectClose(back, value, 1e-12);
			}),
		);
	});

	it('convertDelta round-trips through affine units too', () => {
		fc.assert(
			fc.property(unitPair, finiteValue, ([from, to], value) => {
				const there = unwrap(registry.convertDelta(value, from, to));
				const back = unwrap(registry.convertDelta(there, to, from));
				expectClose(back, value, 1e-12);
			}),
		);
	});

	it('convertDelta is additive: Δ(x + y) ≈ Δx + Δy', () => {
		fc.assert(
			fc.property(unitPair, finiteValue, finiteValue, ([from, to], x, y) => {
				const joint = unwrap(registry.convertDelta(x + y, from, to));
				const deltaX = unwrap(registry.convertDelta(x, from, to));
				const deltaY = unwrap(registry.convertDelta(y, from, to));
				const scale = Math.max(1, Math.abs(deltaX), Math.abs(deltaY));
				return Math.abs(joint - (deltaX + deltaY)) <= 1e-12 * scale;
			}),
		);
	});

	it('convertDelta is homogeneous: Δ(k·x) ≈ k·Δx', () => {
		fc.assert(
			fc.property(
				unitPair,
				finiteValue,
				fc.double({ min: -1e3, max: 1e3, noNaN: true }),
				([from, to], x, k) => {
					const scaled = unwrap(registry.convertDelta(k * x, from, to));
					expectClose(scaled, k * unwrap(registry.convertDelta(x, from, to)), 1e-12);
				},
			),
		);
	});

	it('compatibility is symmetric and matches bucket membership', () => {
		fc.assert(
			fc.property(fc.constantFrom(...ALL_UNITS), fc.constantFrom(...ALL_UNITS), (a, b) => {
				const forward = registry.areCompatible(a, b);
				const backward = registry.areCompatible(b, a);
				const inBucket = registry.compatibleUnits(a).some((unit) => unit.slug === b);
				const inReverseBucket = registry.compatibleUnits(b).some((unit) => unit.slug === a);
				return forward === backward && forward === inBucket && inBucket === inReverseBucket;
			}),
		);
	});
});
