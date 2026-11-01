import { MAX_ATOMIC_NUMBER } from '@equreka/schema';
import { describe, expect, it } from 'vitest';
import {
	electronCount,
	F_ROWS,
	NOBLE_GAS_CORES,
	type PeriodicBlock,
	type PeriodicPosition,
	parseElectronConfiguration,
	periodicPosition,
} from '../periodic-table.js';

const ATOMIC_NUMBERS = Array.from({ length: MAX_ATOMIC_NUMBER }, (_, index) => index + 1);

/**
 * The aufbau (Madelung) filling order up to 7p, each subshell with its
 * capacity: an independent derivation of the table to check the
 * index arithmetic of `periodicPosition` against.
 */
const MADELUNG: readonly { n: number; letter: PeriodicBlock; capacity: number }[] = [
	'1s',
	'2s',
	'2p',
	'3s',
	'3p',
	'4s',
	'3d',
	'4p',
	'5s',
	'4d',
	'5p',
	'6s',
	'4f',
	'5d',
	'6p',
	'7s',
	'5f',
	'6d',
	'7p',
].map((name) => {
	const letter = name[1] as PeriodicBlock;
	return { n: Number(name[0]), letter, capacity: { s: 2, p: 6, d: 10, f: 14 }[letter] };
});

/**
 * Period, group and block of `z` from the subshell its last electron enters
 * in Madelung order: the period is the shell of the latest s subshell, the
 * block that subshell's letter, and the group counts the electrons of an s,
 * d or p subshell after the groups before it. Helium, closing period 1,
 * belongs to group 18. A series member has no group: an element whose last
 * electron enters an f subshell, or the first d electron right after a full
 * f subshell (Lu, Lr), which closes the fifteen-element series.
 */
function madelung(z: number): Pick<PeriodicPosition, 'period' | 'group' | 'block'> {
	let remaining = z;
	let period = 1;
	let previous: PeriodicBlock | undefined;
	for (const subshell of MADELUNG) {
		if (subshell.letter === 's') {
			period = subshell.n;
		}
		if (remaining <= subshell.capacity) {
			const count = remaining;
			if (z === 2) {
				return { period, group: 18, block: 's' };
			}
			const closesSeries = subshell.letter === 'd' && previous === 'f' && count === 1;
			const group =
				subshell.letter === 'f' || closesSeries
					? null
					: subshell.letter === 's'
						? count
						: subshell.letter === 'd'
							? 2 + count
							: 12 + count;
			return { period, group, block: subshell.letter };
		}
		remaining -= subshell.capacity;
		previous = subshell.letter;
	}
	throw new Error(`no subshell left for ${z}`);
}

