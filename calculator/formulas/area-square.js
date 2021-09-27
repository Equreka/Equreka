/**
 * Areas: Square
 * @author Derian Castillo
 * @version 1.0.0
 * @dateCreated 2021-09-24
 * @dateUpdated 2021-09-24
 */

// Errors
import { errorDefault, errorInputNegativeValues, } from '~/calculator/errors';
// Utils
import { check, checkNegatives } from '~/calculator/utils';

// Calculate area
export function A(input) {
	var { l } = input;
	var value = Math.pow(l, 2),
		 variable = 'A',
		 unit = 'm',
		 sup = 2;
	return { value, variable, unit, sup }
}

// This is the function that will get called by the calculator
export default (input) => {
	var inputs = input.values;
	// Check for negative values
	if(checkNegatives(inputs)) return { error: errorInputNegativeValues };
	// Calculate area
	if(check(['l'], inputs)) return A(inputs);
	// Return default error
	return { error: errorDefault };
}