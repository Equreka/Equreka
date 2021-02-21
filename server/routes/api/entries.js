const router = require('express').Router();
const { Entry } = require('../../database/index');

router.get('/', async (req, res) => {
  const entries = await Entry.findAll();
  res.json(entries);
});

router.get('/:entrySlug', async (req, res) => {
  const data = await Entry.findOne(req.body, {
    where: {
      slug: req.params.entrySlug
    }
  });
  res.json(data);
});

router.post('/', async (req, res) => {
  const entries = await Entry.create(req.body);
  res.json(entries);
})

router.put('/:entryId', async (req, res) => {
  await Entry.update(req.body, {
    where: {
      id: req.params.entryId
    }
  });
  res.json({ success: 'id: ' + req.params.entryId + ' modified successfully' })
})

router.delete('/:entryId', async (req, res) => {
  await Entry.destroy({
    where: {
      id: req.params.entryId
    }
  });
  res.json({ success: 'id: ' + req.params.entryId + ' deleted successfully' })
})

module.exports = router;