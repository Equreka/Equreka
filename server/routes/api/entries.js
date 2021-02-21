const router = require('express').Router();
const { Entry, Category } = require('../../database/index');

// Get all
router.get('/', async (req, res) => {
  const entries = await Entry.findAll();
  res.json(entries);
});

// Get by slug
router.get('/:slug', async (req, res) => {
  const data = await Entry.findOne({
    where: {
      slug: req.params.slug
    }
  });
  res.json(data);
});

// Create
router.post('/', async (req, res) => {
  const data = await Entry.create(req.body);
  res.json(data);
})

// Update
router.put('/:entryId', async (req, res) => {
  await Entry.update(req.body, {
    where: {
      id: req.params.entryId
    }
  });
  res.json({ success: 'id: ' + req.params.entryId + ' modified successfully' })
})

// Delete
router.delete('/:entryId', async (req, res) => {
  await Entry.destroy({
    where: {
      id: req.params.entryId
    }
  });
  res.json({ success: 'id: ' + req.params.entryId + ' deleted successfully' })
})

module.exports = router;