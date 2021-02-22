const router = require('express').Router();
const { Constant } = require('../../database/index');

// Get all
router.get('/', async (req, res) => {
  const data = await Constant.findAll();
  res.json(data);
});

// Get by slug
router.get('/:slug', async (req, res) => {
  const data = await Constant.findOne({
    where: {
      slug: req.params.slug
    }
  });
  res.json(data);
});

// Create
router.post('/', async (req, res) => {
  const data = await Constant.create(req.body);
  res.json(data);
})

// Update
router.put('/:constantId', async (req, res) => {
  await Constant.update(req.body, {
    where: {
      id: req.params.constantId
    }
  });
  res.json({ success: 'id: ' + req.params.constantId + ' modified successfully' })
})

// Delete
router.delete('/:constantId', async (req, res) => {
  await Constant.destroy({
    where: {
      id: req.params.constantId
    }
  });
  res.json({ success: 'id: ' + req.params.constantId + ' deleted successfully' })
})

module.exports = router;