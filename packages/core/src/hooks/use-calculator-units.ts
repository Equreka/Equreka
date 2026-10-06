import { type EngineResult, ok } from '@equreka/engine';
import { type KnownValue, type SolutionsModule, solveEquation } from '@equreka/engine/solutions';
import type { UnitRegistry } from '@equreka/engine/units';
import type { CompiledEquationMeta, CompiledUnit } from '@equreka/schema';
import { useCallback, useMemo, useState } from 'react';

/**
 * What resolves a term's base unit: `magnitudes` needs only `baseUnit`, so
 * the web converter payload and the mobile engine slice both satisfy it;
 * `variables` maps a variable slug to its `defaultUnit`. Callers keep the
 * object referentially stable — the hook memoizes on it.
 */
export interface CalculatorUnitSource {
	registry: UnitRegistry;
	magnitudes: Readonly<Record<string, { baseUnit: string }>>;
	variables?: Readonly<Record<string, { defaultUnit?: string | undefined }>> | undefined;
}

/**
 * A term's unit picker list, ordered by scale. `hiddenByKind` counts the same-dimension
 * units the kind scope leaves out, so the "show all with this dimension"
 * toggle renders only when it widens the list (ADR 0006).
 */
export interface CalculatorUnitOptions {
	units: CompiledUnit[];
	hiddenByKind: number;
}

/**
 * Per-term unit logic over one equation. Every term's base unit is what
 * solveEquation expects (magnitude → baseUnit, variable → defaultUnit,
 * symbol → its unit; '' when the term is unitless). A `delta` term (ΔT)
 * converts with convertDelta, factors only, and is offered affine units
 * (°C, °F), since an interval of 10 °C is 10 K. Every other term is
 * offered linear units only: convert() and convertDelta() agree on those,
 * so an interval the content forgot to flag can never take an offset.
 */
export interface CalculatorUnits {
	baseUnit(key: string): string;
	options(key: string, showAllDimension: boolean): CalculatorUnitOptions;
	toBase(key: string, value: number, unit: string): EngineResult<number>;
	fromBase(key: string, value: number, unit: string): EngineResult<number>;
	isExact(key: string, unit: string): boolean;
}

const NO_OPTIONS: CalculatorUnitOptions = { units: [], hiddenByKind: 0 };

/**
 * Smallest to largest, so a picker reads μg · mg · g · kg · t. Factors are
 * parsed here only to order the list; conversion stays in the registry.
 */
function byScale(a: CompiledUnit, b: CompiledUnit): number {
	return Number(a.factor) - Number(b.factor) || a.slug.localeCompare(b.slug);
}

/**
 * The kind scope of a term: a magnitude term's own kind family; a unit-
 * anchored term (symbol, variable) takes the union of the kind families
 * of the anchor unit's magnitudes, so a magnitude-less compound anchor
 * offers only itself until widened. The base unit is always kept so the
 * default selection is always offered.
 */
