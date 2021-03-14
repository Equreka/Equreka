let Equreka = {

  //
  // Constants
  //

  CATEGORIES:  ['universal', 'chemistry', 'mathematics', 'physics'],
  TYPES:       ['constants', 'equations', 'formulas', 'units', 'variables'],
  TERM_SELECTOR:     '.eqk',
  TRANSITION_TIMING: 350,
  
  //
  //  Functions
  //

  /**
   * Log
   * 
   * Simple and usefull command to log
   * 
   * @param {*} log   Data to log
   * @param {*} depth Depth
   */
  log(log, depth = null) {
    console.dir(log, { depth: depth});
  },

  /**
   * Initialize Term Hover
   * 
   * Create Event Listener for all elements with the Equreka.TERM_SELECTOR class
   */
  initTermHover() {
    window.addEventListener('click', (event) => {  Equreka.termHoverRemover(event) } , false);

    let elements = document.querySelectorAll(Equreka.TERM_SELECTOR);
    Array.from(elements).forEach(function(element) {
      element.addEventListener('pointerenter', (event) => { Equreka.termHover(event, element) }, false);
      if(window.innerWidth >= 768) {
        element.addEventListener('pointerleave', Equreka.termHoverRemover, false);
      }
    });
  },

  /**
   * Term Hover
   * 
   * On hover adds class 'hover' to all elements that matches TERM_SELECTOR
   * 
   * @param {string} event   Event to watch for
   * @param {string} element Element
   */
  termHover (event, element) {
    var type = false
    if(event.target == element) {
      var symbol = event.target.classList[2];
      
      // Type of term
      if(event.target.classList.contains('variable')) {
        type = 'variable';
      } else if(event.target.classList.contains('constant')) {
        type ='constant';
      }
      
      // Remove classes from everything else
      Equreka.termHoverRemover();

      // If contains a type
      if(type) {
        const elements = document.querySelectorAll(`${Equreka.TERM_SELECTOR}.${type}.${symbol}`);
        Array.from(elements).forEach(function(element) {
          element.classList.add('hover');
        });
      }
    }
  },

  /**
   * Term Hover Remover
   * 
   * Removes class hover from all elements that have that class
   * 
   * @param {string} event 
   */
  termHoverRemover (event) {
    // Prevents remove on term with class "hover"
    if(event && event.target.parentNode.classList.contains('hover')) return;
    // Remove class hover from all elements with class "hover"
    const elements = document.querySelectorAll(`${Equreka.TERM_SELECTOR}.hover`);
    Array.from(elements).forEach(function(element) {
      element.classList.remove('hover');
    });
  },

 /**
  * Parser LaTeX
  * 
  * Function that adds the term-selector, type and term to LaTeX command-class of the term from our custom LaTeX command (\(var|const){X})
  * Ex. \var{X} -> \class{eqk variable X}{X}
  * 
  * @param {string} data Expression / Description
  */
  parserLaTeX (data) {
    const classPrefix = Equreka.TERM_SELECTOR.substring(1);
    const regex = /\\(var|const)\{(.*?)\}/g;
    let parsedData;

    parsedData = data.replace(regex, function(global, type, symbol) {
      var type = (type === 'var') ? 'variable' : 'constant';
      return `\\class{${classPrefix} ${type} ${symbol}}{${symbol}}`;
    });

    return parsedData;
  },

  /**
   * Parser Cleaner
   * 
   * Simple function to remove our custom LaTeX command
   * Ex. \var{X} -> X
   * 
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
   * JSON Download
   * 
   * Concatenate "type" to make the anchor link downloadable
   * 
   * @param {object} json Data to download
   */
  jsonDownload (json) {
    let type = "data:text/json;charset=utf-8,";
    let href = type + encodeURIComponent(JSON.stringify(json));

    return href;
  },

  /**
   * Copy to clipboard
   * 
   * Simple function to clipboard from selector
   * 
   * @param {string} clipboard Query selector
   */
  copyClipboard (clipboard) {
    let selector = document.querySelector(clipboard);
    
    selector.select();
    selector.setSelectionRange(0, 99999);
    document.execCommand("copy");

    alert('Copied to clipboard successfully');
  },

  /**
   * Theme Transition (needs @nuxtjs/color-mode)
   * 
   * Detects if transition needs to be done when changing from theme mode
   * by adding class 'theme-transition'
   * 
   * @param {string}  newTheme     New theme mode
   * @param {string}  actualTheme  Actual theme mode value (variable by @nuxtjs/color-mode)
   * @param {boolean} systemQuery  Watcher for prefers-color-scheme: dark (boolean by @nuxtjs/color-mode)
   */
  themeTransition (newTheme, actualTheme, systemQuery) {
    // if false default theme is dark 
    var systemTheme = (systemQuery) ? 'dark' : 'light';
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
      }, Equreka.TRANSITION_TIMING);
    }    
  },

  /**
   * Format Number
   * Format the number for better reading
   * 
   * Ex. 1000000 -> 1,000,000
   * @param {number} value Number to format
   * @returns 
   */
  formatNumber (number) {
    //Equreka.log(typeof number);
    // Undefined to get browser default format depending on user locale
    if(typeof number == 'string') {
      return number;
    } else {
      return number.toLocaleString(undefined, { minimumFractionDigits: 2 });
    }
  },

  //
  //  Favorites
  //

  /**
   * Favorites: Get Favorites
   * 
   * Gets all favorites stored in localStorage as a JSON string
   * 
   * @param   {string}          type Type of data
   * @returns {object, boolean} 
   */
  async getFavorites (type) {
    let dataArray = [];
    let dataStorage;

    try {
      dataStorage = JSON.parse(localStorage.getItem(`equreka-favorites-${type}`));
    } catch {
      dataStorage = false;
    }

    if(dataStorage) {
      for (let i = 0, c = 0; i < dataStorage.length; i++) {
        const element = dataStorage[i];
        let data = await fetch(
          process.env.baseUrl + '/api/' + type + '/id/' + element
        ).then((res) => res.json());
        if(data) {
          dataArray[c] = data
          c++;
        }
      }
      return dataArray;
    } else {
      return false;
    }
  },

  /**
   * Have Favorites
   * 
   * Check if there is items and key inn localStorage favorites
   * 
   * @param   {object}  object 
   * @returns {boolean}
   */
  haveFavorites(object) {
    if(Object.keys(object).length === 0) return false;

    let isEmpty = 0;

    // Check every object
    for (const key in object) {
      if (Object.hasOwnProperty.call(object, key)) {
        const element = object[key];
        if(Object.keys(element).length != 0) {
          isEmpty++;
        }
      }
    }

    isEmpty = (isEmpty === 0) ? false : true;

    return isEmpty;
  },
  /**
   * Add Favorite
   * @param   {string}   type Type of data
   * @param   {ObjectId} id   ObjectID
   * @returns {boolean}
   */
  addFavorite(type, id) {
    if(!type || !id) return false;
    
    if (typeof(Storage) !== "undefined") {
      var favoritesValue = id;
      var favoritesKey =   `equreka-favorites-${type}`;

      // If array already exists
      if(localStorage.getItem(favoritesKey)) {
        var favoritesArray = JSON.parse(localStorage.getItem(favoritesKey));
        
        if(!favoritesArray.includes(favoritesValue)) {
          favoritesArray.push(favoritesValue);
        }
      } else {
        var favoritesArray = [];
        favoritesArray[0] = favoritesValue;
      }

      // Save it to localStorage
      localStorage.setItem(favoritesKey, JSON.stringify(favoritesArray));

      return true;
    } else {
      return false;
    }
  },

  checkFavorite(type, id) {
    if(!type || !id) return false;

    if (typeof(Storage) !== "undefined") {
      var favoritesValue = id;
      var favoritesKey =   `equreka-favorites-${type}`;

      // If array already exists
      if(localStorage.getItem(favoritesKey)) {
        var favoritesArray = JSON.parse(localStorage.getItem(favoritesKey));
        if(favoritesArray.includes(favoritesValue)) {
          return true;
        } else {
          return false;
        }
      } else {
        return false
      }
    } else {
      return false;
    }
  },

  /**
   * Favorites: Remove Favorite
   * 
   * Delete ObjectId from array or delets the key if there is no favorites at all
   * 
   * @param {string} type Type of data
   * @param {ObjectId} id   ObjectId of the data
   * @returns {boolean}
   */
  removeFavorite(type, id) {
    if(!type || !id) return false;
    
    // Get localStorage data
    let dataStorage;
    try {
      dataStorage = JSON.parse(localStorage.getItem(`equreka-favorites-${type}`));
    } catch {
      dataStorage = false;
    }

    if(dataStorage) {
      const index = dataStorage.indexOf(id);
      if (index > -1) {
        dataStorage.splice(index, 1);
      }

      if(dataStorage.length != 0) {
        localStorage.setItem(`equreka-favorites-${type}`, JSON.stringify(dataStorage));
      } else {
        localStorage.removeItem(`equreka-favorites-${type}`);
      }
      return true;
    } else {
      return false;
    }
  }
  // End
}

export default Equreka;