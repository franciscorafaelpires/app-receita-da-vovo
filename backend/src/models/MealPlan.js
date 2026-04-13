const mongoose = require('mongoose');

const WEEK_DAYS = [
  'segunda',
  'terca',
  'quarta',
  'quinta',
  'sexta',
  'sabado',
  'domingo'
];

const planItemSchema = new mongoose.Schema(
  {
    day: { type: String, enum: WEEK_DAYS, required: true },
    recipeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', default: null },
    recipeTitle: { type: String, default: '' }
  },
  { _id: false }
);

const mealPlanSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'Planejamento semanal' },
    items: { type: [planItemSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = {
  MealPlan: mongoose.model('MealPlan', mealPlanSchema),
  WEEK_DAYS,
};
