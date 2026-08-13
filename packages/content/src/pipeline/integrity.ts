import type { CollectionName } from '@equreka/schema';
import { dimensionsEqual, formatDimension, magnitudeDimension } from './dimension.js';
import { ratFromExact, ratIsZero } from './rational.js';
import { macroUses } from './tex.js';
import { type Issue, issue } from './types.js';
import { type Corpus, fileOf } from './validate.js';

const TERM_COLLECTION: Record<'magnitude' | 'constant' | 'variable', CollectionName> = {
	magnitude: 'magnitudes',
	constant: 'constants',
	variable: 'variables',
};

/**
 * Stage 3: cross-entity referential integrity plus the structural rules a
 * per-file schema cannot see (baseUnit linkage, the affine ban, equation
 * term/macro agreement). Numeric anchor rules land in stage 4 resolution.
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
		}
		for (const operand of unit.compose ?? []) {
			ref(file, 'compose.unit', 'units', operand.unit);
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
			if (term.kind !== use.kind) {
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
			ref(file, `terms.${key}.ref`, TERM_COLLECTION[term.kind], term.ref);
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
		for (const unitSlug of equation.units) {
			ref(file, 'units', 'units', unitSlug);
		}
	}

	for (const [slug, path] of corpus.paths) {
		const file = fileOf('paths', slug);
		for (const step of path.steps) {
			if (step.kind === 'entry') {
				ref(file, `steps.${step.id}`, step.collection, step.slug);
			}
		}
	}

	return issues;
}
