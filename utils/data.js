import Utils from './index';

const GETDATA_SLUGS = [
	'categories',
	'conversions',
	'constants',
	'magnitudes',
	'units',
	'values',
	'variables',
];

const GETDATA_SLUGS_MAP = {
	'unitOf': 'magnitudes',
	'baseUnit': 'units',
};

const GETDATA_MAX_LEVEL = 2;


/**
 * Check slug
 * @description Check if the slug is in the allowed slugs
 * @param {string} slug - Slug of the data to check
 * @returns {boolean}
 */
function checkSlug(slug) {
	return GETDATA_SLUGS.includes(slug) || Object.keys(GETDATA_SLUGS_MAP).includes(slug);
}

/**
 * Get content path
 * @description Get the path for content API function to retrieve data
 * @param   {string} slug - Slug of the data to get
 * @returns {string}
 */
function getContentPath(slug) {
	return Object.keys(GETDATA_SLUGS_MAP).includes(slug)
		? GETDATA_SLUGS_MAP[slug]
		: slug;
}

/**
 * Get single data
 * @description Function to get data from Content API
 * @param   {function} $content - Nuxt Content function
 * @param   {string}   path     - Path where the data is in content directory
 * @param   {string}   slug     - Slug of file to get
 * @param   {function} error    - Error function
 * @returns {object}   Parsed data
 */
async function getSingleData($content, path, slug, error) {
	if(!path || !slug) false;
	const data = $content(path, slug)
		.fetch()
		.catch((err) => {
			return error({ statusCode: 404 })
		});

	return data;
}

/**
 * Get all data
 * @description Recursive function to get all data from Content API
 * @param   {function} $content     - Nuxt Content function
 * @param   {object}   data         - Data object to be parsed
 * @param   {function} error        - Error function
 * @param   {number}   currentLevel - Current level of recursion
 * @returns {object}   Parsed data
 */
async function getAllData($content, data, error, currentLevel = 0) {
	if (!data) return false;
	const nextLevel = currentLevel + 1;
	const dataKeys = Object.keys(data);

	dataKeys.forEach(
		async (key) => {
			// If the key is in the allowed slugs, get the data from the content API
			// and replace the value with the data only if the level is less than the max level
			// to avoid infinite recursion
			if (checkSlug(key) && currentLevel <= GETDATA_MAX_LEVEL) {
				const dataKey = data[key];
				// If the key is in the slug map, use the mapped key
				const contentPath = getContentPath(key);
				// Check if we have an array of slugs
				if (Utils.checkArray(dataKey)) {
					const resultArray = dataKey.map(
						async (item) => {
							// If the item is an object then recurse into it
							if (Utils.isObject(item)) {
								const data = item;
								return await getAllData($content, data, error, nextLevel);
							}
							// Otherwise get the data from the content API and then recurse into it
							else {
								const slug = item;
								const dataSingle = await getSingleData($content, contentPath, slug, error);
								const dataDeep = await getAllData($content, dataSingle, error, nextLevel);
								return dataDeep;
							}
						}
					);
					// Resolve the array of promises and replace the value with the data
					data[key] = await Promise.all(resultArray);
				}

				// Otherwise check if its only a string (one slug)
				if(typeof dataKey === 'string') {
					const slug = dataKey;
					const dataSingle = await getSingleData($content, contentPath, slug, error);
					const dataDeep = await getAllData($content, dataSingle, error, nextLevel);
					// Replace the value with the data and recurse
					data[key] = dataDeep;
				}
			}
		}
	);

	return data;
}

/**
 * Get data
 * @description Function to get data from content and parse it with recursive function
 * @param   {function} $content - Nuxt Content function
 * @param   {object}   params   - Parameters to get data
 * @param   {function} error    - Error function
 * @returns {object}   Parsed data
 */
async function getData($content, params, error) {
	const { type, slug } = params;
	const dataSingle = await getSingleData($content, type, slug, error);
	const dataDeep = await getAllData($content, dataSingle, error);

	return dataDeep;
}

export default getData;