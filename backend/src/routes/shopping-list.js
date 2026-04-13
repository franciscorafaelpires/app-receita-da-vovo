const express = require('express');
const ShoppingList = require('../models/ShoppingList');
const Recipe = require('../models/Recipe');
const { MealPlan } = require('../models/MealPlan');

const router = express.Router();

async function getOrCreateList() {
  let list = await ShoppingList.findOne();
  if (!list) {
    list = await ShoppingList.create({ name: 'Lista principal', items: [] });
  }
  return list;
}

function mergeItems(currentItems, newItems) {
  const map = new Map();

  for (const item of currentItems) {
    const key = `${item.name.toLowerCase()}::${item.unit}`;
    map.set(key, { ...item.toObject(), checked: !!item.checked });
  }

  for (const item of newItems) {
    const key = `${item.name.toLowerCase()}::${item.unit}`;
    if (map.has(key)) {
      const existing = map.get(key);
      existing.quantity += item.quantity || 1;
      map.set(key, existing);
    } else {
      map.set(key, {
        name: item.name,
        quantity: item.quantity || 1,
        unit: item.unit || 'un',
        checked: false
      });
    }
  }

  return Array.from(map.values());
}

function countAddedItems(items) {
  return items.reduce((total, item) => total + (Number(item.quantity) || 1), 0);
}

function normalizeItemKey(name, unit) {
  return `${String(name || '').trim().toLowerCase()}::${String(unit || 'un').trim().toLowerCase()}`;
}

function parseItemRefs(payloadItems = []) {
  if (!Array.isArray(payloadItems)) return [];

  return payloadItems
    .map((item) => ({ name: item?.name, unit: item?.unit || 'un' }))
    .filter((item) => item.name)
    .map((item) => ({
      ...item,
      key: normalizeItemKey(item.name, item.unit),
    }));
}

router.get('/', async (_req, res) => {
  const list = await getOrCreateList();
  res.json(list);
});

router.patch('/items/checked', async (req, res) => {
  const { items = [], checked } = req.body;

  if (typeof checked !== 'boolean') {
    return res.status(400).json({ message: 'checked deve ser booleano' });
  }

  const refs = parseItemRefs(items);
  if (refs.length === 0) {
    return res.status(400).json({ message: 'items e obrigatorio' });
  }

  const refKeys = new Set(refs.map((item) => item.key));

  const list = await getOrCreateList();
  list.items = list.items.map((item) => {
    const key = normalizeItemKey(item.name, item.unit);
    if (refKeys.has(key)) {
      return {
        ...item.toObject(),
        checked,
      };
    }

    return item;
  });

  await list.save();
  return res.json(list);
});

router.delete('/items', async (req, res) => {
  const refs = parseItemRefs(req.body?.items || []);
  if (refs.length === 0) {
    return res.status(400).json({ message: 'items e obrigatorio' });
  }

  const refKeys = new Set(refs.map((item) => item.key));

  const list = await getOrCreateList();
  list.items = list.items.filter((item) => !refKeys.has(normalizeItemKey(item.name, item.unit)));

  await list.save();
  return res.json(list);
});

router.post('/from-recipe', async (req, res) => {
  const { recipeId } = req.body;

  if (!recipeId) {
    return res.status(400).json({ message: 'recipeId e obrigatorio' });
  }

  const recipe = await Recipe.findById(recipeId);

  if (!recipe) {
    return res.status(404).json({ message: 'Receita nao encontrada' });
  }

  const list = await getOrCreateList();
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  list.items = mergeItems(list.items, ingredients);
  await list.save();

  return res.status(201).json({
    ...list.toObject(),
    addedItemsCount: countAddedItems(ingredients),
  });
});

router.post('/from-meal-plan', async (_req, res) => {
  const plan = await MealPlan.findOne();

  if (!plan) {
    return res.status(404).json({ message: 'Planejamento semanal nao encontrado' });
  }

  const recipeIds = plan.items
    .filter((item) => item.recipeId)
    .map((item) => item.recipeId.toString());

  if (recipeIds.length === 0) {
    const list = await getOrCreateList();
    list.items = [];
    await list.save();
    return res.json(list);
  }

  const recipes = await Recipe.find({ _id: { $in: recipeIds } });
  const allIngredients = recipes.flatMap((recipe) => recipe.ingredients || []);

  const list = await getOrCreateList();
  list.items = mergeItems([], allIngredients);
  await list.save();

  return res.json(list);
});

module.exports = router;
