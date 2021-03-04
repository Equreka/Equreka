const router = require('express').Router();
const Entry = require('../../database/models/entry');
const Category = require('../../database/models/category');
const { param } = require('express-validator');

// GET - All
router.get('/', async (req, res) => {
  const data = await Entry.find().populate('variable');
  res.json(data);
});

// GET - Search
router.get('/search/:search',
param('search').not().isEmpty().trim().escape(),
async (req, res) => {
  let search = req.params.search.replace(/[^\w\s]/gi, '');
  const data = await Entry.find({ 
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
  const data = await Entry.findOne({
    'slug': req.params.slug
  })
  .populate('category')
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
router.get('/category/:category', async (req, res) => {
  // GET - By slug
  const category = await Category.findOne({
    'slug': req.params.category
  });  
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