
const without = ['path', 'extension'];

const getConstant = async ($content, constant, only = false) => {
	if(!constant) return false;
	let data = await $content('constants', constant)
		.only(only)
		.without(without)
		.fetch();
	if(data.units) {
		data['units'] = await getUnits($content, data.units, ['name', 'slug', 'symbol', 'category', 'dir']);
	}
	if(data.values && data.values.length > 0) {
		data['values'] = await getValues($content, data.values);
	}
	return data;
};

const getUnit = async ($content, unit, only = false) => {
	if(!unit) return false;
	try {
		let data = await $content('units', unit)
			.only(only)
			.without(without)
			.fetch();
		return data;
	} catch {
		return false;
	}
};

const getMagnitude = async ($content, magnitude, only = false) => {
	if(!magnitude) return false;
	try {
		let data = await $content('magnitudes', magnitude)
			.only(only)
			.without(without)
			.fetch();
		if(data['units']) {
			data['units'] = await getUnits($content, data['units'], ['name', 'slug', 'symbol', 'category', 'dir']);
		}
		return data;
	} catch {
		return false;
	}
};

const getVariable = async ($content, variable, only = false) => {
	if(!variable) return false;
	try {
		let data = await $content('variables', variable)
			.only(only)
			.without(without)
			.fetch();
		if(data['units']) {
			data['units'] = await getUnits($content, data['units'], ['name', 'slug', 'symbol', 'category', 'dir']);
		}
		return data;
	} catch {
		return false;
	}
};

const getConstants = async ($content, constants, only = false) => {
	if(!constants && constants.length > 0) return false;
	for(let i = 0; i < constants.length; i++) {
		constants[i] = await getConstant($content, constants[i], only);
	}
	return constants;
};

const getMagnitudes = async ($content, magnitudes, only = false) => {
	if(!magnitudes  && magnitudes.length > 0) return false;
	for(let i = 0; i < magnitudes.length; i++) {
		magnitudes[i] = await getMagnitude($content, magnitudes[i], only);
	}
	return magnitudes;
};

const getVariables = async ($content, variables, only = false) => {
	if(!variables  && variables.length > 0) return false;
	for(let i = 0; i < variables.length; i++) {
		variables[i] = await getVariable($content, variables[i], only);
	}
	return variables;
};

const getValues = async ($content, values, only = false) => {
	if(!values && values.length > 0) return false;
	for(let i = 0; i < values.length; i++) {
		values[i].unit = await getUnit($content, values[i].unit, only);
	}
	return values;
};

const getUnits = async ($content, units, only = false) => {
	if(!units && units.length > 0) return false;
	for(let i = 0; i < units.length; i++) {
		units[i] = await getUnit($content, units[i], only);
	}
	return units;
};

const getConversions = async ($content, conversions) => {
	if(!conversions && conversions.length > 0) return false;
	for(let i = 0; i < conversions.length; i++) {
		conversions[i].unit = await getUnit($content, conversions[i].unit, ['name', 'slug', 'symbol', 'category', 'dir']);
	}
	return conversions;
};

export default async ($content, params, error, calc = false) => {
	const { category, type, slug } = params;
	// Get the
	let data = await $content(type, slug)
		.without(without)
		.fetch()
		.catch((err) => {
			error({ statusCode: 404 })
		});
	// Get units
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
	// Get magnitudes
	if(data.magnitudes) {
		data.magnitudes = await getMagnitudes($content, data.magnitudes);
	}
	// Get values
	if(data.values) {
		data.values = await getValues($content, data.values);
	}
	// Get conversions
	if(data.conversions) {
		data.conversions = await getConversions($content, data.conversions);
	}
	// Return
	return data;
}