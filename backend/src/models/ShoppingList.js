const mongoose = require('mongoose');

const shoppingItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 1 },
    unit: { type: String, default: 'un' },
    checked: { type: Boolean, default: false }
  },
  { _id: false }
);

const shoppingListSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'Lista principal' },
    items: { type: [shoppingItemSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ShoppingList', shoppingListSchema);
