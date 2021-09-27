const Utils = {
	TERM_SELECTOR: 'equreka-term',
	/**
		* Initialize Term Hover
		* 
		* Create Event Listener for all elements with the Utils.TERM_SELECTOR class
		*/
	initTermHover() {
		let elements = document.querySelectorAll(`.${Utils.TERM_SELECTOR}`);
		Array.from(elements).forEach(function(element) {
			element.addEventListener('pointerenter', (event) => { 
				Utils.termHover(event, element);
			}, false);
			if(window.innerWidth >= 768) {
				element.addEventListener('pointerleave', (event) => {
					Utils.termHoverRemover(event);
				}, false);
			}
		});
		// Add Event Listener for touch devices for term hover remover
		// This is needed because the pointerleave event is not triggered on touch devices
		window.addEventListener('click', (event) => { 
			Utils.termHoverRemover(event);
		}, false);
	},

	/**
	 * Term Hover
	 * On hover adds class 'hover' to all elements that matches TERM_SELECTOR
	 * @param {string} event   Event to watch for
	 * @param {string} element Element
	 */
	termHover (event, element) {
		if(event.target == element) {
			// Remove classes from everything else
			Utils.termHoverRemover();
			const classList = event.target.classList,
					classSymbol = classList[classList.length-1],
					selector = Utils.TERM_SELECTOR,
					selectorHover = `${selector}-hover`,
					selectorAll = `.${selector}.${classSymbol}`,
					elements = document.querySelectorAll(selectorAll);
			// Add class to all elements that matches the selector
			Array.from(elements).forEach(function(element) {
				element.classList.add(selectorHover);
			});
		}
	},

	/**
	 * Term Hover Remover
	 * Removes class hover from all elements that have that class
	 * @param {string} event 
	 */
	termHoverRemover (event) {
		// Prevents remove on term with class "hover"
		const selector = Utils.TERM_SELECTOR,
				selectorHover = `.${Utils.TERM_SELECTOR}-hover`;
		if(event && event.target.parentNode.classList.contains(selector)) return;
		// Remove class hover from all elements with class "hover"
		const elements = document.querySelectorAll(selectorHover);
		Array.from(elements).forEach(function(element) {
			element.classList.remove(selectorHover.slice(1));
		});
	},

	/**
	 * Parser TeX
	 * Function that adds the term-selector, type and term to LaTeX command-class of the term from our custom LaTeX command (\(var|const){X})
	 * Ex. \var{X} -> \class{eqk variable X}{X}
	 * @param {string} data Expression / Description
	 */
	parserTeX (data) {
		if(!data) return;
		const classPrefix = 'equreka';
		const regex = /\\(var|const|mag)\{(.*?)\}/g;
		const parsedData = data.replace(regex,
			function(global, type, symbol) {
				// Classes to be added
				let   classSelector = Utils.TERM_SELECTOR,
				      classSymbol   = `${classPrefix}-${symbol}`,
				      classType     = `${classPrefix}-constant`;
				if(type == 'var') classType = `${classPrefix}-variable`;
				if(type == 'mag') classType = `${classPrefix}-magnitude`;
				// Final class to be added
				const classTeX = `${classSelector} ${classType} ${classSymbol}`;
				// Return it
				return '\\class{' + classTeX + '}{' + symbol + '}';
			}
		);
		return parsedData;
	},

	/**
	 * Parser Cleaner
	 * Simple function to remove our custom LaTeX command
	 * Ex. \var{X} -> X
	 * @param {string}  data        Expression / Description
	 * @param {boolean} removeSigns removes $ that activates MathJax
	 */
	parserCleaner (data, removeSigns = false) {
		if(!data) return;
		const regex = /\\(var|const)\{(.*?)\}/g;
		let parsedData;
		parsedData = data.replace(regex, function(global, type, symbol) {
			return symbol;
		});
		if(removeSigns) {
			parsedData = parsedData.replace(/\$(.*?)\$/g, '$1');
		}
		return parsedData;
	},
	
	/**
	 * Laguages utilities
	 */
	getLanguage() {
		let language = 'en';
		if(localStorage) language = localStorage.getItem(`equreka-settings-language`);
		return language;
	},

	setLanguage(language) {
		if(!language) return false;
		if(!localStorage) return false;
		localStorage.setItem(`equreka-settings-language`, language);
		return true;
	},

	/**
	 * Theme Transition (needs @nuxtjs/color-mode)
	 * Detects if transition needs to be done when changing from theme mode
	 * by adding class 'theme-transition'
	 * @param {string}  newTheme     New theme mode
	 * @param {string}  actualTheme  Actual theme mode value (variable by @nuxtjs/color-mode)
	 * @param {boolean} systemQuery  Watcher for prefers-color-scheme: dark (boolean by @nuxtjs/color-mode)
	 */
	themeTransition (newTheme, actualTheme) {
		// Set system default theme
		var systemTheme = (window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
		// if newTheme value is system change it to systemTheme
		if(newTheme == 'system') {
			newTheme = systemTheme;
		}
		// Simple magic lvl. 1
		if(newTheme != actualTheme) {
			const root = document.documentElement;
			root.classList.add('theme-transition');
			setTimeout(() => {
				root.classList.remove('theme-transition');
			}, 350);
		}
	}
}

export default Utils;