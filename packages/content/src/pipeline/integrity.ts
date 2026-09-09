import type { CollectionName } from '@equreka/schema';
import { dimensionsEqual, formatDimension, magnitudeDimension } from './dimension.js';
import { ratFromExact, ratIsZero } from './rational.js';
import { type MacroUse, macroUses } from './tex.js';
import { type Issue, issue } from './types.js';
import { type Corpus, fileOf } from './validate.js';

const TERM_COLLECTION: Record<'magnitude' | 'constant' | 'variable', CollectionName> = {
	magnitude: 'magnitudes',
	constant: 'constants',
	variable: 'variables',
};

/**
 * `\var{}` annotates both wiki-backed variables and equation-local symbols;
 * the other macros are one-to-one with their term kind.
 */
const MACRO_ACCEPTS: Record<MacroUse['kind'], readonly string[]> = {
	magnitude: ['magnitude'],
	constant: ['constant'],
	variable: ['variable', 'symbol'],
};

/**
 * The only units allowed to omit every derivation form: the seven SI base
 * units, the two SI dimensionless derived anchors, and the dimensionless
 * identity. Every other convertible unit must derive (toBase | prefixOf |
 * compose) so its magnitude's dimension vector is verified by composition
 * instead of trusted as hand-typed data.
 */
export const DERIVATION_FREE_UNITS: ReadonlySet<string> = new Set([
	'metre',
	'kilogram',
	'second',
	'ampere',
	'kelvin',
	'mole',
	'candela',
	'radian',
	'steradian',
	'unitless',
]);

/**
 * Stage 3: cross-entity referential integrity plus the structural rules a
 * per-file schema cannot see (baseUnit linkage, the affine ban, the
 * derivation whitelist, nonConvertible isolation, equation term/macro
 * agreement). Numeric anchor rules land in stage 4 resolution.
 */
