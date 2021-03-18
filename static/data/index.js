let dbOffline = {};

dbOffline.categories= require("./categories.json");
dbOffline.constants=  require("./constants.json");
dbOffline.equations=  require("./equations.json");
dbOffline.formulas=   require("./formulas.json");
dbOffline.units=      require("./units.json");
dbOffline.variables=  require("./variables.json");

module.exports = dbOffline;