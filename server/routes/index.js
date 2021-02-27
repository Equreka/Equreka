const router = require('express').Router();
const routerEntries    = require('./api/entries');
const routerCategories = require('./api/categories');
const routerConstants  = require('./api/constants');

// Routes
router.use('/entries',    routerEntries);
router.use('/categories', routerCategories);
router.use('/constants',  routerConstants);

module.exports = router;