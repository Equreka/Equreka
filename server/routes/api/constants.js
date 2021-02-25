const router = require('express').Router();
const models = require('../../database');

// Get all
router.get('/', async (req, res) => {
  const data = await models.constant.findAll();
  res.json(data);
});

// Get by slug
router.get('/:slug', async (req, res) => {
  const data = await models.constant.findOne({
    where: {
      slug: req.params.slug
    }
  });
  res.json(data);
});

// Create
router.post('/', async (req, res) => {
  const data = await models.constant.create(req.body);
  res.json(data);
})

// Update
router.put('/:constantId', async (req, res) => {
  await models.constant.update(req.body, {
    where: {
      id: req.params.constantId
    }
  });
  res.json({ success: 'id: ' + req.params.constantId + ' modified successfully' })
})

// Delete
router.delete('/:constantId', async (req, res) => {
  await models.constant.destroy({
    where: {
      id: req.params.constantId
    }
  });
  res.json({ success: 'id: ' + req.params.constantId + ' deleted successfully' })
})

module.exports = router;