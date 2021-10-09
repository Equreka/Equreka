/**
 * Conversion module
 * Convert a number from one unit to another.
 * @author Derian Castillo
 * @version 1.0.0
 * @dateCreated 2021-09-24
 * @dateUpdated 2021-09-24
 */

// Errors
import { 
	errorDefault,
	errorInputValueNotANumber
} 
from '~/calculator/errors';

// Conversion by ratio
export function conversion(input) {
	var { formula, ratio, units, value } = input;
	value = Number(value);
	ratio = Number(ratio);
	console.log(typeof value, value)
	if(typeof value != 'number' || isNaN(value)) {
		return { error: errorInputValueNotANumber };
	}
	try {
		value = formula ? eval(formula) : (value * ratio);
	} catch (error) {
		return { error: errorDefault };
	}
	return { units, value };
}

// This is the function that will get called by the calculator
export default (input) => {
	// Calculate the conversion
	if(input) return conversion(input);
	// Return default error
	return { error: errorDefault };
}