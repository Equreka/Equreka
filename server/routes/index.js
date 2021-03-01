const router=           require('express').Router();
const routerCategories= require('./api/categories');
const routerEntries=    require('./api/entries');
const routerUnits=      require('./api/units');
const routerConstants=  require('./api/constants');
const routerVariables=  require('./api/variables');

// Routes
router.use('/entries',    routerEntries);
router.use('/categories', routerCategories);
router.use('/units',      routerUnits);
router.use('/constants',  routerConstants);
router.use('/variables',  routerVariables);

module.exports = router;