const getCategory = async ($content, category) => {
	if(!category) return false;
	try {
		let data = await $content('categories', category).fetch();
		return data;
	} catch {
		return false;
	}
};

const getConstant = async ($content, constant) => {
	if(!constant) return false;
	try {
		let data = await $content('constants', constant).fetch();
		if(data.units) {
			data['units'] = await getUnits($content, data.units);
		}
		if(data.values) {
			data['values'] = await getValues($content, data.values);
		}
		return data;
	} catch {
		return false;
	}
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
		if(data['baseUnit']) {
			data['baseUnit'] = await getUnit($content, data['baseUnit']);
		}
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
		if(data['baseUnit']) {
			data['baseUnit'] = await getUnit($content, data['baseUnit']);
		}
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
	if(!categories) return false;
	let returnData = [];
	if(typeof data === 'string') {
		returnData[0] = await getCategory($content, categories[0]);
	} else {
		for(let i = 0; i < categories.length; i++) {
			returnData[i] = await getCategory($content, categories[i]);
		}
	}
	return returnData;
};

const getConstants = async ($content, constants) => {
	if(!constants) return false;
	let returnData = [];
	if(typeof data === 'string') {
		returnData[0] = await getCategory($content, constants[0]);
	} else {
		for(let i = 0; i < constants.length; i++) {
			returnData[i] = await getConstant($content, constants[i]);
		}
	}
	return returnData;
};

const getMagnitudes = async ($content, magnitudes) => {
	if(!magnitudes) return false;
	let returnData = [];
	if(typeof magnitudes === 'string') {
		returnData[0] = await getMagnitude($content, magnitudes);
	} else {
		for(let i = 0; i < magnitudes.length; i++) {
			returnData[i] = await getMagnitude($content, magnitudes[i]);
		}
	}
	return returnData;
};

const getVariables = async ($content, variables) => {
	if(!variables) return false;
	let returnData = [];
	if(typeof data === 'string') {
		returnData[0] = await getCategory($content, variables[0]);
	} else {
		for(let i = 0; i < variables.length; i++) {
			returnData[i] = await getVariable($content, variables[i]);
		}
	}
	return returnData;
};

const getValues = async ($content, values) => {
	if(!values) return false;
	let returnData = [];
	if(typeof values === 'string') {
		returnData[0] = values;
		returnData[0].units = await getUnit($content, values.units);
	} else {
		for(let i = 0; i < values.length; i++) {
			returnData[i] = values[i];
			returnData[i].units = await getUnit($content, values[i].units);
		}
	}
	return returnData;
};

const getUnits = async ($content, units) => {
	if(!units) return false;
	let returnData = [];
	if(typeof units === 'string') {
		returnData[0] = await getUnit($content, units);
	} else {
		for(let i = 0; i < units.length; i++) {
			returnData[i] = await getUnit($content, units[i]);
		}
	}
	return returnData;
};

const getConversions = async ($content, data) => {
	if(!data) return false;
	let returnData = [];
	if(typeof units === 'string') {
		returnData[0] = data;
		returnData[0].units = await getUnit($content, data);
	} else {
		for(let i = 0; i < data.length; i++) {
			returnData[i] = data[i];
			returnData[i].units = await getUnit($content, data[i].units);
		}
	}
	return returnData;
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export default async ($content, params, error) => {
	const { type, slug } = params;
	// Get the data
	let data = await $content(type, slug)
		.fetch()
		.catch((err) => {
			return error({ statusCode: 404 })
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
const testnested = async ($content, property, data) => {
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

const testget = async ($content, property, data) => {
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
