const mongoose = require('mongoose');

const botTestimonialSchema = new mongoose.Schema(
  {
    quote: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    adId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ad',
      default: null,
    },
    displayName: {
      type: String,
      default: null,
      trim: true,
      maxlength: 80,
    },
    role: {
      type: String,
      default: null,
      trim: true,
      maxlength: 80,
    },
    published: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

botTestimonialSchema.index({ published: 1, sortOrder: 1, createdAt: -1 });

module.exports = mongoose.model('BotTestimonial', botTestimonialSchema);
