const router=    require('express').Router();
const Variable=  require('../../database/models/variable');
const Category=  require('../../database/models/category');
const { param }= require('express-validator');

// GET - All
router.get('/', async (req, res) => {
  const data = await Variable.find();
  res.json(data);
});

// GET - Dump all
router.get('/dump', async (req, res) => {
  const data = await Variable.find()
  .populate('category');
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
  const data = await Variable.findOne({
    'slug': req.params.slug
  })  
  .populate('category', {
    _id: 0,
    name: 1,
    slug: 1
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
  const data = await Variable.find({
    'category._id': category._id 
  });
  res.json(data);
});

// GET - By Id
router.get('/id/:id', async (req, res) => {
  const data = await Variable.findOne({
    '_id': req.params.id
  })
  .populate('category', {
    _id: 0,
    name: 1,
    slug: 1
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