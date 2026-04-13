const express = require('express');

const Collection = require('../models/Collection');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const collections = await Collection.find({ userId: req.user.id })
    .populate('recipeIds', 'title imageUrl')
    .sort({ createdAt: -1 });
  return res.json(collections);
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'name e obrigatorio' });
  }

  const collection = await Collection.create({
    userId: req.user.id,
    name,
    recipeIds: [],
  });

  return res.status(201).json(collection);
});

router.put('/:id', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'name e obrigatorio' });
  }

  const collection = await Collection.findOne({ _id: req.params.id, userId: req.user.id });
  if (!collection) {
    return res.status(404).json({ message: 'Colecao nao encontrada' });
  }

  collection.name = String(name).trim();
  await collection.save();

  return res.json(collection);
});

router.delete('/:id', async (req, res) => {
  const collection = await Collection.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!collection) {
    return res.status(404).json({ message: 'Colecao nao encontrada' });
  }

  return res.status(204).send();
});

router.post('/:id/recipes', async (req, res) => {
  const { recipeId } = req.body;
  if (!recipeId) {
    return res.status(400).json({ message: 'recipeId e obrigatorio' });
  }

  const collection = await Collection.findOne({ _id: req.params.id, userId: req.user.id });
  if (!collection) {
    return res.status(404).json({ message: 'Colecao nao encontrada' });
  }

  const exists = collection.recipeIds.some((id) => id.toString() === recipeId);
  if (!exists) {
    collection.recipeIds.push(recipeId);
    await collection.save();
  }

  await collection.populate('recipeIds', 'title imageUrl');

  return res.json(collection);
});

router.delete('/:id/recipes/:recipeId', async (req, res) => {
  const collection = await Collection.findOne({ _id: req.params.id, userId: req.user.id });
  if (!collection) {
    return res.status(404).json({ message: 'Colecao nao encontrada' });
  }

  collection.recipeIds = collection.recipeIds.filter(
    (id) => id.toString() !== req.params.recipeId
  );
  await collection.save();

  await collection.populate('recipeIds', 'title imageUrl');

  return res.json(collection);
});

module.exports = router;
