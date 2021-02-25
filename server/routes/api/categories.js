const router = require('express').Router();
const models = require('../../database');

// Get all
router.get('/', async (req, res) => {
  const data = await models.category.findAll();
  res.json(data);
});

// Get by id
router.get('/id/:id', async (req, res) => {
  const data = await models.category.findOne({
    where: {
      id: req.params.id
    }
  });
  res.json(data);
});

// Get by slug
router.get('/:slug', async (req, res) => {
  const data = await models.category.findOne({
    where: {
      slug: req.params.slug
    }
  });
  res.json(data);
});

// Create
router.post('/', async (req, res) => {
  const data = await models.category.create(req.body);
  res.json(data);
})

// Update
router.put('/:categoryId', async (req, res) => {
  await models.category.update(req.body, {
    where: {
      id: req.params.categoryId
    }
  });
  res.json({ success: 'id: ' + req.params.categoryId + ' modified successfully' })
})

// Delete
router.delete('/:categoryId', async (req, res) => {
  await models.category.destroy({
    where: {
      id: req.params.categoryId
    }
  });
  res.json({ success: 'id: ' + req.params.categoryId + ' deleted successfully' })
})

module.exports = router;