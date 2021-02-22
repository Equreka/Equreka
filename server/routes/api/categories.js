const router = require('express').Router();
const { Category } = require('../../database/index');

// Get all
router.get('/', async (req, res) => {
  const data = await Category.findAll();
  res.json(data);
});

// Get by id
router.get('/id/:catId', async (req, res) => {
  const data = await Category.findOne({
    where: {
      id: req.params.catId
    }
  });
  res.json(data);
});

// Get by slug
router.get('/:slug', async (req, res) => {
  const data = await Category.findOne({
    where: {
      slug: req.params.slug
    }
  });
  res.json(data);
});

// Create
router.post('/', async (req, res) => {
  const data = await Category.create(req.body);
  res.json(data);
})

// Update
router.put('/:categoryId', async (req, res) => {
  await Category.update(req.body, {
    where: {
      id: req.params.categoryId
    }
  });
  res.json({ success: 'id: ' + req.params.categoryId + ' modified successfully' })
})

// Delete
router.delete('/:categoryId', async (req, res) => {
  await Category.destroy({
    where: {
      id: req.params.categoryId
    }
  });
  res.json({ success: 'id: ' + req.params.categoryId + ' deleted successfully' })
})

module.exports = router;