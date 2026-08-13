/**
 * Pithagoras Theorem
 * @author Derian Castillo
 * @version 1.1.0
 * @dateCreated 2021-09-14
 * @dateUpdated 2021-09-24
 */

// Errors
import { errorDefault, errorInputsAllFilled, errorInputNegativeValues, } from '~/calculator/errors';
// Utils
import { check, checkNegatives } from '~/calculator/utils';

// Calculate a
export function a(input) {
	const { b, c } = input;
	// Custom error
	if(b > c) return {
		error: {
			type: 'input.invalid',
			message: 'c must be greater than b'
		}
	}
	const	variables = 'a',
				units = 'unit',
				value = Math.sqrt(Math.pow(c, 2) - Math.pow(b, 2));
	return { variables, units, value }
}

// Calculate b
export function b(input) {
	const	{ a, c } = input;
	// Custom error
	if(a > c) return {
		error: {
			type: 'input.invalid',
			message: 'c must be greater than b'
		}
	}
	const variables = 'b',
				units = 'unit',
				value = Math.sqrt(Math.pow(c, 2) - Math.pow(a, 2));
	return { variables, units, value }
}

// Calculate c
export function c(input) {
	const	{ a, b } = input,
				variables = 'c',
				units = 'unit',
				value = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
	return { variables, units, value }
}

// This is the function that will get called by the calculator
export default (input) => {
	const inputs = input.values;
	// Check for negative values
	if(checkNegatives(inputs)) return { error: errorInputNegativeValues };
	// Check if all inputs are filled
	if(check(['a', 'b', 'c'], inputs)) return { error: errorInputsAllFilled };
	// Calculate a
	if(check(['b', 'c'], inputs)) return a(inputs);
	// Calculate b
	if(check(['a', 'c'], inputs)) return b(inputs);
	// Calculate c
	if(check(['a', 'b'], inputs)) return c(inputs);
	// Return default error
	return { error: errorDefault };
}