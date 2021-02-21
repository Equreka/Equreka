const router = require('express').Router();
const apiEntriesRouter = require('./api/entries');

router.use('/entries', apiEntriesRouter);

module.exports = router;