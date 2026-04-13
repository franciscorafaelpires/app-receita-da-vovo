const mongoose = require('mongoose');

const cookHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', required: true },
    notes: { type: String, default: '' },
    realTimeMinutes: { type: Number, default: 0 },
    difficultyVote: { type: Number, min: 1, max: 5, default: 3 },
    preparedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CookHistory', cookHistorySchema);
