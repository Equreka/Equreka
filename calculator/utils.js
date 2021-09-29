/**
 * Check
 * Check if variables are in the input
 * @param {array}  array Arrary with variables that are needed
 * @param {object} input Input to check if has the variables
 * @returns {boolean} true if all variables are in the input
 */
function check(array, input) {
	return array.every(variable => 
		Object.keys(input).includes(variable)
		&& input[variable] !== null 
		&& input[variable] !== ""
	);
}

/**
 * Check negatives
 * Check if there are negatives in the input
 * @param {array} array 
 * @returns {boolean} true if there are negatives in the input
 */
function checkNegatives(input) {
	if(Array.isArray(input)) {
		return (input.every(element => element < 0));
	}
	if(typeof input === 'number') {
		return (input < 0);
	}
	if(typeof input === 'object') {
		return (Object.values(input).every(element => element < 0));
	}
}

export {
	check,
	checkNegatives
}