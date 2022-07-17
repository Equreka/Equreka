/**
 * Mass energy equivalence
 * @author Derian Castillo
 * @version 1.1.0
 * @dateCreated 2021-09-14
 * @dateUpdated 2021-09-24
 */

// Errors
import { errorDefault, errorInputsAllFilled } from '~/calculator/errors';
// Utils
import { check } from '~/calculator/utils';

// Calculate mass
export function mass(input, c) {
	const { E } = input,
				magnitudes = 'mass',
				units = 'kilogram',
				value = E / Math.pow(c, 2);
	return { magnitudes, units, value }
}

// Calculate energy
export function energy(input, c) {
	const { m } = input,
				magnitudes = 'energy',
				units = 'joule',
				value = m * Math.pow(c, 2);
	return { magnitudes, units, value }
}

// This is the function that will get called by the calculator
export default (input, constants) => {
	const inputs = input.values;
	// All inputs
	if(check(['E', 'm'], inputs)) return { error: errorInputsAllFilled };
	// Constants
	const { c } = constants;
	// Calculate mass
	if(check(['E'], inputs)) return mass(inputs, c);
	// Calculate energy
	if(check(['m'], inputs)) return energy(inputs, c);
	// Return default error
	return { error: errorDefault }
}