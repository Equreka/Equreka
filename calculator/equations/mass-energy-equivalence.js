/**
 * Mass energy equivalence
 * @author Derian Castillo
 * @version 1.0.0
 * @date 2021-09-14
 */

// Errors
import { errorDefault, errorInputsAllFilled } from '~/calculator/errors';
// Utils
import { isIn } from '~/calculator/utils';

// Calculate mass
export function mass(input, c) {
	var { E } = input,
		variable = 'm', unit = 'kg',
		value = E / Math.pow(c, 2);
	return { value, variable, unit }
}

// Calculate energy
export function energy(input, c) {
	var { m } = input,
		variable = 'E', unit = 'J',
		value = m * Math.pow(c, 2);
	return { value, variable, unit }
}

// This is the function that will get called by the calculator
export default (input, constants) => {
	// All inputs
	if(isIn(['E', 'm'], input)) return { error: errorInputsAllFilled };
	// Constants
	var { c } = constants;
	// Calculate mass
	if(['E'] in input) return mass(input, c);
	// Calculate energy
	if(['m'] in input) return energy(input, c);
	// Return default error
	return { error: errorDefault }
}