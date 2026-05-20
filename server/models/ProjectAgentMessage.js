const mongoose = require('mongoose');

const projectAgentMessageSchema = new mongoose.Schema({
  threadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProjectAgentThread',
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  reasoningContent: {
    type: String,
    default: ''
  },
  mode: {
    type: String,
    enum: ['instant', 'thinking', 'agent', 'image'],
    default: 'instant'
  },
  /** True when assistant message has a stored generated image */
  hasImage: {
    type: Boolean,
    default: false,
    index: true
  },
  /** JPEG base64 when mode is image (assistant message) */
  imageJpegBase64: {
    type: String,
    default: ''
  },
  imageMimeType: {
    type: String,
    default: ''
  },
  usage: {
    prompt_tokens: { type: Number, default: 0 },
    completion_tokens: { type: Number, default: 0 },
    cached_tokens: { type: Number, default: 0 },
    total_tokens: { type: Number, default: 0 }
  },
  costCents: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

projectAgentMessageSchema.index({ threadId: 1, createdAt: 1 });

module.exports = mongoose.model('ProjectAgentMessage', projectAgentMessageSchema);
