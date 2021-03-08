const router=           require('express').Router();
const routerCategories= require('./api/categories');
const routerConstants=  require('./api/constants');
const routerEquations=  require('./api/equations');
const routerFormulas=   require('./api/formulas');
const routerUnits=      require('./api/units');
const routerVariables=  require('./api/variables');

// Routes
router.use('/categories', routerCategories);
router.use('/constants',  routerConstants);
router.use('/equations',  routerEquations);
router.use('/formulas',   routerFormulas);
router.use('/units',      routerUnits);
router.use('/variables',  routerVariables);

// Export
module.exports = router;