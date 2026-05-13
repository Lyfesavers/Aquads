const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/** Singleton row: persisted output of the background suspicious-referrers fraud scan. */
const suspiciousAffiliatesSnapshotSchema = new Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'suspiciousAffiliates'
  },
  minAffiliates: { type: Number, default: 10 },
  suspiciousUsers: { type: [Schema.Types.Mixed], default: [] },
  summary: {
    totalEvaluated: { type: Number, default: 0 },
    totalFlagged: { type: Number, default: 0 },
    highRisk: { type: Number, default: 0 },
    mediumRisk: { type: Number, default: 0 }
  },
  generatedAt: { type: Date },
  durationMs: { type: Number },
  lastError: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('SuspiciousAffiliatesSnapshot', suspiciousAffiliatesSnapshotSchema);
