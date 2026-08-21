const mongoose = require('mongoose');
const { Schema } = mongoose;

const blogSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  bannerImage: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        if (!v || typeof v !== 'string' || v.length > 2048) return false;
        // External image hosts (legacy)
        if (/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(v)) {
          return true;
        }
        // Aquads-hosted blog media stored in MongoDB
        if (/^https?:\/\/[^/]+\/api\/blogs\/media\/[a-fA-F0-9]{24}(\?.*)?$/i.test(v)) {
          return true;
        }
        // Mintfunnel / CDN hero images that omit a file extension
        return /^https:\/\/[^\s<>"']+$/i.test(v);
      },
      message: (props) => `${props.value} is not a valid image URL!`,
    },
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  authorUsername: {
    type: String,
    required: true
  },
  authorImage: String,
  isPressRelease: {
    type: Boolean,
    default: false
  },
  mintfunnelOrderId: {
    type: Number
  },
  mintfunnelOrderNumber: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
blogSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Performance indexes for common queries
blogSchema.index({ title: 'text', content: 'text' }); // For text search
blogSchema.index({ author: 1, createdAt: -1 }); // For author's blogs by date
blogSchema.index({ createdAt: -1 }); // For blogs by creation date
blogSchema.index({ updatedAt: -1 }); // For blogs by update date
blogSchema.index({ authorUsername: 1 }); // For author username lookups
blogSchema.index({ mintfunnelOrderId: 1 }, { unique: true, sparse: true });


module.exports = mongoose.model('Blog', blogSchema); 