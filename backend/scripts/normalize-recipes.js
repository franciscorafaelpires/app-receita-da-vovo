const dotenv = require('dotenv');
const mongoose = require('mongoose');

const Recipe = require('../src/models/Recipe');

dotenv.config();

function normalizeSteps(rawSteps) {
  if (!Array.isArray(rawSteps)) return [];

  return rawSteps
    .map((step, index) => {
      if (typeof step === 'string') {
        const text = step.trim();
        if (!text) return null;
        return {
          order: index + 1,
          text,
          timerSeconds: 0,
        };
      }

      if (step && typeof step === 'object') {
        const text = typeof step.text === 'string' ? step.text.trim() : '';
        if (!text) return null;
        return {
          order: Number(step.order) || index + 1,
          text,
          timerSeconds: Number(step.timerSeconds) || 0,
        };
      }

      return null;
    })
    .filter(Boolean);
}

async function normalizeAllRecipes() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI nao definido. Configure backend/.env');
  }

  await mongoose.connect(mongoUri);

  const recipes = await Recipe.collection.find({}).toArray();
  let updated = 0;

  for (const recipe of recipes) {
    const set = {};

    if (!Object.prototype.hasOwnProperty.call(recipe, 'authorId')) {
      set.authorId = null;
    }
    if (!Object.prototype.hasOwnProperty.call(recipe, 'description') || typeof recipe.description !== 'string') {
      set.description = '';
    }
    if (!Object.prototype.hasOwnProperty.call(recipe, 'imageUrl') || typeof recipe.imageUrl !== 'string') {
      set.imageUrl = '';
    }
    if (!Object.prototype.hasOwnProperty.call(recipe, 'videoUrl') || typeof recipe.videoUrl !== 'string') {
      set.videoUrl = '';
    }
    if (!Array.isArray(recipe.ingredients)) {
      set.ingredients = [];
    }

    const normalizedSteps = normalizeSteps(recipe.steps);
    if (JSON.stringify(normalizedSteps) !== JSON.stringify(Array.isArray(recipe.steps) ? recipe.steps : [])) {
      set.steps = normalizedSteps;
    }

    const reviews = Array.isArray(recipe.reviews) ? recipe.reviews : [];
    if (!Array.isArray(recipe.reviews)) {
      set.reviews = [];
    }

    const hasRatings = reviews.length > 0;
    if (hasRatings) {
      const sum = reviews.reduce((acc, review) => acc + (Number(review.rating) || 0), 0);
      const ratingsCount = reviews.length;
      const averageRating = Number((sum / ratingsCount).toFixed(2));
      if (recipe.ratingsCount !== ratingsCount) set.ratingsCount = ratingsCount;
      if (recipe.averageRating !== averageRating) set.averageRating = averageRating;
    } else {
      if (!Object.prototype.hasOwnProperty.call(recipe, 'ratingsCount') || recipe.ratingsCount !== 0) {
        set.ratingsCount = 0;
      }
      if (!Object.prototype.hasOwnProperty.call(recipe, 'averageRating') || recipe.averageRating !== 0) {
        set.averageRating = 0;
      }
    }

    if (Object.keys(set).length > 0) {
      await Recipe.collection.updateOne({ _id: recipe._id }, { $set: set });
      updated += 1;
    }
  }

  await mongoose.disconnect();

  console.log(`Receitas verificadas: ${recipes.length}`);
  console.log(`Receitas normalizadas: ${updated}`);
}

normalizeAllRecipes().catch((error) => {
  console.error('Falha ao normalizar receitas:', error.message);
  process.exit(1);
});
