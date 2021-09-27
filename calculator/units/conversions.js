/**
 * Conversion module
 * Convert a number from one unit to another.
 * @author Derian Castillo
 * @version 1.0.0
 * @dateCreated 2021-09-24
 * @dateUpdated 2021-09-24
 */

// Errors
import { errorDefault } from '~/calculator/errors';

// Conversion by ratio
export function conversion(input) {
	var { value, unitsFrom, unitsTo, ratio } = input;
		 value = value * ratio;
	return { unitsFrom, value, unitsTo }
}

// This is the function that will get called by the calculator
export default (input) => {
	// Calculate the conversion
	if(input) return conversion(input);
	// Return default error
	return { error: errorDefault };
}