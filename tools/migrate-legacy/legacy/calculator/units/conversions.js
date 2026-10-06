/**
 * Conversion module
 * Convert a number from one unit to another.
 * @author Derian Castillo
 * @version 1.1.0
 * @dateCreated 2021-09-24
 * @dateUpdated 2021-10-08
 */

// Errors
import {
	errorDefault,
	errorInputValueNotANumber
} from '~/calculator/errors';

// Conversion by formula or ratio
export function conversion(input) {
	const { formula, ratio, units, value } = input;
	// Convert to numbers
	value = Number(value);
	ratio = Number(ratio);
	// Check if the input is a number
	if(typeof value != 'number' || isNaN(value)) {
		return { error: errorInputValueNotANumber };
	}
	// Check if the formula is valid
	try {
		// If the formula is not defined, use the ratio
		value = formula ? eval(formula) : (value * ratio);
		return { units, value };
	} catch (error) {
		return { error: errorDefault };
	}
}

// This is the function that will get called by the calculator
export default (input) => {
	// Calculate the conversion
	if(input) return conversion(input);
	// Return default error
	return { error: errorDefault };
}