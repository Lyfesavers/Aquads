const mongoose = require('mongoose');
const { Schema } = mongoose;

const userImageSchema = new Schema(
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
    uploaderIp: {
      type: String,
    },
  },
  { timestamps: true }
);

userImageSchema.index({ createdAt: 1 });
userImageSchema.index({ uploaderIp: 1, createdAt: 1 });

module.exports = mongoose.model('UserImage', userImageSchema);