export function checkIntegrity(corpus: Corpus): Issue[] {
	const issues: Issue[] = [];
	const ref = (
		file: string,
		field: string,
		collection: CollectionName,
		slug: string | undefined,
	): boolean => {
		if (slug === undefined) {
			return true;
		}
		if ((corpus[collection] as Map<string, unknown>).has(slug)) {
			return true;
		}
		issues.push(issue('error', 'integrity', file, `${field}: unknown ${collection} ref '${slug}'`));
		return false;
	};

	for (const collection of Object.keys(corpus) as CollectionName[]) {
		for (const [slug, entity] of corpus[collection] as Map<string, { categories?: string[] }>) {
			const file = fileOf(collection, slug);
			for (const category of entity.categories ?? []) {
				ref(file, 'categories', 'categories', category);
			}
		}
	}

	for (const [slug, magnitude] of corpus.magnitudes) {
		const file = fileOf('magnitudes', slug);
		if (!ref(file, 'baseUnit', 'units', magnitude.baseUnit)) {
			continue;
		}
		const baseUnit = corpus.units.get(magnitude.baseUnit);
		if (baseUnit !== undefined && !baseUnit.unitOf.includes(slug)) {
			issues.push(
				issue(
					'error',
					'integrity',
					file,
					`baseUnit '${magnitude.baseUnit}' does not list '${slug}' in its unitOf`,
				),
			);
		}
		if (baseUnit?.nonConvertible === true) {
			issues.push(
				issue(
					'error',
					'integrity',
					file,
					`baseUnit '${magnitude.baseUnit}' is nonConvertible; a magnitude anchors on a convertible unit`,
				),
			);
		}
	}

	const affineUnits = new Set<string>();
	for (const [slug, unit] of corpus.units) {
		if (unit.toBase !== undefined && !ratIsZero(ratFromExact(unit.toBase.offset))) {
			affineUnits.add(slug);
		}
	}

	for (const [slug, unit] of corpus.units) {
		const file = fileOf('units', slug);
		for (const magnitudeSlug of unit.unitOf) {
			ref(file, 'unitOf', 'magnitudes', magnitudeSlug);
		}
		const dims = unit.unitOf
			.map((magnitudeSlug) => corpus.magnitudes.get(magnitudeSlug))
			.filter((magnitude) => magnitude !== undefined)
			.map(magnitudeDimension);
		const firstDim = dims[0];
		if (firstDim !== undefined && dims.some((dim) => !dimensionsEqual(dim, firstDim))) {
			issues.push(
				issue(
					'error',
					'integrity',
					file,
					`unitOf magnitudes disagree on dimension: ${dims.map(formatDimension).join(' vs ')}`,
				),
			);
		}
		const derivationFree =
			unit.toBase === undefined && unit.prefixOf === undefined && unit.compose === undefined;
		if (derivationFree && !unit.nonConvertible && !DERIVATION_FREE_UNITS.has(slug)) {
			issues.push(
				issue(
					'error',
					'integrity',
					file,
					`has no derivation form (toBase | prefixOf | compose); only ${[...DERIVATION_FREE_UNITS].join(', ')} may omit one`,
				),
			);
		}
		if (unit.prefixOf !== undefined) {
			ref(file, 'prefixOf.prefix', 'prefixes', unit.prefixOf.prefix);
			ref(file, 'prefixOf.base', 'units', unit.prefixOf.base);
			if (affineUnits.has(unit.prefixOf.base)) {
				issues.push(
					issue(
						'error',
						'integrity',
						file,
						`prefixOf.base '${unit.prefixOf.base}' is affine (offset ≠ 0); prefixes on affine units are meaningless`,
					),
				);
			}
			if (corpus.units.get(unit.prefixOf.base)?.nonConvertible === true) {
				issues.push(
					issue(
						'error',
						'integrity',
						file,
						`prefixOf.base '${unit.prefixOf.base}' is nonConvertible and has no factor to scale`,
					),
				);
			}
		}
		for (const operand of unit.compose?.of ?? []) {
			ref(file, 'compose.of.unit', 'units', operand.unit);
			if (affineUnits.has(operand.unit)) {
				issues.push(
					issue(
						'error',
						'integrity',
						file,
						`compose references affine unit '${operand.unit}' (offset ≠ 0); affine units do not compose`,
					),
				);
			}
			if (corpus.units.get(operand.unit)?.nonConvertible === true) {
				issues.push(
					issue(
						'error',
						'integrity',
						file,
						`compose references nonConvertible unit '${operand.unit}', which has no factor to compose`,
					),
				);
			}
		}
	}

	for (const [slug, constant] of corpus.constants) {
		ref(fileOf('constants', slug), 'unit', 'units', constant.unit);
	}
	for (const [slug, variable] of corpus.variables) {
		ref(fileOf('variables', slug), 'defaultUnit', 'units', variable.defaultUnit);
	}

	for (const [slug, equation] of corpus.equations) {
		const file = fileOf('equations', slug);
		const termKeys = new Set(Object.keys(equation.terms));
		const usedKeys = new Set<string>();
		for (const use of macroUses(equation.expression)) {
			usedKeys.add(use.arg);
			const term = equation.terms[use.arg];
			if (term === undefined) {
				issues.push(
					issue(
						'error',
						'integrity',
						file,
						`expression macro argument '${use.arg}' is not a terms key`,
					),
				);
				continue;
			}
			if (!MACRO_ACCEPTS[use.kind].includes(term.kind)) {
				issues.push(
					issue(
						'error',
						'integrity',
						file,
						`expression annotates '${use.arg}' as ${use.kind} but terms declares ${term.kind}`,
					),
				);
			}
		}
		for (const key of termKeys) {
			if (!usedKeys.has(key)) {
				issues.push(
					issue('error', 'integrity', file, `terms key '${key}' never appears in expression`),
				);
			}
		}
		for (const [key, term] of Object.entries(equation.terms)) {
			if (term.kind === 'symbol') {
				ref(file, `terms.${key}.unit`, 'units', term.unit);
			} else {
				ref(file, `terms.${key}.ref`, TERM_COLLECTION[term.kind], term.ref);
			}
		}
		for (const key of Object.keys(equation.solutions)) {
			if (!termKeys.has(key)) {
				issues.push(issue('error', 'integrity', file, `solutions key '${key}' is not a terms key`));
			}
		}
		if (equation.calculator.enabled && Object.keys(equation.solutions).length === 0) {
			issues.push(
				issue('error', 'integrity', file, 'calculator.enabled requires at least one solution'),
			);
		}
		for (const key of equation.calculator.solveFor ?? []) {
			if (equation.solutions[key] === undefined) {
				issues.push(
					issue(
						'error',
						'integrity',
						file,
						`calculator.solveFor '${key}' has no authored solution`,
					),
				);
			}
		}
	}

	for (const [slug, path] of corpus.paths) {
		const file = fileOf('paths', slug);
		for (const step of path.steps) {
			if (step.kind === 'entry') {
				ref(file, `steps.${step.id}.ref`, step.ref.collection, step.ref.slug);
			}
		}
		for (const prerequisite of path.prerequisites) {
			if (prerequisite === slug) {
				issues.push(issue('error', 'integrity', file, 'a path cannot be its own prerequisite'));
				continue;
			}
			ref(file, 'prerequisites', 'paths', prerequisite);
		}
	}
	for (const cycle of prerequisiteCycles(corpus.paths)) {
		issues.push(
			issue(
				'error',
				'integrity',
				fileOf('paths', cycle[0] ?? ''),
				`prerequisites form a cycle: ${cycle.join(' → ')}`,
			),
		);
	}

	return issues;
}

/**
 * Every elementary cycle in the prerequisite graph, each reported once from
 * its lexicographically smallest member (so the report is deterministic and
 * a cycle is not listed once per participant). Unknown and self
 * prerequisites are skipped here — the checks above already reported them.
 */
function prerequisiteCycles(paths: Corpus['paths']): string[][] {
	const cycles: string[][] = [];
	const seen = new Set<string>();
	const visit = (slug: string, stack: string[]): void => {
		const at = stack.indexOf(slug);
		if (at !== -1) {
			const cycle = stack.slice(at);
			const pivot = cycle.indexOf([...cycle].sort()[0] ?? '');
			const canonical = [...cycle.slice(pivot), ...cycle.slice(0, pivot)];
			const key = canonical.join('→');
			if (!seen.has(key)) {
				seen.add(key);
				cycles.push([...canonical, canonical[0] ?? '']);
			}
			return;
		}
		for (const next of paths.get(slug)?.prerequisites ?? []) {
			if (next !== slug && paths.has(next)) {
				visit(next, [...stack, slug]);
			}
		}
	};
	for (const slug of [...paths.keys()].sort()) {
		visit(slug, []);
	}
	return cycles;
}
