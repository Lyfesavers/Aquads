'use strict';

const mongoose = require('mongoose');

const PieceSchema = new mongoose.Schema(
  {
    owner: { type: String, enum: ['red', 'black'], required: true },
    king: { type: Boolean, default: false },
  },
  { _id: false }
);

const CheckersGameSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    username: { type: String, required: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
    boardJson: { type: String, default: '' },
    board: { type: [[PieceSchema]], default: () => [] },
    turn: { type: String, enum: ['red', 'black'], default: 'red' },
    jumpFrom: {
      r: { type: Number, default: null },
      c: { type: Number, default: null },
    },
    moveCount: { type: Number, default: 0 },
    captured: {
      red: { type: Number, default: 0 },
      black: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ['active', 'won', 'lost', 'abandoned'],
      default: 'active',
      index: true,
    },
    endedAt: { type: Date, default: null },
    leaderboardSubmitted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

CheckersGameSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('CheckersGame', CheckersGameSchema);
