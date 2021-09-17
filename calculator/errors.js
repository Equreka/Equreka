// Default
var errorDefault = {
	type: 'input.empty',
	message: 'no data'
},
// Input is empty
errorInputEmpty = errorDefault,
// All inputs have values
errorInputsAllFilled = {
	type: 'input.all_inputs_filled',
	message: 'all inputs have values'
},
// Input is not a number
errorInputValueNotANumber = {
	type: 'input.not_a_number',
	message: 'input is not a number'
},
// Input with negative values
errorInputNegativeValues = {
	type: 'input.invalid',
	message: 'negative values aren\'t allowed'
}

// Export
export default errorDefault;
export {
	errorDefault,
	errorInputsAllFilled,
	errorInputEmpty,
	errorInputNegativeValues,
	errorInputValueNotANumber
}