export function createCalculatorUnits(
	meta: CompiledEquationMeta,
	source: CalculatorUnitSource,
): CalculatorUnits {
	const { registry } = source;

	function baseUnit(key: string): string {
		const term = meta.terms[key];
		switch (term?.kind) {
			case 'magnitude':
				return term.ref === undefined ? '' : (source.magnitudes[term.ref]?.baseUnit ?? '');
			case 'variable':
				return term.ref === undefined ? '' : (source.variables?.[term.ref]?.defaultUnit ?? '');
			case 'symbol':
				return term.unit ?? '';
			default:
				return '';
		}
	}

	function kindSlugs(key: string, base: string): Set<string> {
		const term = meta.terms[key];
		const anchors =
			term?.kind === 'magnitude' && term.ref !== undefined
				? [term.ref]
				: (registry.getUnit(base)?.magnitudes ?? []);
		const slugs = new Set<string>([base]);
		for (const magnitude of anchors) {
			for (const unit of registry.unitsForMagnitude(magnitude, 'kind')) slugs.add(unit.slug);
		}
		return slugs;
	}

	function isDelta(key: string): boolean {
		return meta.terms[key]?.delta === true;
	}

	function options(key: string, showAllDimension: boolean): CalculatorUnitOptions {
		const base = baseUnit(key);
		if (base === '') return NO_OPTIONS;
		const byDimension = registry
			.compatibleUnits(base)
			.filter((unit) => isDelta(key) || !unit.affine)
			.sort(byScale);
		const inKind = kindSlugs(key, base);
		const byKind = byDimension.filter((unit) => inKind.has(unit.slug));
		return {
			units: showAllDimension ? byDimension : byKind,
			hiddenByKind: byDimension.length - byKind.length,
		};
	}

	function convert(key: string, value: number, from: string, to: string): EngineResult<number> {
		if (from === '' || to === '' || from === to) return ok(value);
		return isDelta(key)
			? registry.convertDelta(value, from, to)
			: registry.convert(value, from, to);
	}

	function toBase(key: string, value: number, unit: string): EngineResult<number> {
		return convert(key, value, unit, baseUnit(key));
	}

	function fromBase(key: string, value: number, unit: string): EngineResult<number> {
		return convert(key, value, baseUnit(key), unit);
	}

	function isExact(key: string, unit: string): boolean {
		const base = baseUnit(key);
		return base === '' || unit === base || registry.isExactPath(base, unit);
	}

	return { baseUnit, options, toBase, fromBase, isExact };
}

/**
 * One calculator pass. `fields` are the editable term keys, `raw` their
 * text state, `constants` the auto-injected decimal strings keyed by term
 * key, `selected` the chosen unit per term (missing means base unit).
 */
export interface CalculatorInputs {
	fields: readonly string[];
	raw: Readonly<Record<string, string>>;
	constants: Readonly<Record<string, string>>;
	selected: Readonly<Record<string, string>>;
	nonNegative?: ReadonlySet<string> | undefined;
}

/**
 * A solved term in its display unit. `exact` is true when every unit
 * conversion on the path (filled inputs in, result out) uses exact
 * factors, so the UI shows '=' rather than '≈'; `baseValue` is the
 * engine's value in the term's base unit; `root` is the authored index of
 * the chosen root, which selects the solved form to display.
 */
export interface CalculatorSolution {
	symbol: string;
	unit: string;
	value: number;
	baseValue: number;
	root: number;
	allRoots?: number[];
	exact: boolean;
}

/**
 * `outcome` is null until any field has input. `literals` holds every
 * known as a base-unit decimal literal (constants verbatim), which is what
 * the solved-form display substitutes — the authored solution is in base
 * units, so converted values would make the substituted line wrong.
 */
export interface CalculatorRun {
	outcome: EngineResult<CalculatorSolution> | null;
	literals: Record<string, string>;
}

/**
 * Converts each filled field from its selected unit to the term's base
 * unit, solves, and converts the result to the solved term's selected
 * unit. `units` null means no registry is available yet: every value is
 * taken as already in its base unit, which is exactly the pre-selection
 * behaviour.
 */
