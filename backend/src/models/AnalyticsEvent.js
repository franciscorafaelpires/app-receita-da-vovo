const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema(
  {
    userHash: { type: String, required: true, index: true },
    eventName: { type: String, required: true, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);
