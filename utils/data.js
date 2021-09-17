
const without = ['path', 'extension', 'dir', 'extension'];

const getConstant = async ($content, constant) => {
	if(!constant) return false;
	let data = await $content('constants', constant)
		.without(without)
		.fetch();
	if(data.units) {
		data['units'] = await getUnits($content, data.units);
	}
	if(data.values && data.values.length > 0) {
		data['values'] = await getValues($content, data.values);
	}
	return data;
};

const getUnit = async ($content, unit) => {
	if(!unit) return false;
	try {
		let data = await $content('units', unit)
			.without(without)
			.fetch();
		return data;
	} catch {
		return false;
	}
};

const getVariable = async ($content, variable) => {
	if(!variable) return false;
	try {
		let data = await $content('variables', variable)
			.without(without)
			.fetch();
		if(data['units']) {
			data['units'] = await getUnits($content, data['units']);
		}
		return data;
	} catch {
		return false;
	}
};

const getConstants = async ($content, constants) => {
	if(!constants && constants.length > 0) return false;
	for(let i = 0; i < constants.length; i++) {
		constants[i] = await getConstant($content, constants[i]);
	}
	return constants;
};

const getVariables = async ($content, variables) => {
	if(!variables  && variables.length > 0) return false;
	for(let i = 0; i < variables.length; i++) {
		variables[i] = await getVariable($content, variables[i]);
	}
	return variables;
};

const getValues = async ($content, values) => {
	if(!values && values.length > 0) return false;
	for(let i = 0; i < values.length; i++) {
		values[i].unit = await getUnit($content, values[i].unit);
	}
	return values;
};

const getUnits = async ($content, units) => {
	if(!units && units.length > 0) return false;
	for(let i = 0; i < units.length; i++) {
		units[i] = await getUnit($content, units[i]);
	}
	return units;
};

export default async ($content, params, error, calc = false) => {
	const { category, type, slug } = params;
	const where = calc ? {} : { category: category };
	let data = await $content(type, slug)
		.where(where)
		.without(without)
		.fetch();

	if(data.units) {
		data.units = await getUnits($content, data.units);
	}
	// Get constants
	if(data.constants) {
		data.constants = await getConstants($content, data.constants);
	}
	// Get variables
	if(data.variables) {
		data.variables = await getVariables($content, data.variables);
	}
	// Get values
	if(data.values) {
		data.values = await getValues($content, data.values);
	}

	return data;
}