describe('periodicPosition', () => {
	it('agrees with the Madelung filling order on the period, group and block of every element', () => {
		for (const z of ATOMIC_NUMBERS) {
			const { period, group, block } = periodicPosition(z);
			expect({ z, period, group, block }).toEqual({ z, ...madelung(z) });
		}
	});

	it('fills the 18-column body once per cell, leaving only the gaps of periods 1 to 3 and the f-row cells of group 3', () => {
		const cells = new Map<string, number>();
		for (const z of ATOMIC_NUMBERS) {
			const { row, column } = periodicPosition(z);
			const key = `${row}:${column}`;
			expect(cells.has(key), `${z} and ${cells.get(key)} share ${key}`).toBe(false);
			cells.set(key, z);
		}
		for (let row = 1; row <= 7; row += 1) {
			const filled = Array.from({ length: 18 }, (_, index) => cells.has(`${row}:${index + 1}`));
			const expected = Array.from({ length: 18 }, (_, index) => {
				const column = index + 1;
				if (row === 1) return column === 1 || column === 18;
				if (row <= 3) return column <= 2 || column >= 13;
				if (row >= 6) return column !== 3;
				return true;
			});
			expect(filled, `row ${row}`).toEqual(expected);
		}
		expect(cells.size).toBe(MAX_ATOMIC_NUMBER);
	});

	it('places the lanthanoids La–Lu and actinoids Ac–Lr in fifteen-cell rows from column 3, with no group', () => {
		for (const { period, row, first, last } of F_ROWS) {
			expect(last - first + 1).toBe(15);
			for (let z = first; z <= last; z += 1) {
				expect(periodicPosition(z), `${z}`).toMatchObject({
					period,
					group: null,
					row,
					column: 3 + z - first,
				});
			}
		}
		expect(periodicPosition(57)).toEqual({ period: 6, group: null, block: 'f', row: 8, column: 3 });
		expect(periodicPosition(89)).toEqual({ period: 7, group: null, block: 'f', row: 9, column: 3 });
	});

	it('draws Lu and Lr, d-block by the filling order, as the last cells of their series', () => {
		expect(periodicPosition(71)).toEqual({
			period: 6,
			group: null,
			block: 'd',
			row: 8,
			column: 17,
		});
		expect(periodicPosition(103)).toEqual({
			period: 7,
			group: null,
			block: 'd',
			row: 9,
			column: 17,
		});
	});

	it('keeps Sc and Y alone in group 3', () => {
		expect(ATOMIC_NUMBERS.filter((z) => periodicPosition(z).group === 3)).toEqual([21, 39]);
		expect(periodicPosition(21)).toEqual({ period: 4, group: 3, block: 'd', row: 4, column: 3 });
		expect(periodicPosition(39)).toEqual({ period: 5, group: 3, block: 'd', row: 5, column: 3 });
		expect(periodicPosition(72)).toMatchObject({ group: 4, row: 6, column: 4 });
		expect(periodicPosition(104)).toMatchObject({ group: 4, row: 7, column: 4 });
	});

	it('puts helium in group 18 and the s-block, beside the other noble gases', () => {
		expect(periodicPosition(2)).toEqual({ period: 1, group: 18, block: 's', row: 1, column: 18 });
		expect(ATOMIC_NUMBERS.filter((z) => periodicPosition(z).group === 18)).toEqual([
			2, 10, 18, 36, 54, 86, 118,
		]);
		expect(ATOMIC_NUMBERS.filter((z) => periodicPosition(z).group === 1)).toEqual([
			1, 3, 11, 19, 37, 55, 87,
		]);
	});

	it('counts 14 s, 36 p, 40 d and 28 f elements, and leaves exactly the thirty series members without a group', () => {
		const positions = ATOMIC_NUMBERS.map((z) => periodicPosition(z));
		const count = (block: PeriodicBlock) => positions.filter((p) => p.block === block).length;
		expect([count('s'), count('p'), count('d'), count('f')]).toEqual([14, 36, 40, 28]);
		const series = F_ROWS.flatMap(({ first, last }) =>
			Array.from({ length: last - first + 1 }, (_, offset) => first + offset),
		);
		expect(series).toHaveLength(30);
		expect(ATOMIC_NUMBERS.filter((z) => periodicPosition(z).group === null)).toEqual(series);
		expect(series.every((z) => periodicPosition(z).row >= 8)).toBe(true);
	});

	it('refuses atomic numbers outside 1 to the last element', () => {
		for (const z of [0, -1, MAX_ATOMIC_NUMBER + 1, 1.5, Number.NaN]) {
			expect(() => periodicPosition(z), String(z)).toThrow(RangeError);
		}
	});
});

describe('parseElectronConfiguration', () => {
	const count = (text: string): number | string => {
		const parsed = parseElectronConfiguration(text);
		return parsed.ok ? electronCount(parsed.configuration) : parsed.message;
	};

	it('counts the electrons of a core and its subshells', () => {
		expect(count('1s1')).toBe(1);
		expect(count('1s2')).toBe(2);
		expect(count('[He] 2s2 2p4')).toBe(8);
		expect(count('1s2 2s2 2p6')).toBe(10);
		expect(count('[Xe] 4f14 5d1 6s2')).toBe(71);
		expect(count('[Rn] 5f14 6d10 7s2 7p6')).toBe(118);
	});

	it('expands every noble-gas core to the atomic number of its gas', () => {
		const coreCounts = NOBLE_GAS_CORES.map((core) => {
			const parsed = parseElectronConfiguration(`[${core}] 9s1`);
			return parsed.ok ? electronCount(parsed.configuration) - 1 : parsed.message;
		});
		expect(coreCounts).toEqual([2, 10, 18, 36, 54, 86]);
	});

	it('rejects a malformed configuration with the reason', () => {
		const rejected: [string, RegExp][] = [
			['', /one space/],
			['[He]  2s2', /one space/],
			['[He]', /at least one subshell/],
			['[Ha] 2s1', /not a noble-gas core/],
			['[He] 2s2 2p7', /2p holds 1 to 6/],
			['[He] 2s0', /2s holds 1 to 2/],
			['1p1', /1p does not exist/],
			['2d1', /2d does not exist/],
			['[He] 1s1', /1s is already in the \[He\] core/],
			['2s2 2s1', /2s is listed twice/],
			['2s^2', /not a subshell/],
			['2S2', /not a subshell/],
		];
		for (const [text, reason] of rejected) {
			const parsed = parseElectronConfiguration(text);
			expect(parsed.ok, text).toBe(false);
			expect(parsed.ok ? '' : parsed.message, text).toMatch(reason);
		}
	});
});
