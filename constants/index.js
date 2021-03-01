let Equreka = {
  // Constants
  TERM_SELECTOR: '.eqk-term',

  // Initialize
  initTermHover() {
    var elements = document.querySelectorAll(Equreka.TERM_SELECTOR);
    //var sel = document.getElementById('expression').firstChild;
    //sel.addEventListener('mouseenter', (event) => { equrekaHover2(event, 'add') }, false);
    Array.from(elements).forEach(function(element) {
      element.addEventListener('pointerenter', (event) => { Equreka.termHover(event, element, 'add') }, false);
      element.addEventListener('pointerleave', (event) => { Equreka.termHover(event, element, 'remove') }, false);
    });
  },

  initMathJax() {
    window.MathJax = {
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

  parserLaTeX (data) {
    let parsedData;
    const classPrefix = Equreka.TERM_SELECTOR.substring(1);
    const regex = /\\(var|const)\{(.*?)\}/g;
    parsedData = data.replace(regex, function(global, type, symbol) {
      var type = (type === 'var') ? 'variable' : 'constant';
      return `\\class{${classPrefix} ${type} ${symbol}}{${symbol}}`;
    });
    return parsedData;
  },

  parserCleaner (data, removeSigns = false) {
    let parsedData;
    const classPrefix = Equreka.TERM_SELECTOR.substring(1);
    const regex = /\\(var|const)\{(.*?)\}/g;
    parsedData = data.replace(regex, function(global, type, symbol) {
      return symbol;
    });

    if(removeSigns) {
      parsedData = parsedData.replace(/\$(.*?)\$/g, '$1');
    }

    return parsedData;
  },

  jsonDownload (json) {
    let type = "data:text/json;charset=utf-8,";
    return type + encodeURIComponent(JSON.stringify(json));
  }

}

export default Equreka;