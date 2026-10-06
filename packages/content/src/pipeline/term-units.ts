import type { EquationTerm } from '@equreka/schema';
import { ratIsOne, ratIsZero } from './rational.js';
import type { ResolvedUnit } from './resolve.js';
import { type Issue, issue } from './types.js';
import { type Corpus, fileOf } from './validate.js';

/**
 * A term's anchor unit and how the term came by it, for messages.
 */
interface TermAnchor {
	unit: string;
	source: string;
}

function anchorOf(term: EquationTerm, corpus: Corpus): TermAnchor | undefined {
	switch (term.kind) {
		case 'constant': {
			const unit = corpus.constants.get(term.ref)?.unit;
			return unit === undefined ? undefined : { unit, source: `constant '${term.ref}' is in` };
		}
		case 'variable': {
			const unit = corpus.variables.get(term.ref)?.defaultUnit;
			return unit === undefined
				? undefined
				: { unit, source: `variable '${term.ref}' has defaultUnit` };
		}
		case 'symbol':
			return term.unit === undefined ? undefined : { unit: term.unit, source: 'unit' };
		default:
			return undefined;
	}
}

/**
 * Stage 4a: every term anchors on an SI-coherent unit (factor 1, offset
 * 0): a constant term on its constant's unit, a variable term on its
 * defaultUnit, a symbol term on its unit. A magnitude term anchors on its
 * magnitude's baseUnit, which resolution already holds to factor 1. The
 * calculator converts every input to its term's anchor and injects
 * constants as authored, while the solutions are verified as plain
 * numbers with angles dimensionless, so a degree-anchored angle would
 * feed degrees into a formula written for radians and a constant in
 * electronvolts would enter a joule formula unconverted. Unknown and
 * unresolvable units are reported by the stages that own them.
 */
export function checkTermAnchors(
	corpus: Corpus,
	resolved: ReadonlyMap<string, ResolvedUnit>,
): Issue[] {
	const issues: Issue[] = [];
	for (const [slug, equation] of corpus.equations) {
		const file = fileOf('equations', slug);
		for (const [key, term] of Object.entries(equation.terms)) {
			const anchor = anchorOf(term, corpus);
			if (anchor === undefined) {
				continue;
			}
			if (corpus.units.get(anchor.unit)?.nonConvertible === true) {
				issues.push(
					issue(
						'error',
						'anchors',
						file,
						`term '${key}': ${anchor.source} '${anchor.unit}', which is nonConvertible; a term anchors on a convertible SI-coherent unit`,
					),
				);
				continue;
			}
			const resolution = resolved.get(anchor.unit);
			if (resolution === undefined) {
				continue;
			}
			if (!ratIsOne(resolution.factor) || !ratIsZero(resolution.offset)) {
				issues.push(
					issue(
						'error',
						'anchors',
						file,
						`term '${key}': ${anchor.source} '${anchor.unit}', which resolves to factor ${resolution.factorText} offset ${resolution.offsetText}; a term anchors on the SI-coherent unit of its dimension (factor 1, offset 0), because the calculator solves in anchor units`,
					),
				);
			}
		}
	}
	return issues;
}
