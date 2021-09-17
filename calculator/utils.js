
/**
 * isIn - Check if variables are in the input
 * @param {array}  array Arrary with variables that are needed
 * @param {object} input Input to check if has the variables
 * @returns {boolean} true if all variables are in the input
 */
function isIn(array, input) {
	return array.every(variable => Object.keys(input).includes(variable));
}

// Export
export {
	isIn
}