const Utils = {
	TERM_SELECTOR:     '.eqk',
	/**
		* Initialize Term Hover
		* 
		* Create Event Listener for all elements with the Utils.TERM_SELECTOR class
		*/
	initTermHover() {
		let elements = document.querySelectorAll(Utils.TERM_SELECTOR);
		if(elements.length === 0) return;
		Array.from(elements).forEach(function(element) {
			element.addEventListener('pointerenter', (event) => { 
				Utils.termHover(event, element);
			}, false);
			if(window.innerWidth >= 768) {
				element.addEventListener('pointerleave', Utils.termHoverRemover, false);
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
			let type = false,
				 classList = event.target.classList,
				 symbol = classList[classList.length-1];
			// Type of term
			if(classList.contains('variable')) {
				type = 'variable';
			}
			if(classList.contains('constant')) {
				type = 'constant';
			}
			if(classList.contains('magnitude')) {
				type = 'magnitude';
			}
			// Remove classes from everything else
			Utils.termHoverRemover();
			// If contains a type
			if(type) {
				const elements = document.querySelectorAll(`${Utils.TERM_SELECTOR}.${type}.${symbol}`);
				Array.from(elements).forEach(function(element) {
					element.classList.add('hover');
				});
			}
		}
	},

	/**
	 * Term Hover Remover
	 * Removes class hover from all elements that have that class
	 * @param {string} event 
	 */
	termHoverRemover (event) {
		// Prevents remove on term with class "hover"
		if(event && event.target.parentNode.classList.contains('hover')) return;
		// Remove class hover from all elements with class "hover"
		const elements = document.querySelectorAll(`${Utils.TERM_SELECTOR}.hover`);
		Array.from(elements).forEach(function(element) {
			element.classList.remove('hover');
		});
	},

	/**
	 * Parser LaTeX
	 * Function that adds the term-selector, type and term to LaTeX command-class of the term from our custom LaTeX command (\(var|const){X})
	 * Ex. \var{X} -> \class{eqk variable X}{X}
	 * @param {string} data Expression / Description
	 */
	parserLaTeX (data) {
		const classPrefix = Utils.TERM_SELECTOR.substring(1);
		const regex = /\\(var|const|mag)\{(.*?)\}/g;
		const parsedData = data.replace(regex, function(global, type, symbol) {
			let classType = 'constant',
				 classSymbol = symbol;
			if(type == 'var') classType = 'variable';
			if(type == 'mag') classType = 'magnitude';
			return `\\class{${classPrefix} ${classType} ${classSymbol}}{${symbol}}`;
		});
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
	 * Copy to clipboard
	 * Simple function to clipboard from selector
	 * @param {string} clipboard Query selector
	 */
	copyClipboard (clipboard) {
		let selector = document.querySelector(clipboard);
		selector.select();
		selector.setSelectionRange(0, 99999);
		document.execCommand("copy");
		alert('Copied to clipboard successfully');
	},
	
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
	},

	/**
	 * Format Number
	 * Format the number for better reading
	 * Ex. 1000000 -> 1,000,000
	 * @param {number} value Number to format
	 * @returns 
	 */
	formatNumber (number) {
		if(typeof number == 'string') return number;
		if(!number) return false;
		// Undefined to get browser default format depending on user locale
		return number.toLocaleString(undefined, { minimumFractionDigits: 2 });
	},
}

export default Utils;