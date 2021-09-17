const Calculator = {
	DEFAULT_PRECISION: 7,
	formatValue(result, precision = Calculator.DEFAULT_PRECISION) {
		const resultPrecision = result > 100000 || result < 0.00001 ? Number(result).toPrecision(precision) : Number(result);
		if(typeof resultPrecision !== 'string') {
			return resultPrecision;
		}
		const array = resultPrecision.split('e'),
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

	formatOutput(result, precision = Calculator.DEFAULT_PRECISION) {
		const equality = !result.exact ? '=' : '≈';
		const formated = `<span class="mx-1 math math-symbol-variable">${result.variable}</span><span class="mx-1 math math-symbol-equality">${equality}</span><span class="mx-1 math math-value-result">${Calculator.formatValue(result.value, precision)}</span><span class="mx-1 math math-symbol-unit">${result.unit}</span>`;
		return formated;
	}
}

export default Calculator;