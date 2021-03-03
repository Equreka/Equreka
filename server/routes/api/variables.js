const router = require('express').Router();
const Variable = require('../../database/models/variable');
const { param } = require('express-validator');

// GET - All
router.get('/', async (req, res) => {
  const data = await Variable.find();
  res.json(data);
});

// GET - Search
router.get('/search/:search',
param('search').not().isEmpty().trim().escape(),
async (req, res) => {
  let search = req.params.search.replace(/[^\w\s]/gi, '');
  const data = await Variable.find({ 
    'name': {
      '$regex':   search,
      '$options': 'i'
    }
  },
  )
  .populate('category')
  .limit(10);
  res.json(data);
});

// GET - By Slug
router.get('/:slug', async (req, res) => {
  const data = await Variable.findOne({
    'slug': req.params.slug
  });
  res.json(data);
});

// POST - Create
router.post('/create/', async (req, res) => {
  const data = await Variable.create(req.body);
  res.json(data);
})

// POST - Edit
router.put('/update/:constantId', async (req, res) => {
  await Variable.update(req.body, {
    where: {
      id: req.params.constantId
    }
  });
  res.json({ success: 'id: ' + req.params.constantId + ' modified successfully' })
})

// DEL - Delete
router.delete('/delete/:constantId', async (req, res) => {
  await Variable.destroy({
    where: {
      id: req.params.constantId
    }
  });
  res.json({ success: 'id: ' + req.params.constantId + ' deleted successfully' })
})

module.exports = router;