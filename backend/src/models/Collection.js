const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    recipeIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'Recipe', default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Collection', collectionSchema);
