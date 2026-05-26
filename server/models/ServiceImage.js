const mongoose = require('mongoose');
const { Schema } = mongoose;

const serviceImageSchema = new Schema(
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

serviceImageSchema.index({ uploadedBy: 1, createdAt: -1 });

module.exports = mongoose.model('ServiceImage', serviceImageSchema);
