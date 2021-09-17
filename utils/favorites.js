const Favorites = {
	STORAGE_KEY: 'equreka-favorites-',

	/**
	* Favorites: Get Favorites
	* Gets all favorites stored in localStorage as a JSON string
	* @param   {string} type
	* @returns {object, false}
	*/
	async get(type) {
		let data;
		if(localStorage.getItem(Favorites.STORAGE_KEY + type)) {
			data = JSON.parse(localStorage.getItem(Favorites.STORAGE_KEY + type));
		} else {
			data = false;
		}
		return data;
	},

	/**
	 * Have Favorites
	 * Check if user have favorites if so return true else false
	 * @param   {object}  object
	 * @returns {boolean}
	 */
	have(object) {
		if(!object || Object.keys(object).length === 0) return false;
		let isEmpty = 0;
		// Check every object
		for (var key in object) {
			if (Object.hasOwnProperty.call(object, key)) {
				if(object[key] && object[key].length > 0) isEmpty++;
			}
		}
		return (isEmpty === 0) ? false : true;
	},

	/**
	 * Check Favorite
	 * @param {string} type 
	 * @param {string} slug 
	 * @returns {boolean}
	 */
	 check(type, slug) {
		// If no variables are passed or can't access storage, return false
		if(!type || !slug || typeof(Storage) === "undefined") return false;
		// Check favorite
		const key = Favorites.STORAGE_KEY + type;
		const array = JSON.parse(localStorage.getItem(key));
		if(array && array.includes(slug)) return true;
		// Anything else return false
		return false
	},

	/**
	 * Add Favorite
	 * @param   {string}  type Type of data
	 * @param   {slug}    slug Slug of data
	 * @returns {boolean}
	 */
	add(type, slug) {
		// If no variables are passed or can't access storage, return false
		if(!type || !slug || typeof(Storage) === "undefined") return false;
		// Add favorites
		const key = Favorites.STORAGE_KEY + type;
		// If array already exists
		let data;
		if(localStorage.getItem(key)) {
			data = JSON.parse(localStorage.getItem(key));
			if(!data.includes(slug)) {
				data.push(slug);
			} else {
				data = [slug];
			}
		} else {
			data = [slug];
		}
		// Save it to localStorage
		localStorage.setItem(key, JSON.stringify(data));
		return true;
	},

	/**
	 * Favorites: Remove
	 * @param {string} type Type of data
	 * @param {string} slug Slug of data
	 * @returns {boolean}
	 */
	remove(type, slug) {
		// If no variables are passed or can't access storage, return false
		if(!type || !slug || typeof(Storage) === "undefined") return false;
		// Get localStorage data
		const key = Favorites.STORAGE_KEY + type;
		const dataStorage = JSON.parse(localStorage.getItem(key));

		if(dataStorage) {
			const index = dataStorage.indexOf(slug);
			if (index > -1) dataStorage.splice(index, 1);
			if(dataStorage.length != 0) {
				localStorage.setItem(key, JSON.stringify(dataStorage));
			} else {
				localStorage.removeItem(key);
			}
			return true;
		}
		return false;
	},
}
export default Favorites;