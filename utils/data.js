const GETDATA_SLUGS = [
  'categories',
  'conversions',
  'constants',
  'magnitudes',
  'units',
  'values',
  'variables',
  'unitOf',
  'baseUnit',
];

const GETDATA_SLUGS_MAP = {
  'unitOf': 'magnitudes',
  'baseUnit': 'units',
};

const GETDATA_MAX_LEVEL = 2;

function isObject(obj) {
	return obj != null && obj.constructor.name === "Object"
}

async function getAllData($content, data, error, level = 0) {
	if(!data) return false;
	const nextLevel = level + 1;
	Object.keys(data).forEach(async (key) => {
		// If the key is in the allowed slugs, get the data from the content API
		// and replace the value with the data only if the level is less than the max level
		// to avoid infinite recursion
		if (GETDATA_SLUGS.includes(key) && level <= GETDATA_MAX_LEVEL) {
			const dataKey = data[key];
			// If the key is in the slug map, use the mapped key
			const contentPath = GETDATA_SLUGS_MAP[key] || key;

			// Check if we have an array of slugs
			if(Array.isArray(dataKey) && dataKey.length > 0) {
				const resultArray = dataKey.map(async (item) => {
					// If the item is an object then recurse into it
					if(isObject(item)) {
						return await getAllData($content, item, error, nextLevel);
					}
					// Otherwise get the data from the content API and then recurse into it
					else {
						const resultSingle = await $content(contentPath, item)
							.fetch()
							.catch((err) => {
								return error({ statusCode: 404 })
							});
						return await getAllData($content, resultSingle, error, nextLevel);
					}
				});
				// Resolve the array of promises and replace the value with the data
				data[key] = await Promise.all(resultArray);
			}

			// Otherwise check if its only a string (one slug)
			if(typeof data[key] === 'string') {
				// Get the data from the content API and then recurse into it
				const resultSingle = await $content(contentPath, dataKey)
					.fetch()
					.catch((err) => {
						return error({ statusCode: 404 })
					});
				// Replace the value with the data and recurse
				data[key] = await getAllData($content, resultSingle, error, nextLevel);
			}
		}
	});

	return data;
}

async function getData($content, params, error) {
	const { type, slug } = params;

	const data = await $content(type, slug)
		.fetch()
		.catch((err) => {
			return error({ statusCode: 404 })
		});

	const allData = await getAllData($content, data, error);


	return allData;
}

export default getData;