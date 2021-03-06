const router = require('express').Router();
const Constant = require('../../database/models/constant');
const { param } = require('express-validator');

// GET - All
router.get('/', async (req, res) => {
  const data = await Constant.find();
  res.json(data);
});

// GET - Search
router.get('/search/:search',
param('search').not().isEmpty().trim().escape(),
async (req, res) => {
  let search = req.params.search.replace(/[^\w\s]/gi, '');
  const data = await Constant.find({ 
    'name': {
      '$regex':   search,
      '$options': 'i'
    }
  },
  )
  .populate('category, unit')
  .limit(10);
  res.json(data);
});

// GET - By Slug
router.get('/:slug', async (req, res) => {
  const data = await Constant.findOne({
    'slug': req.params.slug
  })
  .populate('category', {
    _id: 0,
    name: 1,
    slug: 1
  })
  .populate('unit', {
    _id: 0,
    name: 1,
    symbol: 1
  })
  .populate('values.unit', {
    _id: 0,
    name: 1,
    slug: 1,
    symbol: 1
  })
  res.json(data);
});

// POST - Create
router.post('/create/', async (req, res) => {
  const data = await Constant.create(req.body);
  res.json(data);
})

// POST - Edit
router.put('/update/:id', async (req, res) => {
  await Constant.update(req.body, {
    where: {
      id: req.params.id
    }
  });
  res.json({ success: 'id: ' + req.params.id + ' modified successfully' })
})

// DEL - Delete
router.delete('/delete/:id', async (req, res) => {
  await Constant.destroy({
    where: {
      id: req.params.id
    }
  });
  res.json({ success: 'id: ' + req.params.id + ' deleted successfully' })
})

module.exports = router;