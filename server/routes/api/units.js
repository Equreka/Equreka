const router=    require('express').Router();
const Unit=      require('../../database/models/unit');
const Category=  require('../../database/models/category');
const { param }= require('express-validator');

// GET - All
router.get('/', async (req, res) => {
  const data = await Unit.find();
  res.json(data);
});

// GET - Dump all
router.get('/dump', async (req, res) => {
  const data = await Unit.find()
  .populate('category')
  res.json(data);
});

// GET - Search
router.get('/search/:search',
param('search').not().isEmpty().trim().escape(),
async (req, res) => {
  let search = req.params.search.replace(/[^\w\s]/gi, '');
  const data = await Unit.find({ 
    'name': {
      '$regex':   search,
      '$options': 'i'
    }
  },
  )
  .populate('category', {
    _id: 0,
    name: 1,
    slug: 1
  })
  .limit(10);
  res.json(data);
});

// GET - By Slug
router.get('/:slug', async (req, res) => {
  const data = await Unit.findOne({
    'slug': req.params.slug
  })
  .populate('category', {
    _id: 0,
    name: 1,
    slug: 1
  });
  res.json(data);
});

// GET - By Id
router.get('/id/:id', async (req, res) => {
  const data = await Unit.findOne({
    '_id': req.params.id
  })
  .populate('category', {
    _id: 0,
    name: 1,
    slug: 1
  });
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
  const data = await Unit.find({
    'category._id': category._id 
  });
  res.json(data);
});

// POST - Create
router.post('/create/', async (req, res) => {
  const data = await Unit.create(req.body);
  res.json(data);
})

// POST - Edit
router.put('/update/:unitId', async (req, res) => {
  await Unit.update(req.body, {
    where: {
      id: req.params.unitId
    }
  });
  res.json({ success: 'id: ' + req.params.unitId + ' modified successfully' })
})

// DEL - Delete
router.delete('/delete/:unitId', async (req, res) => {
  await Unit.destroy({
    where: {
      id: req.params.unitId
    }
  });
  res.json({ success: 'id: ' + req.params.unitId + ' deleted successfully' })
})

module.exports = router;