export function solveInUnits(
	meta: CompiledEquationMeta,
	fns: SolutionsModule,
	inputs: CalculatorInputs,
	units: CalculatorUnits | null,
): CalculatorRun {
	const unitOf = (key: string): string =>
		inputs.selected[key] ?? (units === null ? '' : units.baseUnit(key));
	const knowns: Record<string, KnownValue> = {};
	const literals: Record<string, string> = {};
	let exact = true;
	let anyInput = false;
	for (const key of inputs.fields) {
		const raw = (inputs.raw[key] ?? '').trim();
		if (raw === '') {
			knowns[key] = '';
			continue;
		}
		anyInput = true;
		const parsed = Number(raw);
		const converted = units === null ? ok(parsed) : units.toBase(key, parsed, unitOf(key));
		if (!converted.ok) return { outcome: converted, literals };
		knowns[key] = converted.value;
		if (Number.isFinite(converted.value)) literals[key] = String(converted.value);
		if (units !== null && !units.isExact(key, unitOf(key))) exact = false;
	}
	for (const [key, value] of Object.entries(inputs.constants)) {
		knowns[key] = Number(value);
		literals[key] = value;
	}
	if (!anyInput) return { outcome: null, literals };

	const solved = solveEquation(meta, fns, knowns, {
		nonNegative: new Set(inputs.nonNegative ?? []),
	});
	if (!solved.ok) return { outcome: solved, literals };

	const { symbol, value: baseValue, root, allRoots } = solved.value;
	const unit = unitOf(symbol);
	const display = (value: number): EngineResult<number> =>
		units === null ? ok(value) : units.fromBase(symbol, value, unit);
	const value = display(baseValue);
	if (!value.ok) return { outcome: value, literals };
	const displayRoots = (allRoots ?? []).map((candidate) => {
		const converted = display(candidate);
		return converted.ok ? converted.value : candidate;
	});
	const resultExact = exact && (units === null || units.isExact(symbol, unit));
	return {
		outcome: ok({
			symbol,
			unit,
			value: value.value,
			baseValue,
			root,
			...(allRoots === undefined ? {} : { allRoots: displayRoots }),
			exact: resultExact,
		}),
		literals,
	};
}

/**
 * Per-term unit selection state for a calculator screen. `selected`
 * holds explicit choices only; `unitFor` falls back to the base unit.
 * The solved term's picker is the same selection as its input picker, so
 * the result and the field never disagree about a term's unit.
 */
export interface UseCalculatorUnits {
	units: CalculatorUnits | null;
	selected: Readonly<Record<string, string>>;
	unitFor(key: string): string;
	showAllFor(key: string): boolean;
	optionsFor(key: string): CalculatorUnitOptions;
	select(key: string, unit: string): void;
	setShowAll(key: string, showAllDimension: boolean): void;
}

/**
 * `source` null (web before the converter payload arrives, or when it
 * fails) yields `units: null` and empty options: the screen renders its
 * static base-unit symbols and solves in base units. Narrowing the scope
 * drops a selection the kind scope no longer offers, mirroring the
 * converter's keep-if-offered rule.
 */
export function useCalculatorUnits(
	meta: CompiledEquationMeta,
	source: CalculatorUnitSource | null,
): UseCalculatorUnits {
	const units = useMemo(
		() => (source === null ? null : createCalculatorUnits(meta, source)),
		[meta, source],
	);
	const [selected, setSelected] = useState<Readonly<Record<string, string>>>({});
	const [showAll, setShowAllState] = useState<Readonly<Record<string, boolean>>>({});

	const unitFor = useCallback(
		(key: string): string => selected[key] ?? units?.baseUnit(key) ?? '',
		[selected, units],
	);
	const showAllFor = useCallback((key: string): boolean => showAll[key] === true, [showAll]);
	const optionsFor = useCallback(
		(key: string): CalculatorUnitOptions =>
			units === null ? NO_OPTIONS : units.options(key, showAll[key] === true),
		[units, showAll],
	);
	const select = useCallback((key: string, unit: string): void => {
		setSelected((previous) => ({ ...previous, [key]: unit }));
	}, []);
	const setShowAll = useCallback(
		(key: string, showAllDimension: boolean): void => {
			setShowAllState((previous) => ({ ...previous, [key]: showAllDimension }));
			if (showAllDimension || units === null) return;
			const offered = new Set(units.options(key, false).units.map((unit) => unit.slug));
			setSelected((previous) => {
				const current = previous[key];
				if (current === undefined || offered.has(current)) return previous;
				return Object.fromEntries(Object.entries(previous).filter(([term]) => term !== key));
			});
		},
		[units],
	);

	return { units, selected, unitFor, showAllFor, optionsFor, select, setShowAll };
}
