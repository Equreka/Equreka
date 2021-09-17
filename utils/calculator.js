const Calculator = {
	/**
	 * Constants
	 */
	DEFAULT_PRECISION: 7,
	/**
	 * Format value
	 * Return the value with scientific notation if needed and parse it for HTML
	 * Example: 3000000000000 => 3e<sup>+15</sup>
	 * @param {*} result 
	 * @param {*} precision 
	 * @returns 
	 */
	formatValue(result, precision = Calculator.DEFAULT_PRECISION) {
		const valuePrecision = result > 100000 || result < 0.00001 ? Number(result).toPrecision(precision) : Number(result);
		if(typeof valuePrecision !== 'string') {
			return valuePrecision;
		}
		const array = valuePrecision.split('e'),
				value = array[0],
				exp = array[1],
				expSign = exp ? exp.charAt(0) : false,
				expNumber = exp ? exp.slice(1) : false;
		let formated = value ? `${value}` : 'error';
		if(value && exp) {
			formated += ` <span class="math math-exp">e</span>`;
			if(!expSign && !expNumber) {
				formated += `<sup>${exp}</sup>`;
			} else {
				const signClass = (expSign == '+') ? 'plus' : 'minus';
				formated += `<sup><span class="math math-exp-sign ${signClass}">${expSign}</span><span class="math math-exp-value">${expNumber}</span></sup>`;
			}
			
		}
		return formated;
	},

	/**
	 * Format Output
	 * Return the output with the variable symbol, value and unit
	 * Example: "E = 14223e-14 J"
	 * @param {*} result 
	 * @param {*} precision 
	 * @returns 
	 */
	formatOutput(result, precision = Calculator.DEFAULT_PRECISION) {
		const equality = !result.exact ? '=' : '≈';
		const formated = `<span class="mx-1 math math-symbol-variable">${result.variable}</span><span class="mx-1 math math-symbol-equality">${equality}</span><span class="mx-1 math math-value-result">${Calculator.formatValue(result.value, precision)}</span><span class="mx-1 math math-symbol-unit">${result.unit}</span>`;
		return formated;
	}
}

export default Calculator;