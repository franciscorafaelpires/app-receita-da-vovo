const express = require('express');
const { MealPlan, WEEK_DAYS } = require('../models/MealPlan');
const Recipe = require('../models/Recipe');

const router = express.Router();

function createDefaultItems() {
  return WEEK_DAYS.map((day) => ({ day, recipeId: null, recipeTitle: '' }));
}

async function getOrCreatePlan() {
  let plan = await MealPlan.findOne();
  if (!plan) {
    plan = await MealPlan.create({
      name: 'Planejamento semanal',
      items: createDefaultItems(),
    });
  }

  // Garante que todos os dias existam no documento.
  const presentDays = new Set(plan.items.map((item) => item.day));
  let changed = false;

  for (const day of WEEK_DAYS) {
    if (!presentDays.has(day)) {
      plan.items.push({ day, recipeId: null, recipeTitle: '' });
      changed = true;
    }
  }

  if (changed) {
    await plan.save();
  }

  return plan;
}

router.get('/', async (_req, res) => {
  const plan = await getOrCreatePlan();
  return res.json(plan);
});

router.put('/day', async (req, res) => {
  const { day, recipeId = null } = req.body;

  if (!day || !WEEK_DAYS.includes(day)) {
    return res.status(400).json({ message: 'day invalido' });
  }

  const plan = await getOrCreatePlan();
  const target = plan.items.find((item) => item.day === day);

  if (!target) {
    return res.status(500).json({ message: 'Falha interna ao localizar o dia no plano' });
  }

  if (recipeId === null) {
    target.recipeId = null;
    target.recipeTitle = '';
  } else {
    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(404).json({ message: 'Receita nao encontrada' });
    }

    target.recipeId = recipe._id;
    target.recipeTitle = recipe.title;
  }

  await plan.save();
  return res.json(plan);
});

module.exports = router;
