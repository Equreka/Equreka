import { MAX_ATOMIC_NUMBER } from '@equreka/schema';

export type PeriodicBlock = 's' | 'p' | 'd' | 'f';

/**
 * Where an element sits (ADR 0016). `group` is null for the thirty members
 * of the lanthanoid (La–Lu) and actinoid (Ac–Lr) series, which the grid
 * draws apart from the numbered groups. `block` follows the filling
 * order, so Lu and Lr are d-block cells inside those series. `row` and
 * `column` address an 18-column grid: rows 1–7 are the periods, and rows 8
 * and 9 hold the two series, fifteen cells each from column 3.
 */
export interface PeriodicPosition {
	readonly period: number;
	readonly group: number | null;
	readonly block: PeriodicBlock;
	readonly row: number;
	readonly column: number;
}

/**
 * The fifteen-element series below the main table: the lanthanoids La–Lu
 * and the actinoids Ac–Lr (IUPAC collective names). Each stands for its
 * period's cell in group 3, which no element occupies in the main body.
 */
export const F_ROWS = [
	{ period: 6, row: 8, first: 57, last: 71 },
	{ period: 7, row: 9, first: 89, last: 103 },
] as const;

export const F_ROW_FIRST_COLUMN = 3;

/**
 * The atomic number that closes each period: the noble gases He to Og.
 */
const PERIOD_ENDS = [2, 10, 18, 36, 54, 86, 118] as const;

/**
 * The f subshell's fourteen electrons fill across La–Yb and Ac–No; the next
 * series member, Lu or Lr, starts the d subshell.
 */
const F_SUBSHELL_ELECTRONS = 14;

/**
 * A series stands for one group-3 cell, so the fifteen members span
 * fourteen more cells than the group they replace.
 */
const SERIES_EXTRA_CELLS = 14;

function blockOfGroup(group: number): PeriodicBlock {
	if (group <= 2) {
		return 's';
	}
	return group <= 12 ? 'd' : 'p';
}

/**
 * Period, group, block and grid cell of atomic number `z`, by the
 * conventional long form: Sc and Y alone in group 3, the IUPAC lanthanoid
 * and actinoid series as two fifteen-element rows below the main body with
 * no group number, and helium in group 18. `block` is the letter of the
 * subshell the filling order fills last, so La–Yb and Ac–No are f and Lu
 * and Lr are d. Throws outside 1–MAX_ATOMIC_NUMBER, where no position is
 * defined.
 */
export function periodicPosition(z: number): PeriodicPosition {
	if (!Number.isInteger(z) || z < 1 || z > MAX_ATOMIC_NUMBER) {
		throw new RangeError(`no periodic position for atomic number ${z}`);
	}
	const periodIndex = PERIOD_ENDS.findIndex((end) => z <= end);
	const period = periodIndex + 1;
	const start = periodIndex === 0 ? 1 : (PERIOD_ENDS[periodIndex - 1] ?? 0) + 1;
	const index = z - start + 1;
	const length = (PERIOD_ENDS[periodIndex] ?? 0) - start + 1;

	if (length === 2) {
		const group = index === 1 ? 1 : 18;
		return { period, group, block: 's', row: period, column: group };
	}
	if (length === 8) {
		const group = index <= 2 ? index : index + 10;
		return { period, group, block: blockOfGroup(group), row: period, column: group };
	}
	if (length === 18) {
		return { period, group: index, block: blockOfGroup(index), row: period, column: index };
	}

	const fRow = F_ROWS.find((series) => series.period === period);
	const row = fRow?.row ?? period;
	if (index <= 2) {
		return { period, group: index, block: 's', row: period, column: index };
	}
	const seriesMember = index - 2;
	if (seriesMember <= 1 + SERIES_EXTRA_CELLS) {
		return {
			period,
			group: null,
			block: seriesMember <= F_SUBSHELL_ELECTRONS ? 'f' : 'd',
			row,
			column: F_ROW_FIRST_COLUMN + seriesMember - 1,
		};
	}
	const group = index - SERIES_EXTRA_CELLS;
	return { period, group, block: blockOfGroup(group), row: period, column: group };
}

export type SubshellLetter = 's' | 'p' | 'd' | 'f';

export interface Subshell {
	readonly n: number;
	readonly letter: SubshellLetter;
	readonly electrons: number;
}

/**
 * The orbital quantum number l of each letter; a subshell needs n > l and
 * holds at most 2(2l + 1) electrons.
 */
