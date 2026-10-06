import { texToFallbackText } from '@equreka/content/plain-symbol';
import type { CompiledEquationMeta } from '@equreka/schema';

/**
 * One user-facing input, resolved at build from the equation's terms map:
 * constant-kind terms are excluded (they inject automatically) and
 * `unitSymbol` comes from the term's magnitude baseUnit or variable
 * defaultUnit ('' when the term has no unit). `symbolText` is the term key
 * as plain text (`\theta` → θ, `v_{0}` → v₀), never raw TeX, because it
 * labels the field and starts the copied result. `solvable` is false for a
 * term the calculator never leaves unknown, which the reader must fill.
 */
export interface CalculatorField {
	key: string;
	label: string;
	symbolText: string;
	unitSymbol: string;
	solvable: boolean;
}

export function calculatorField(
	meta: CompiledEquationMeta,
	key: string,
	label: string,
	unitSymbol: string,
): CalculatorField {
	return {
		key,
		label,
		symbolText: texToFallbackText(key),
		unitSymbol,
		solvable: meta.solvable.includes(key),
	};
}
