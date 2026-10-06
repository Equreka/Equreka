import type { CompiledEquationMeta } from '@equreka/schema';
import { type EngineResult, err, ok } from '../errors.js';

/**
 * One codegen'd solved form. Returns the solved value, every authored root
 * in preference order when the closed form is multi-valued (NaN for a root
 * outside its real domain), or null when the inputs leave the equation's
 * real domain. The argument record is keyed by term IDENTIFIER
 * (meta.terms[key].identifier), not by term key — identifiers are
 * guaranteed valid JS names for destructuring in generated code.
 */
export type SolutionFn = (values: Record<string, number>) => number | readonly number[] | null;

/**
 * Shape of @equreka/content's codegen'd solutions module: outer key is the
 * equation slug, inner key the solvable term key. The engine only defines
 * this type and consumes instances; the content pipeline emits them.
 */
export type SolutionsModule = Record<string, Record<string, SolutionFn>>;

/**
 * Calculator input state for one term key. Empty string, null, and undefined
 * all mean "not provided" so UIs can hand over raw field state without
 * pre-cleaning.
 */
export type KnownValue = number | '' | null | undefined;

/**
 * `nonNegative` lists term keys whose magnitude is nonNegative-flagged in
 * the slice; multi-root solutions then skip negative roots.
 */
export interface SolveOptions {
	nonNegative?: Set<string>;
}

/**
 * `symbol` is the solved term key and `value` the selected root: the first
 * finite root in authored order that SolveOptions.nonNegative admits.
 * `root` is that root's authored index (0 for a single-root solution).
 * `allRoots`, present only for a multi-root solution, lists its finite
 * roots in authored order.
 */
export interface SolveSuccess {
	symbol: string;
	value: number;
	root: number;
	allRoots?: number[];
}

function isEmpty(raw: KnownValue): raw is '' | null | undefined {
	return raw === undefined || raw === null || raw === '';
}

/**
 * Solves `meta`'s equation for the single unfilled solvable term.
 *
 * Caller contract: `knowns` is keyed by term key (the keys of `meta.terms`,
 * which `meta.solvable` indexes into). Every non-solvable term — constants
 * above all — must be injected by the caller as a finite number under its
 * term key; the engine does no constant lookup here. solveEquation maps term
 * keys to `meta.terms[key].identifier` before invoking the solution fn.
 */
export function solveEquation(
	meta: CompiledEquationMeta,
	fns: SolutionsModule,
	knowns: Record<string, KnownValue>,
	opts?: SolveOptions,
): EngineResult<SolveSuccess> {
	const notANumber: string[] = [];
	for (const [key, raw] of Object.entries(knowns)) {
		if (!isEmpty(raw) && !Number.isFinite(raw)) notANumber.push(key);
	}
	if (notANumber.length > 0) {
		return err('inputs/not-a-number', `non-finite input for: ${notANumber.join(', ')}`, {
			keys: notANumber,
		});
	}

	const missing = meta.solvable.filter((key) => isEmpty(knowns[key]));
	if (missing.length !== 1) {
		if (missing.length === 0) {
			return err('inputs/overdetermined', 'every solvable term already has a value', {
				solvable: meta.solvable,
			});
		}
		if (missing.length === meta.solvable.length) {
			return err('inputs/empty', 'no inputs provided', { solvable: meta.solvable });
		}
		return err('inputs/underdetermined', `multiple terms are unfilled: ${missing.join(', ')}`, {
			missing,
		});
	}
	const unknown = missing[0] as string;

	const args: Record<string, number> = {};
	for (const [key, term] of Object.entries(meta.terms)) {
		if (key === unknown) continue;
		const raw = knowns[key];
		if (isEmpty(raw)) {
			return err('internal/unsupported', `no value provided for required term: ${key}`, {
				equation: meta.slug,
				term: key,
				kind: term.kind,
			});
		}
		args[term.identifier] = raw;
	}

	const fn = fns[meta.slug]?.[unknown];
	if (fn === undefined) {
		return err('internal/unsupported', `no solution implementation for ${meta.slug}.${unknown}`, {
			equation: meta.slug,
			term: unknown,
		});
	}

	let result: number | readonly number[] | null;
	try {
		result = fn(args);
	} catch (thrown) {
		return err(
			'internal/unsupported',
			`solution implementation threw for ${meta.slug}.${unknown}`,
			{
				equation: meta.slug,
				term: unknown,
				thrown: String(thrown),
			},
		);
	}

	if (result === null) {
		return err('solve/domain', `inputs are outside the real domain of ${meta.slug}.${unknown}`, {
			equation: meta.slug,
			term: unknown,
		});
	}

	if (typeof result === 'number') {
		if (!Number.isFinite(result)) {
			return err('solve/no-real-solution', `no finite solution for ${meta.slug}.${unknown}`, {
				equation: meta.slug,
				term: unknown,
				result: String(result),
			});
		}
		return ok({ symbol: unknown, value: result, root: 0 });
	}

	const allRoots = result.filter((candidate) => Number.isFinite(candidate));
	const nonNegative = opts?.nonNegative?.has(unknown) === true;
	const root = result.findIndex(
		(candidate) => Number.isFinite(candidate) && (!nonNegative || candidate >= 0),
	);
	const value = result[root];
	if (value === undefined) {
		return err('solve/no-real-solution', `no admissible root for ${meta.slug}.${unknown}`, {
			equation: meta.slug,
			term: unknown,
			allRoots,
		});
	}
	return ok({ symbol: unknown, value, root, allRoots });
}