const ORBITAL_NUMBER: Readonly<Record<SubshellLetter, number>> = { s: 0, p: 1, d: 2, f: 3 };

/**
 * Each noble-gas core as the subshells it stands for, built shell on shell
 * in filling order, so its electron count is derived, never typed.
 */
const CORE_SUBSHELLS: Readonly<Record<string, readonly string[]>> = (() => {
	const he = ['1s2'];
	const ne = [...he, '2s2', '2p6'];
	const ar = [...ne, '3s2', '3p6'];
	const kr = [...ar, '3d10', '4s2', '4p6'];
	const xe = [...kr, '4d10', '5s2', '5p6'];
	const rn = [...xe, '4f14', '5d10', '6s2', '6p6'];
	return { He: he, Ne: ne, Ar: ar, Kr: kr, Xe: xe, Rn: rn };
})();

export const NOBLE_GAS_CORES: readonly string[] = Object.keys(CORE_SUBSHELLS);

export interface ElectronConfiguration {
	readonly core: string | null;
	readonly subshells: readonly Subshell[];
}

export type ElectronConfigurationResult =
	| { readonly ok: true; readonly configuration: ElectronConfiguration }
	| { readonly ok: false; readonly message: string };

const SUBSHELL_RE = /^([1-9])([spdf])(\d+)$/;

const CORE_RE = /^\[([A-Z][a-z]?)\]$/;

function subshellOf(token: string): Subshell | string {
	const match = SUBSHELL_RE.exec(token);
	if (match === null) {
		return `'${token}' is not a subshell such as 2p4 (shell 1–9, letter s, p, d or f, electron count)`;
	}
	const n = Number(match[1]);
	const letter = match[2] as SubshellLetter;
	const electrons = Number(match[3]);
	const l = ORBITAL_NUMBER[letter];
	const capacity = 2 * (2 * l + 1);
	if (n <= l) {
		return `${n}${letter} does not exist: shell ${n} has no ${letter} subshell`;
	}
	if (electrons < 1 || electrons > capacity || match[3]?.startsWith('0')) {
		return `${n}${letter} holds 1 to ${capacity} electrons, not ${match[3]}`;
	}
	return { n, letter, electrons };
}

/**
 * Parses a ground-state configuration in plain notation: an optional
 * noble-gas core in brackets, then one or more subshells separated by
 * single spaces (`[He] 2s2 2p4`, `1s1`). A subshell may appear once, and
 * never one its core already holds.
 */
export function parseElectronConfiguration(text: string): ElectronConfigurationResult {
	const tokens = text.split(' ');
	if (tokens.some((token) => token === '')) {
		return { ok: false, message: 'separate the core and each subshell with one space' };
	}
	const coreMatch = CORE_RE.exec(tokens[0] ?? '');
	const core = coreMatch?.[1] ?? null;
	if (core !== null && CORE_SUBSHELLS[core] === undefined) {
		return {
			ok: false,
			message: `[${core}] is not a noble-gas core (${NOBLE_GAS_CORES.map((gas) => `[${gas}]`).join(', ')})`,
		};
	}
	const subshellTokens = core === null ? tokens : tokens.slice(1);
	if (subshellTokens.length === 0) {
		return { ok: false, message: 'list at least one subshell after the core' };
	}
	const taken = new Set(
		(core === null ? [] : (CORE_SUBSHELLS[core] ?? [])).map((token) => token.replace(/\d+$/, '')),
	);
	const subshells: Subshell[] = [];
	for (const token of subshellTokens) {
		const subshell = subshellOf(token);
		if (typeof subshell === 'string') {
			return { ok: false, message: subshell };
		}
		const name = `${subshell.n}${subshell.letter}`;
		if (taken.has(name)) {
			return {
				ok: false,
				message:
					core !== null && (CORE_SUBSHELLS[core] ?? []).some((held) => held.startsWith(name))
						? `${name} is already in the [${core}] core`
						: `${name} is listed twice`,
			};
		}
		taken.add(name);
		subshells.push(subshell);
	}
	return { ok: true, configuration: { core, subshells } };
}

export function electronCount(configuration: ElectronConfiguration): number {
	const coreCount = (configuration.core === null ? [] : (CORE_SUBSHELLS[configuration.core] ?? []))
		.map((token) => Number(SUBSHELL_RE.exec(token)?.[3] ?? 0))
		.reduce((sum, count) => sum + count, 0);
	return configuration.subshells.reduce((sum, subshell) => sum + subshell.electrons, coreCount);
}
