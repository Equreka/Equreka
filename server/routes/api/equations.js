const router = require('express').Router();
const Entry = require('../../database/models/equation');
const Category = require('../../database/models/category');
const { param } = require('express-validator');

// GET - All
router.get('/', async (req, res) => {
  const data = await Entry.find()
  .populate('category')
  .populate('variable');
  res.json(data);
});

// GET - Search
router.get('/search/:search', param('search').not().isEmpty().trim().escape(), async (req, res) => {
  let search = req.params.search.replace(/[^\w\s]/gi, '').replace(" ", '.+');
  const data = await Entry.find({ 
    $or: [
      {'name': {
        '$regex':   search,
        '$options': 'i'
      }},
      {'description': {
        '$regex':   search,
        '$options': 'i'
      }}
    ]
  })
  .populate('category', {
    _id: 0,
    name: 1,
    slug: 1
  })
  .limit(10);
  res.json(data);
});

// GET - By Id
router.get('/id/:id', async (req, res) => {
  const data = await Entry.findOne({
    '_id': req.params.id
  })
  .populate('category', {
    _id: 0,
    name: 1,
    slug: 1
  })
  .populate({
    path: 'variables',
    populate: {
      path: 'variable',
      populate: {
        path: 'unit'
      }
    }
  })
  .populate({
    path: 'constants',
    populate: {
      path: 'constant',
      populate: {
        path: 'unit'
      }
    }
  });
  res.json(data);
});


// GET - By Slug
router.get('/:slug', async (req, res) => {
  const data = await Entry.findOne({
    'slug': req.params.slug
  })
  .populate('category', {
    _id: 0,
    name: 1,
    slug: 1
  })
  .populate({
    path: 'variables',
    populate: {
      path: 'variable',
      populate: {
        path: 'unit'
      }
    }
  })
  .populate({
    path: 'constants',
    populate: {
      path: 'constant',
      populate: {
        path: 'unit'
      }
    }
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
  const data = await Entry.find({
    'category._id': category._id 
  });
  res.json(data);
});

// POST - Create
router.post('/create/', async (req, res) => {
  const data = await Entry.create(req.body);
  res.json(data);
})

// POST - Edit
router.put('/update/:entryId', async (req, res) => {
  await Entry.update(req.body, {
    where: {
      id: req.params.entryId
    }
  });
  res.json({ success: 'id: ' + req.params.entryId + ' modified successfully' })
})

// DEL - Delete
router.delete('/delete/:entryId', async (req, res) => {
  await Entry.destroy({
    where: {
      id: req.params.entryId
    }
  });
  res.json({ success: 'id: ' + req.params.entryId + ' deleted successfully' })
})

module.exports = router;