const router = require('express').Router();
const routerEntries    = require('./api/entries');
const routerCategories = require('./api/categories');
const routerConstants  = require('./api/constants');
const routerVariables  = require('./api/variables');

// Routes
router.use('/entries',    routerEntries);
router.use('/categories', routerCategories);
router.use('/constants',  routerConstants);
router.use('/variables',  routerVariables);

module.exports = router;