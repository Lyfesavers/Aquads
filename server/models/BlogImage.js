const mongoose = require('mongoose');
const { Schema } = mongoose;

const blogImageSchema = new Schema(
  {
    data: {
      type: Buffer,
      required: true,
    },
    contentType: {
      type: String,
      required: true,
      default: 'image/webp',
    },
    variant: {
      type: String,
      enum: ['banner', 'inline'],
      default: 'inline',
    },
    size: {
      type: Number,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BlogImage', blogImageSchema);
