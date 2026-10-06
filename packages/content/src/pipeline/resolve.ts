import type { CompiledDimension } from '@equreka/schema';
import {
	DIMENSION_ZERO,
	declaredUnitDimension,
	dimensionsEqual,
	formatDimension,
	magnitudeDimension,
	unitDimension,
} from './dimension.js';
import {
	RAT_ONE,
	RAT_ZERO,
	type Rat,
	ratFromDecimal,
	ratFromExact,
	ratIsOne,
	ratIsZero,
	ratMul,
	ratPow,
	ratToDecimal,
} from './rational.js';
import { type Issue, issue } from './types.js';
import { type Corpus, fileOf } from './validate.js';

/**
 * A unit fully resolved against the SI-coherent unit of its dimension:
 * base = factor · value + offset. `exact` is authored exactness AND exact
 * decimal expansion — a rationally exact factor like 5/9 emits inexact
 * because its 36-significant-digit decimal rendering is rounded.
 */
export interface ResolvedUnit {
	factor: Rat;
	offset: Rat;
	factorText: string;
	offsetText: string;
	exact: boolean;
	affine: boolean;
	dimension: CompiledDimension;
}

export interface ResolveResult {
	resolved: Map<string, ResolvedUnit>;
	issues: Issue[];
}

interface RawResolution {
	factor: Rat;
	offset: Rat;
	authoredExact: boolean;
}

export function resolveUnits(corpus: Corpus): ResolveResult {
	const issues: Issue[] = [];
	const memo = new Map<string, RawResolution | null>();
	const visiting = new Set<string>();

	const resolve = (slug: string): RawResolution | null => {
		const cached = memo.get(slug);
		if (cached !== undefined) {
			return cached;
		}
		if (visiting.has(slug)) {
			issues.push(
				issue('error', 'resolve', fileOf('units', slug), `derivation cycle through '${slug}'`),
			);
			memo.set(slug, null);
			return null;
		}
		visiting.add(slug);
		const result = resolveUncached(slug);
		visiting.delete(slug);
		memo.set(slug, result);
		return result;
	};

	const resolveUncached = (slug: string): RawResolution | null => {
		const unit = corpus.units.get(slug);
		if (unit === undefined) {
			return null;
		}
		if (unit.nonConvertible) {
			return null;
		}
		const file = fileOf('units', slug);
		if (unit.toBase !== undefined) {
			return {
				factor: ratFromExact(unit.toBase.factor),
				offset: ratFromExact(unit.toBase.offset),
				authoredExact: unit.toBase.exact,
			};
		}
		if (unit.prefixOf !== undefined) {
			const prefix = corpus.prefixes.get(unit.prefixOf.prefix);
			const base = resolve(unit.prefixOf.base);
			if (prefix === undefined || base === null) {
				return null;
			}
			if (!ratIsZero(base.offset)) {
				issues.push(
					issue(
						'error',
						'resolve',
						file,
						`prefixOf.base '${unit.prefixOf.base}' resolves to an affine mapping`,
					),
				);
				return null;
			}
			return {
				factor: ratMul(ratFromDecimal(prefix.value), base.factor),
				offset: RAT_ZERO,
				authoredExact: base.authoredExact,
			};
		}
		if (unit.compose !== undefined) {
			let factor = ratFromExact(unit.compose.factor);
			let authoredExact = true;
			const dimensionSum = [...DIMENSION_ZERO] as CompiledDimension;
			for (const operand of unit.compose.of) {
				const operandUnit = corpus.units.get(operand.unit);
				const operandResolution = resolve(operand.unit);
				if (operandUnit === undefined || operandResolution === null) {
					return null;
				}
				if (!ratIsZero(operandResolution.offset)) {
					issues.push(
						issue(
							'error',
							'resolve',
							file,
							`compose operand '${operand.unit}' resolves to an affine mapping`,
						),
					);
					return null;
				}
				const operandDimension = unitDimension(operandUnit, corpus);
				if (operandDimension === undefined) {
					return null;
				}
				for (let i = 0; i < dimensionSum.length; i += 1) {
					dimensionSum[i] = (dimensionSum[i] ?? 0) + operand.exp * (operandDimension[i] ?? 0);
				}
				factor = ratMul(factor, ratPow(operandResolution.factor, operand.exp));
				authoredExact = authoredExact && operandResolution.authoredExact;
			}
			const declared = declaredUnitDimension(unit, corpus);
			if (declared !== undefined && !dimensionsEqual(dimensionSum, declared)) {
				issues.push(
					issue(
						'error',
						'resolve',
						file,
						`compose dimension ${formatDimension(dimensionSum)} does not match magnitude-declared ${formatDimension(declared)}`,
					),
				);
				return null;
			}
			return { factor, offset: RAT_ZERO, authoredExact };
		}
		return { factor: RAT_ONE, offset: RAT_ZERO, authoredExact: true };
	};

	const resolved = new Map<string, ResolvedUnit>();
	for (const [slug, unit] of corpus.units) {
		const raw = resolve(slug);
		const dimension = unitDimension(unit, corpus);
		if (raw === null || dimension === undefined) {
			continue;
		}
		const factorRendering = ratToDecimal(raw.factor);
		const offsetRendering = ratToDecimal(raw.offset);
		resolved.set(slug, {
			factor: raw.factor,
			offset: raw.offset,
			factorText: factorRendering.text,
			offsetText: offsetRendering.text,
			exact: raw.authoredExact && factorRendering.exact && offsetRendering.exact,
			affine: !ratIsZero(raw.offset),
			dimension,
		});
	}

	for (const [slug, magnitude] of corpus.magnitudes) {
		const base = resolved.get(magnitude.baseUnit);
		if (base === undefined) {
			continue;
		}
		if (!ratIsOne(base.factor) || !ratIsZero(base.offset)) {
			issues.push(
				issue(
					'error',
					'resolve',
					fileOf('magnitudes', slug),
					`baseUnit '${magnitude.baseUnit}' must resolve to factor 1 offset 0, got factor ${base.factorText} offset ${base.offsetText}`,
				),
			);
		}
	}

	issues.push(...checkIdentityAnchors(corpus, resolved));
	return { resolved, issues };
}

