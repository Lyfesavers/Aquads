'use strict';

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const auth = require('../middleware/auth');
const CheckersGame = require('../models/CheckersGame');
const LeaderboardEntry = require('../models/LeaderboardEntry');
const engine = require('../checkers');

let socketModule = null;
try {
  socketModule = require('../socket');
} catch (_) {
  socketModule = null;
}

const LEADERBOARD_GAME = 'checkers';

function getIO() {
  try {
    return socketModule && socketModule.getIO ? socketModule.getIO() : null;
  } catch (_) {
    return null;
  }
}

const gameLocks = new Map();
async function withGameLock(gameId, fn) {
  const key = String(gameId);
  const slot = gameLocks.get(key) || { busy: Promise.resolve(), refs: 0 };
  slot.refs += 1;
  gameLocks.set(key, slot);
  const prev = slot.busy;
  let release;
  slot.busy = new Promise((r) => { release = r; });
  try {
    await prev;
    return await fn();
  } finally {
    release();
    slot.refs -= 1;
    if (slot.refs === 0) gameLocks.delete(key);
  }
}

async function loadOwnedGame(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    res.status(400).json({ error: 'Invalid game id' });
    return null;
  }
  const game = await CheckersGame.findById(id);
  if (!game) {
    res.status(404).json({ error: 'Game not found' });
    return null;
  }
  if (String(game.userId) !== String(req.user.userId)) {
    res.status(403).json({ error: 'Not your game' });
    return null;
  }
  return game;
}

function normalizeJumpFrom(doc) {
  if (doc.jumpFrom && doc.jumpFrom.r != null && doc.jumpFrom.c != null) {
    return { r: doc.jumpFrom.r, c: doc.jumpFrom.c };
  }
  return null;
}

function plainValue(val) {
  if (val && typeof val.toObject === 'function') return val.toObject();
  return val;
}

function hydrateGame(doc) {
  return {
    board: engine.normalizeBoard(plainValue(doc.board)),
    turn: doc.turn,
    jumpFrom: normalizeJumpFrom(doc),
    status: doc.status,
    difficulty: doc.difficulty,
    moveCount: doc.moveCount,
    captured: plainValue(doc.captured) || { red: 0, black: 0 },
  };
}

function persistFromEngine(doc, gameState) {
  doc.board = engine.normalizeBoard(gameState.board);
  doc.turn = gameState.turn;
  doc.jumpFrom = gameState.jumpFrom || { r: null, c: null };
  doc.moveCount = gameState.moveCount;
  doc.captured = gameState.captured;
  doc.status = gameState.status;
  doc.endedAt = gameState.endedAt;
}

async function recordWin(doc, io) {
  if (doc.leaderboardSubmitted || doc.status !== 'won') return;
  doc.leaderboardSubmitted = true;

  const captured = doc.captured && doc.captured.red != null ? doc.captured.red : 0;
  const remaining = engine.countPieces(doc.board)[engine.PLAYER];

  try {
    const entry = await LeaderboardEntry.create({
      game: LEADERBOARD_GAME,
      userId: doc.userId,
      username: String(doc.username || 'Player').slice(0, 32),
      result: 'Win',
      you: captured,
      ai: remaining,
      moves: Math.max(1, doc.moveCount),
      grid: '8x8',
      difficulty: doc.difficulty,
    });
    if (io) {
      io.emit('leaderboardUpdated', {
        game: LEADERBOARD_GAME,
        entry: {
          _id: entry._id,
          username: entry.username,
          result: entry.result,
          you: entry.you,
          ai: entry.ai,
          moves: entry.moves,
          grid: entry.grid,
          difficulty: entry.difficulty,
          createdAt: entry.createdAt,
        },
      });
    }
  } catch (err) {
    console.error('[Checkers] Failed to record win:', err.message);
  }
}

// POST /api/checkers/games/new  { difficulty }
router.post('/games/new', auth, async (req, res) => {
  try {
    const difficulty = (req.body && req.body.difficulty) || 'Medium';

    await CheckersGame.updateMany(
      { userId: req.user.userId, status: 'active' },
      { $set: { status: 'abandoned', endedAt: new Date() } }
    );

    const fresh = engine.createGame({
      userId: req.user.userId,
      username: req.user.username,
      difficulty,
    });
    const doc = new CheckersGame(fresh);
    await doc.save();
    res.status(201).json({ gameId: String(doc._id), state: engine.viewState(hydrateGame(doc)) });
  } catch (err) {
    console.error('[Checkers] new game error:', err);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

// GET /api/checkers/games/active
router.get('/games/active', auth, async (req, res) => {
  try {
    const doc = await CheckersGame.findOne({
      userId: req.user.userId,
      status: 'active',
    }).sort({ updatedAt: -1 });
    if (!doc) return res.json({ gameId: null });
    res.json({ gameId: String(doc._id), state: engine.viewState(hydrateGame(doc)) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch active game' });
  }
});

// POST /api/checkers/games/:id/move  { from: {r,c}, to: {r,c} }
router.post('/games/:id/move', auth, async (req, res) => {
  try {
    await withGameLock(req.params.id, async () => {
      const doc = await loadOwnedGame(req, res);
      if (!doc) return;
      if (doc.status !== 'active') {
        return res.status(409).json({ error: 'Game is not active' });
      }

      const { from, to } = req.body || {};
      if (!from || !to || from.r == null || from.c == null || to.r == null || to.c == null) {
        return res.status(400).json({ error: 'Invalid move payload' });
      }

      const gameState = {
        ...hydrateGame(doc),
        moveCount: doc.moveCount,
        captured: {
          red: doc.captured.red || 0,
          black: doc.captured.black || 0,
        },
        status: doc.status,
        endedAt: doc.endedAt,
        difficulty: doc.difficulty,
      };

      let result;
      try {
        result = engine.applyPlayerMove(gameState, from, to);
      } catch (e) {
        const synced = engine.viewState({
          ...hydrateGame(doc),
          status: doc.status,
          difficulty: doc.difficulty,
          moveCount: doc.moveCount,
          captured: hydrateGame(doc).captured,
        });
        return res.status(400).json({
          error: e.message || 'Illegal move',
          state: synced,
          gameId: String(doc._id),
        });
      }

      persistFromEngine(doc, gameState);
      await doc.save();

      if (doc.status === 'won') {
        await recordWin(doc, getIO());
        await doc.save();
      }

      res.json({
        gameId: String(doc._id),
        state: engine.viewState(hydrateGame(doc)),
        aiMoves: result.aiMoves || [],
        outcome: doc.status,
        stateAfterPlayer: result.stateAfterPlayer
          ? {
              board: result.stateAfterPlayer.board,
              turn: result.stateAfterPlayer.turn,
              jumpFrom: result.stateAfterPlayer.jumpFrom,
              captured: result.stateAfterPlayer.captured,
              moveCount: result.stateAfterPlayer.moveCount,
            }
          : null,
      });
    });
  } catch (err) {
    console.error('[Checkers] move error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Move failed' });
  }
});

// POST /api/checkers/games/:id/abandon
router.post('/games/:id/abandon', auth, async (req, res) => {
  try {
    const doc = await loadOwnedGame(req, res);
    if (!doc) return;
    if (doc.status === 'active') {
      doc.status = 'abandoned';
      doc.endedAt = new Date();
      await doc.save();
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to abandon game' });
  }
});

module.exports = router;
