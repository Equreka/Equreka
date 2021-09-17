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
// Constants
import c from '~/calculator/constants/speed-of-light';

// Calculate mass
export function mass(input) {
	var { E } = input,
		variable = 'm', unit = 'kg',
		value = E / Math.pow(c, 2);
	return { value, variable, unit }
}

// Calculate energy
export function energy(input) {
	var { m } = input,
		value = m * Math.pow(c, 2),
		variable = 'E', unit = 'J';
	return { value, variable, unit }
}

// This is the function that will get called by the calculator
export default (input) => {
	// All inputs
	if(isIn(['E', 'm'], input)) return { error: errorInputsAllFilled };
	// Calculate mass
	if(['E'] in input) return mass(input);
	// Calculate energy
	if(['m'] in input) return energy(input);
	// Return default error
	return { error: errorDefault }
}