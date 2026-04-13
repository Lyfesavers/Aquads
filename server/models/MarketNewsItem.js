const mongoose = require('mongoose');

const marketNewsItemSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      required: true,
      enum: ['coindesk', 'global'],
      index: true,
    },
    externalKey: {
      type: String,
      required: true,
      unique: true,
      maxlength: 1200,
    },
    guid: { type: String, maxlength: 500 },
    link: { type: String, required: true, maxlength: 2000 },
    title: { type: String, required: true, maxlength: 500 },
    summary: { type: String, maxlength: 2000 },
    imageUrl: { type: String, maxlength: 2000 },
    publishedAt: { type: Date, required: true, index: true },
    lastSyncedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

marketNewsItemSchema.index({ publishedAt: -1, source: 1 });

module.exports = mongoose.model('MarketNewsItem', marketNewsItemSchema);
