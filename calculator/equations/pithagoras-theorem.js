/**
 * Pithagoras Theorem
 * @author Derian Castillo
 * @version 1.0.0
 * @date 2021-09-14
 */

// Errors
import { errorDefault, errorInputsAllFilled, errorInputNegativeValues, } from '~/calculator/errors';
// Utils
import { isIn } from '~/calculator/utils';

function checkNegatives(input) {
	if(input.a < 0 || input.b < 0 || input.c < 0) return true;
	return false;
}

// Calculate a
export function a(input) {
	var { b, c } = input;
	// Custom error
	if(c <= b) return {
		error: {
			type: 'input.invalid',
			message: 'c must be greater than b'
		}
	}
	var value = Math.sqrt(Math.pow(c, 2) - Math.pow(b, 2)),
		variable = 'a', unit = 'u';
	return { value, variable, unit }
}

// Calculate b
export function b(input) {
	var { a, c } = input,
		value = Math.sqrt(Math.pow(c, 2) - Math.pow(a, 2)),
		variable = 'b', unit = 'u';
	return { value, variable, unit }
}

// Calculate c
export function c(input) {
	var { a, b } = input,
		value = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2)),
		variable = 'c', unit = 'u';
	return { value, variable, unit }
}

// This is the function that will get called by the calculator
export default (input) => {
	// All inputs
	if(isIn(['a', 'b', 'c'], input)) return { error: errorInputsAllFilled };
	// Check for negative values
	if(checkNegatives(input)) return { error: errorInputNegativeValues };
	// Calculate a
	if(isIn(['b', 'c'], input)) return a(input);
	// Calculate b
	if(isIn(['a', 'c'], input)) return b(input);
	// Calculate c
	if(isIn(['a', 'b'], input)) return c(input);
	// Return default error
	return { error: errorDefault };
}