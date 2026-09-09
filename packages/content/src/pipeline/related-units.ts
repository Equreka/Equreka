import type { EquationTerm } from '@equreka/schema';
import type { Corpus } from './validate.js';

/**
 * Units an equation's presentation lists as related, derived from its terms
 * (magnitude → baseUnit, constant → unit, variable → defaultUnit, symbol →
 * unit) in term order without duplicates. Hand-maintained lists drifted
 * (area-circle listed metre for an m² result); derivation cannot.
 */
export function deriveRelatedUnits(
	terms: Record<string, EquationTerm>,
	corpus: Pick<Corpus, 'magnitudes' | 'constants' | 'variables'>,
): string[] {
	const units: string[] = [];
	for (const term of Object.values(terms)) {
		const unit = termUnit(term, corpus);
		if (unit !== undefined && !units.includes(unit)) {
			units.push(unit);
		}
	}
	return units;
}

function termUnit(
	term: EquationTerm,
	corpus: Pick<Corpus, 'magnitudes' | 'constants' | 'variables'>,
): string | undefined {
	switch (term.kind) {
		case 'magnitude':
			return corpus.magnitudes.get(term.ref)?.baseUnit;
		case 'constant':
			return corpus.constants.get(term.ref)?.unit;
		case 'variable':
			return corpus.variables.get(term.ref)?.defaultUnit;
		case 'symbol':
			return term.unit;
	}
}