/**
 * The identity mapping (factor 1, offset 0) of a dimension belongs to the
 * magnitudes' baseUnit. Any other unit landing on it is either a duplicate
 * entity (`unit` next to `unitless`) or a compose form whose identity is a
 * verified consequence of its operands (J·s⁻¹ = W) — only the former is an
 * error, and it names the anchor(s) it collides with.
 */
function checkIdentityAnchors(
	corpus: Corpus,
	resolved: ReadonlyMap<string, ResolvedUnit>,
): Issue[] {
	const issues: Issue[] = [];
	const anchors = new Set([...corpus.magnitudes.values()].map((magnitude) => magnitude.baseUnit));
	for (const [slug, resolution] of resolved) {
		if (!ratIsOne(resolution.factor) || !ratIsZero(resolution.offset) || anchors.has(slug)) {
			continue;
		}
		if (corpus.units.get(slug)?.compose !== undefined) {
			continue;
		}
		const collidingAnchors = [
			...new Set(
				[...corpus.magnitudes.values()]
					.filter((magnitude) =>
						dimensionsEqual(magnitudeDimension(magnitude), resolution.dimension),
					)
					.map((magnitude) => magnitude.baseUnit),
			),
		].sort();
		issues.push(
			issue(
				'error',
				'resolve',
				fileOf('units', slug),
				`resolves to the identity mapping (factor 1, offset 0) of dimension ${formatDimension(resolution.dimension)} already anchored by '${collidingAnchors.join("', '")}' — a duplicate identity unit; delete it or make it the anchor`,
			),
		);
	}
	return issues;
}
