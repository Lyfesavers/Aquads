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
    required: true,
    maxLength: 60000 // ~10000 words
  },
  bannerImage: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(v);
      },
      message: props => `${props.value} is not a valid image URL!`
    }
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


module.exports = mongoose.model('Blog', blogSchema); 