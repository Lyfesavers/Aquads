const mongoose = require('mongoose');

const { Schema } = mongoose;

// One document per generated PFP. We store the JPEG bytes inline (base64) in
// MongoDB so we do not depend on local disk (Railway redeploys would wipe it)
// and do not need an external object storage service.
//
// Each user is hard-capped at 5 documents in this collection (enforced in the
// route handler). This keeps total storage predictable: 5 × ~500 KB JPEG
// ≈ ~2.5 MB per user × N users.
const pfpGenerationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Base64-encoded JPEG bytes of the generated PFP.
  // We re-encode OpenAI's PNG → JPEG (quality 88) before saving to cut
  // storage size by 4–5× without visible quality loss for these illustrations.
  jpegBase64: {
    type: String,
    required: true
  },
  traits: {
    shell: String,
    accessory: String,
    expression: String,
    aura: String,
    coloredTrait: String,
    gender: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for fast per-user gallery listings (newest first).
pfpGenerationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('PfpGeneration', pfpGenerationSchema);
