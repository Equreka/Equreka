const router=    require('express').Router();
const Constant=  require('../../database/models/constant');
const Category=  require('../../database/models/category');
const { param }= require('express-validator');
const sanitize=  require('../sanitize');

// GET - All
router.get('/', async (req, res) => {
  const data = await Constant.find()
  .populate('category, unit')
  res.json(data);
});

// GET - Dump all
router.get('/dump', async (req, res) => {
  const data = await Constant.find()
  .populate('category')
  .populate('unit')
  .populate('values.unit')
  res.json(data);
});

// GET - Search
router.get('/search/:search',
param('search').not().isEmpty().trim().escape(),
async (req, res) => {
  let search = sanitize.search(req.params.search);
  const data = await Constant.find({ 
    $or: [
      {'name': {
        '$regex':   search,
        '$options': 'i'
      }},
      {'slug': {
        '$regex':   search,
        '$options': 'i'
      }}
    ]
  })
  .populate('category')
  .populate('unit')
  .populate('values.unit')
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

// GET - By Id
router.get('/id/:id', async (req, res) => {
  const data = await Constant.findOne({
    '_id': req.params.id
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

// GET - By Category
router.get('/category/:category', async (req, res) => {
  const category = await Category.findOne({
    'slug': req.params.category
  });
  if (category === null) {
    res.json(null);
    return;
  }
  const data = await Constant.find({
    'category._id': category._id 
  });
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