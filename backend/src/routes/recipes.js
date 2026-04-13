const express = require('express');
const Recipe = require('../models/Recipe');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic'];
const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm'];

function hasAllowedExtension(url, allowedExtensions) {
  const normalized = String(url || '').toLowerCase();
  return allowedExtensions.some((extension) => normalized.includes(extension));
}

function isValidImageUrl(imageUrl) {
  if (!imageUrl) return true;
  if (!/^https?:\/\//.test(imageUrl) && !/^file:\/\//.test(imageUrl)) return false;
  return hasAllowedExtension(imageUrl, ALLOWED_IMAGE_EXTENSIONS);
}

function isValidVideoUrl(videoUrl) {
  if (!videoUrl) return true;
  if (!/^https?:\/\//.test(videoUrl) && !/^file:\/\//.test(videoUrl)) return false;
  return hasAllowedExtension(videoUrl, ALLOWED_VIDEO_EXTENSIONS);
}

function normalizeSteps(rawSteps = []) {
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

      if (step && typeof step === 'object' && typeof step.text === 'string') {
        const text = step.text.trim();
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

router.get('/', async (req, res) => {
  const { q = '' } = req.query;
  const filter = q
    ? {
        $or: [
          { title: { $regex: String(q), $options: 'i' } },
          { description: { $regex: String(q), $options: 'i' } },
        ],
      }
    : {};

  const recipes = await Recipe.find(filter).sort({ createdAt: -1 });
  res.json(recipes);
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      title,
      ingredients = [],
      steps = [],
      description = '',
      imageUrl = '',
      videoUrl = '',
      videoDurationSeconds = 0,
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'title e obrigatorio' });
    }

    if (!isValidImageUrl(imageUrl)) {
      return res.status(400).json({ message: 'imageUrl invalida' });
    }

    if (!isValidVideoUrl(videoUrl)) {
      return res.status(400).json({ message: 'videoUrl invalida' });
    }

    const duration = Number(videoDurationSeconds) || 0;
    if (videoUrl && (duration <= 0 || duration > 8)) {
      return res.status(400).json({ message: 'videoDurationSeconds deve estar entre 1 e 8' });
    }

    const recipe = await Recipe.create({
      authorId: req.user.id,
      title,
      ingredients,
      steps: normalizeSteps(steps),
      description,
      imageUrl,
      videoUrl,
      videoDurationSeconds: duration,
    });

    return res.status(201).json(recipe);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Falha ao criar receita' });
  }
});

router.get('/:id', async (req, res) => {
  const recipe = await Recipe.findById(req.params.id);

  if (!recipe) {
    return res.status(404).json({ message: 'Receita nao encontrada' });
  }

  return res.json(recipe);
});

router.get('/:id/reviews', async (req, res) => {
  const recipe = await Recipe.findById(req.params.id);

  if (!recipe) {
    return res.status(404).json({ message: 'Receita nao encontrada' });
  }

  return res.json({
    averageRating: recipe.averageRating,
    ratingsCount: recipe.ratingsCount,
    reviews: recipe.reviews,
  });
});

router.post('/:id/reviews', requireAuth, async (req, res) => {
  try {
    const { rating, comment = '', imageUrl = '' } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'rating deve estar entre 1 e 5' });
    }

    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ message: 'Receita nao encontrada' });
    }

    recipe.reviews.push({
      userId: req.user.id,
      userName: req.user.name,
      rating,
      comment,
      imageUrl,
    });

    const sum = recipe.reviews.reduce((acc, review) => acc + review.rating, 0);
    recipe.ratingsCount = recipe.reviews.length;
    recipe.averageRating = Number((sum / recipe.ratingsCount).toFixed(2));

    await recipe.save();

    return res.status(201).json({
      averageRating: recipe.averageRating,
      ratingsCount: recipe.ratingsCount,
      reviews: recipe.reviews,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Falha ao enviar avaliacao' });
  }
});

module.exports = router;
