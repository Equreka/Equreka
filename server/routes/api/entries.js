const router = require('express').Router();
const Entry = require('../../database/models/entry');

// GET - All
router.get('/', async (req, res) => {
  const data = await Entry.find();
  res.json(data);
});

// GET - By Slug
router.get('/:slug', async (req, res) => {
  const data = await Entry.findOne({
    'slug': req.params.slug
  });
  res.json(data);
});

// GET - Search
router.get('/search/:search', async (req, res) => {
  const data = await Entry.find({
    $or: [ 
      { 'name': req.params.search }, 
      { 'description': req.params.search } 
    ]
  })
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