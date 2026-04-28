'use strict';

const mongoose = require('mongoose');

/**
 * Authoritative server-side state for an Aquataire (Solitaire) game.
 *
 * Cards are stored as { id: 0-51, suit: 's'|'h'|'d'|'c', rank: 1-13, faceUp: bool }.
 * The full state lives only on the server; clients receive a redacted view that omits
 * suit/rank for face-down cards. This makes time, score, and card identity uncheatable.
 */
const CardSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, min: 0, max: 51 },
    suit: { type: String, required: true, enum: ['s', 'h', 'd', 'c'] },
    rank: { type: Number, required: true, min: 1, max: 13 },
    faceUp: { type: Boolean, required: true, default: false },
  },
  { _id: false }
);

const SolitaireGameSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    username: { type: String, required: true },

    variant: { type: String, enum: ['klondike'], default: 'klondike', required: true },
    drawCount: { type: Number, enum: [1, 3], default: 1 },
    isDaily: { type: Boolean, default: false, index: true },
    dailyKey: { type: String, default: null, index: true }, // YYYY-MM-DD when isDaily

    seed: { type: String, required: true }, // for repeatable deals
    tableau: { type: [[CardSchema]], default: () => [[], [], [], [], [], [], []] },
    foundation: {
      // foundations keyed by suit so logic is simple; client renders them in fixed order
      s: { type: [CardSchema], default: [] },
      h: { type: [CardSchema], default: [] },
      d: { type: [CardSchema], default: [] },
      c: { type: [CardSchema], default: [] },
    },
    stock: { type: [CardSchema], default: [] },
    waste: { type: [CardSchema], default: [] },

    moves: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    recycles: { type: Number, default: 0 },

    // Compact history snapshots for undo. We store last K snapshots to bound size.
    history: {
      type: [
        {
          tableau: { type: [[CardSchema]] },
          foundation: {
            s: [CardSchema],
            h: [CardSchema],
            d: [CardSchema],
            c: [CardSchema],
          },
          stock: [CardSchema],
          waste: [CardSchema],
          moves: Number,
          score: Number,
          recycles: Number,
        },
      ],
      default: [],
    },

    startedAt: { type: Date, default: () => new Date() },
    endedAt: { type: Date, default: null },
    elapsedMs: { type: Number, default: 0 }, // server-tracked total elapsed
    status: {
      type: String,
      enum: ['active', 'won', 'abandoned'],
      default: 'active',
      index: true,
    },
    leaderboardSubmitted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

SolitaireGameSchema.index({ userId: 1, status: 1 });
SolitaireGameSchema.index({ isDaily: 1, dailyKey: 1, userId: 1 });

module.exports = mongoose.model('SolitaireGame', SolitaireGameSchema);
