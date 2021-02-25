const router = require('express').Router();
const models = require('../../database');
const { Op } = require("sequelize");

// GET - All
router.get('/', async (req, res) => {
  const data = await models.entry.findAll();
  res.json(data);
});

// GET - By slug
router.get('/:slug', async (req, res) => {
  const data = await models.entry.findOne({
    where: {
      slug: req.params.slug
    }
  });
  res.json(data);
});

// GET - Search
router.get('/search/:search', async (req, res) => {
  const data = await models.entry.findAll({
    where: {
      [Op.or]: [
        {
          name: {
            [Op.substring]: req.params.search
          }
        },
        {
          description: {
            [Op.substring]: req.params.search
          }
        }
      ]
    }
  });
  res.json(data);
});

// POST - Create
router.post('/', async (req, res) => {
  const data = await models.entry.create(req.body);
  res.json(data);
})

// PUT - Update
router.put('/:entryId', async (req, res) => {
  await models.entry.update(req.body, {
    where: {
      id: req.params.entryId
    }
  });
  res.json({ success: 'id: ' + req.params.entryId + ' modified successfully' })
})

// DEL - Delete
router.delete('/:entryId', async (req, res) => {
  await models.entry.destroy({
    where: {
      id: req.params.entryId
    }
  });
  res.json({ success: 'id: ' + req.params.entryId + ' deleted successfully' })
})

module.exports = router;