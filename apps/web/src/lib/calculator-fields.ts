import { texToFallbackText } from '@equreka/content/plain-symbol';
import { isUnitOne } from '@equreka/core/hooks/use-calculator-units';
import type { CompiledDisplayUnit, CompiledEquationMeta, CompiledUnit } from '@equreka/schema';

/**
 * How a field's unit reads. `symbol` is what the label and the result
 * print in the term's default unit: '' for no unit or the unit one, the
 * display unit's symbol for a level (dB), else the base unit's symbol.
 * `convertible` is true when the term solves in a registry unit, so the
 * island loads the unit payload and prints the picked unit instead; a
 * term with no unit or a display unit converts nothing.
 */
export interface CalculatorFieldUnit {
	symbol: string;
	convertible: boolean;
}

export const NO_FIELD_UNIT: CalculatorFieldUnit = { symbol: '', convertible: false };

export function calculatorUnitSymbol(unit: CompiledUnit): string {
	return isUnitOne(unit) ? '' : unit.symbolText;
}

/**
 * `unit` is the term's anchor; undefined (a slug outside the engine
 * slice) leaves nothing to convert.
 */
export function convertibleFieldUnit(unit: CompiledUnit | undefined): CalculatorFieldUnit {
	return unit === undefined
		? NO_FIELD_UNIT
		: { symbol: calculatorUnitSymbol(unit), convertible: true };
}

export function displayFieldUnit(unit: CompiledDisplayUnit): CalculatorFieldUnit {
	return { symbol: unit.symbolText, convertible: false };
}

/**
 * One user-facing input, resolved at build from the equation's terms map:
 * constant-kind terms are excluded (they inject automatically) and the
 * unit comes from the term's magnitude (its display unit, else its
 * baseUnit), variable defaultUnit or symbol unit. `symbolText` is the term
 * key as plain text (`\theta` → θ, `v_{0}` → v₀), never raw TeX, because
 * it labels the field and starts the copied result. `solvable` is false
 * for a term the calculator never leaves unknown, which the reader must
 * fill.
 */
export interface CalculatorField {
	key: string;
	label: string;
	symbolText: string;
	unitSymbol: string;
	convertible: boolean;
	solvable: boolean;
}

export function calculatorField(
	meta: CompiledEquationMeta,
	key: string,
	label: string,
	unit: CalculatorFieldUnit,
): CalculatorField {
	return {
		key,
		label,
		symbolText: texToFallbackText(key),
		unitSymbol: unit.symbol,
		convertible: unit.convertible,
		solvable: meta.solvable.includes(key),
	};
}

const ESCAPED_ID_CHAR = /[^A-Za-z0-9]/g;

/**
 * Term keys are TeX (`\gamma`, `F_\mathrm{N}`), which break unescaped `#id`
 * selectors and accessibility tooling, so DOM ids take the term's compiled
 * identifier (`gamma`, `F_N`), unique within the equation. A key without a
 * compiled term falls back to an injective escape that starts with `_`,
 * which no identifier does. Neither form contains `-`, so ids derived by
 * appending a `-suffix` never collide with each other or with a field id.
 */
export function termIdFragment(meta: CompiledEquationMeta, key: string): string {
	return (
		meta.terms[key]?.identifier ??
		`_${key.replace(ESCAPED_ID_CHAR, (char) => `_${char.charCodeAt(0).toString(16)}_`)}`
	);
}
