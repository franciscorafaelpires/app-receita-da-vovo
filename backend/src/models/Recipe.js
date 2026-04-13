const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 1 },
    unit: { type: String, default: 'un' }
  },
  { _id: false }
);

const stepSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    text: { type: String, required: true, trim: true },
    timerSeconds: { type: Number, default: 0 }
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, default: 'Usuario' },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: '' },
    imageUrl: { type: String, default: '' }
  },
  { timestamps: true }
);

const recipeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    description: { type: String, default: '' },
    ingredients: { type: [ingredientSchema], default: [] },
    steps: { type: [stepSchema], default: [] },
    imageUrl: { type: String, default: '' },
    videoUrl: { type: String, default: '' },
    videoDurationSeconds: { type: Number, default: 0 },
    reviews: { type: [reviewSchema], default: [] },
    averageRating: { type: Number, default: 0 },
    ratingsCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Recipe', recipeSchema);
