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
    enum: ['instant', 'thinking', 'agent', 'websearch', 'image', 'video'],
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
  /** True when assistant message has a stored generated video */
  hasVideo: {
    type: Boolean,
    default: false,
    index: true
  },
  videoStatus: {
    type: String,
    enum: ['queued', 'in_progress', 'finalizing', 'completed', 'failed', ''],
    default: ''
  },
  videoOpenaiId: {
    type: String,
    default: ''
  },
  /** Relative filename under server/data/project-agent-videos */
  videoStorageKey: {
    type: String,
    default: ''
  },
  videoMimeType: {
    type: String,
    default: 'video/mp4'
  },
  videoModel: {
    type: String,
    default: ''
  },
  videoSize: {
    type: String,
    default: ''
  },
  videoSeconds: {
    type: Number,
    default: 0
  },
  /** Requested target length (20–30); may differ from billed seconds after extensions */
  videoTargetSeconds: {
    type: Number,
    default: 0
  },
  /** Remaining extension segment lengths (e.g. [8] after a 20s base for 25s target) */
  videoExtensionQueue: {
    type: [Number],
    default: []
  },
  videoPrompt: {
    type: String,
    default: ''
  },
  /** Wallet hold (cents) reserved when the render job started */
  videoHoldCents: {
    type: Number,
    default: 0
  },
  videoProgress: {
    type: Number,
    default: null
  },
  usage: {
    prompt_tokens: { type: Number, default: 0 },
    completion_tokens: { type: Number, default: 0 },
    cached_tokens: { type: Number, default: 0 },
    total_tokens: { type: Number, default: 0 },
    web_search_calls: { type: Number, default: 0 }
  },
  costCents: {
    type: Number,
    default: 0
  },
  /**
   * Agent-mode tool rounds replayed to Kimi (assistant+tool_calls, tool, …).
   * Final user-visible reply stays in `content` on this same document.
   */
  agentToolTrace: {
    type: [mongoose.Schema.Types.Mixed],
    default: undefined
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

projectAgentMessageSchema.index({ threadId: 1, createdAt: 1 });

module.exports = mongoose.model('ProjectAgentMessage', projectAgentMessageSchema);
