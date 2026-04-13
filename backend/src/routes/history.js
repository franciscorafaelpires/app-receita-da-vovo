const express = require('express');

const CookHistory = require('../models/CookHistory');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const entries = await CookHistory.find({ userId: req.user.id })
    .populate('recipeId', 'title imageUrl videoUrl')
    .sort({ preparedAt: -1 });

  return res.json(entries);
});

router.post('/', async (req, res) => {
  const {
    recipeId,
    notes = '',
    realTimeMinutes = 0,
    difficultyVote = 3,
    preparedAt,
  } = req.body;

  if (!recipeId) {
    return res.status(400).json({ message: 'recipeId e obrigatorio' });
  }

  const entry = await CookHistory.create({
    userId: req.user.id,
    recipeId,
    notes,
    realTimeMinutes,
    difficultyVote,
    preparedAt: preparedAt ? new Date(preparedAt) : new Date(),
  });

  return res.status(201).json(entry);
});

module.exports = router;
