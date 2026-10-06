/**
 * Areas: Square
 * @author Derian Castillo
 * @version 1.0.0
 * @dateCreated 2021-09-24
 * @dateUpdated 2021-09-27
 */

// Errors
import { errorDefault, errorInputNegativeValues, } from '~/calculator/errors';
// Utils
import { check, checkNegatives } from '~/calculator/utils';

// Calculate area
export function A(input) {
	const { l } = input;
	const value = Math.pow(l, 2),
				magnitudes = 'area',
				units = 'square-metre';
	return { value, magnitudes, units }
}
export function l(input) {
	const { A } = input;
	const value = Math.sqrt(A),
				magnitudes = 'length',
				units = 'metre';
	return { value, magnitudes, units }
}

// This is the function that will get called by the calculator
export default (input) => {
	const inputs = input.values;
	// Check for negative values
	if(checkNegatives(inputs)) return { error: errorInputNegativeValues };
	// Calculate area
	if(check(['l'], inputs)) return A(inputs);
	// Calculate area
	if(check(['A'], inputs)) return l(inputs);
	// Return default error
	return { error: errorDefault };
}