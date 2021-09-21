const getCategory = async ($content, category) => {
	if(!category) return false;
	try {
		let data = await $content('categories', category)
			.fetch();
		return data;
	} catch {
		return false;
	}
};

const getConstant = async ($content, constant) => {
	if(!constant) return false;
	let data = await $content('constants', constant)
		.fetch();
	if(data.units && data.units.length > 0) {
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
		return await $content('units', unit).fetch();
	} catch {
		return false;
	}
};

const getMagnitude = async ($content, magnitude) => {
	if(!magnitude) return false;
	try {
		let data = await $content('magnitudes', magnitude).fetch();
		if(data['units']) {
			data['units'] = await getUnits($content, data['units']);
		}
		return data;
	} catch {
		return false;
	}
};

const getVariable = async ($content, variable) => {
	if(!variable) return false;
	try {
		let data = await $content('variables', variable).fetch();
		if(data['units']) {
			data['units'] = await getUnits($content, data['units']);
		}
		return data;
	} catch {
		return false;
	}
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getCategories = async ($content, categories) => {
	if(!categories && categories.length > 0) return false;
	for(let i = 0; i < categories.length; i++) {
		categories[i] = await getCategory($content, categories[i]);
	}
	return categories;
};

const getConstants = async ($content, constants) => {
	if(!constants && constants.length > 0) return false;
	for(let i = 0; i < constants.length; i++) {
		constants[i] = await getConstant($content, constants[i]);
	}
	return constants;
};

const getMagnitudes = async ($content, data) => {
	if(!data) return false;
	if(typeof data === 'string') {
		data = [];
		data[0] = await getMagnitude($content, data);
	}
	for(let i = 0; i < data.length; i++) {
		data[i] = await getMagnitude($content, data[i]);
	}
	return data;
};

const getVariables = async ($content, variables) => {
	if(!variables  && variables.length > 0) return false;
	for(let i = 0; i < variables.length; i++) {
		variables[i] = await getVariable($content, variables[i]);
	}
	return variables;
};

const getValues = async ($content, data) => {
	if(!data) return false;
	for(let i = 0; i < data.length; i++) {
		data[i].unit = await getUnit($content, data[i].unit);
	}
	return data;
};

const getUnits = async ($content, data) => {
	if(!data) return false;
	if(typeof data === 'string') {
		data[0] = await getUnit($content, data);
	}
	for(let i = 0; i < data.length; i++) {
		data[i] = await getUnit($content, data[i]);
	}
	return data;
};

const getConversions = async ($content, data) => {
	if(!data && data.length > 0) return false;
	for(let i = 0; i < data.length; i++) {
		data[i].unit = await getUnit($content, data[i].unit);
	}
	return data;
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export default async ($content, params, error) => {
	const { type, slug } = params;
	// Get the data
	let data = await $content(type, slug)
		.fetch()
		.catch((err) => {
			error({ statusCode: 404 })
		});

	// Get categories
	if(data.categories) {
		data.categories = await getCategories($content, data.categories);
	}
	// Get units
	if(data.units) {
		data.units = await getUnits($content, data.units);
	}
	// Get unit of
	if(data.unitOf) {
		data.unitOf = await getMagnitudes($content, data.unitOf);
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


// Experimental
const nested = async ($content, property, data) => {
	if(!data) return false;
	if(typeof data === 'string') {
		return await get($content, property, data);
	}
	let getData = [];
	for(let i = 0; i < data.length; i++) {
		getData[i] = await get($content, property, data[i]);
	}
	return getData;
	
};

const get = async ($content, property, data) => {
	if(!data) return false;
	console.log(property)
	try {
		data = await $content(property, data).fetch();
		if(data['units']) {
			data['units'] = await get($content, 'units', data['units']);
		}
		if(data['values']) {
			data['values'] = await getValues($content, data['values']);
		}
		return data;
	} catch {
		return false;
	}
}
