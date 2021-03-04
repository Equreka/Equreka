let Equreka = {
  // Constants
  TERM_SELECTOR: '.eqk',

  /**
   * Initialize Term Hover
   * 
   * Create Event Listener for all elements with the Equreka.TERM_SELECTOR class
   */
  initTermHover() {
    let elements = document.querySelectorAll(Equreka.TERM_SELECTOR);

    Array.from(elements).forEach(function(element) {
      element.addEventListener('pointerenter', (event) => { Equreka.termHover(event, element, 'add') }, false);
      element.addEventListener('pointerleave', (event) => { Equreka.termHover(event, element, 'remove') }, false);
    });
  },

  // Deprecated
  initMathJax() {
    MathJax = {
      loader: {
        load: ['[tex]/html']
      },
      tex: { 
        inlineMath: [['$', '$']],
        processEscapes: true,
        packages: { '[+]': ['html'] }
      },
      svg: {
        fontCache: 'global'
      },
      startup: {
        ready: () => {
          MathJax.startup.defaultReady()
          MathJax.startup.promise.then(() => resolve())
        }
      }
    }
  },

  termHover (event, element, action) {
    var type = false
    if(event.target == element) {
      var symbol = event.target.classList[2];
      
      // Type of term
      if(event.target.classList.contains('variable')) {
        type = 'variable';
      } else if(event.target.classList.contains('constant')) {
        type ='constant';
      }
      
      // If contains a type
      if(type) {
        const elements = document.querySelectorAll(`${Equreka.TERM_SELECTOR}.${type}.${symbol}`);
        Array.from(elements).forEach(function(element) {
          element.classList[action]('hover');
        });
      }
    }
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

}

export default Equreka;