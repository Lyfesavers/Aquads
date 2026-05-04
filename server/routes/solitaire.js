'use strict';

/**
 * REST API for Aquataire (server-authoritative Klondike Solitaire).
 *
 * The card identities of face-down cards never leave the server, so the timer,
 * score, and deck order are all uncheatable.
 */

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const auth = require('../middleware/auth');
const SolitaireGame = require('../models/SolitaireGame');
const LeaderboardEntry = require('../models/LeaderboardEntry');
const engine = require('../solitaire');
let socketModule = null;
try {
  socketModule = require('../socket');
} catch (_) {
  socketModule = null;
}

const LEADERBOARD_GAME = 'aquataire';

function gridLabel(g) {
  if (g.isDaily) return 'daily';
  // Draw 3 retired — anything not daily is the standard Klondike Draw 1 board.
  return g.drawCount === 3 ? 'klondike-d3' : 'klondike-d1';
}

function difficultyLabel(g) {
  if (g.isDaily) return 'Hard';
  return g.drawCount === 3 ? 'Medium' : 'Easy';
}

function recomputeElapsed(g) {
  if (g.status === 'active' && g.startedAt) {
    g.elapsedMs = Date.now() - new Date(g.startedAt).getTime();
  }
}

async function recordWin(g, io) {
  if (g.leaderboardSubmitted) return;
  g.leaderboardSubmitted = true;

  // server-authoritative final time
  recomputeElapsed(g);
  const elapsedSec = Math.max(1, Math.round(g.elapsedMs / 1000));
  try {
    await LeaderboardEntry.create({
      game: LEADERBOARD_GAME,
      userId: g.userId,
      username: String(g.username || 'Player').slice(0, 32),
      result: 'Win',
      you: g.score,
      ai: elapsedSec,
      grid: gridLabel(g),
      difficulty: difficultyLabel(g),
    });
    if (io) {
      try {
        io.emit('leaderboardUpdated', { game: LEADERBOARD_GAME });
      } catch (_) {}
    }
  } catch (err) {
    console.error('[Aquataire] Failed to record win:', err.message);
  }
}

function getIO() {
  try {
    return socketModule && socketModule.getIO ? socketModule.getIO() : null;
  } catch (_) {
    return null;
  }
}

/**
 * Per-game lock so two concurrent /action requests for the same game can't
 * race (load v_N, both apply move, last save wins). Pending requests for the
 * same gameId queue through a Promise chain and execute one at a time.
 * Ref-counted so the map auto-cleans when the queue empties.
 */
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

/**
 * Load a SolitaireGame doc and ensure the requesting user owns it.
 * Returns the Mongoose document (live, save()-able).
 */
async function loadOwnedGame(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    res.status(400).json({ error: 'Invalid game id' });
    return null;
  }
  const game = await SolitaireGame.findById(id);
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

// ---------------------------------------------------------------- routes

// POST /api/aquataire/games/new   { drawCount, daily }
router.post('/games/new', auth, async (req, res) => {
  try {
    // Draw 3 has been retired — every new deal is Draw 1, regardless of payload.
    const drawCount = 1;
    const isDaily = !!(req.body && req.body.daily);

    if (isDaily) {
      const todayKey = engine.dailyKey();
      const existingDaily = await SolitaireGame.findOne({
        userId: req.user.userId,
        isDaily: true,
        dailyKey: todayKey,
      }).sort({ createdAt: -1 });
      if (existingDaily && existingDaily.status === 'won') {
        return res.status(409).json({
          error: 'Already completed today\'s Daily Challenge',
          gameId: String(existingDaily._id),
        });
      }
      if (existingDaily && existingDaily.status === 'active') {
        // resume existing daily instead of dealing a new one
        recomputeElapsed(existingDaily);
        await existingDaily.save();
        return res.json({
          gameId: String(existingDaily._id),
          state: engine.viewState(existingDaily),
        });
      }
    }

    // Abandon any current non-daily active game (one active per user at a time)
    if (!isDaily) {
      await SolitaireGame.updateMany(
        { userId: req.user.userId, status: 'active', isDaily: false },
        { $set: { status: 'abandoned', endedAt: new Date() } }
      );
    }

    const fresh = engine.createGame({
      userId: req.user.userId,
      username: req.user.username,
      drawCount,
      isDaily,
    });
    const doc = new SolitaireGame(fresh);
    await doc.save();
    res.status(201).json({ gameId: String(doc._id), state: engine.viewState(doc) });
  } catch (err) {
    console.error('[Aquataire] new game error:', err);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

// GET /api/aquataire/games/active  -> resume the latest active non-daily game
// Read-only: we update elapsedMs in the response only. Saving here would race
// with in-flight POSTs (loading the doc before their save commits), and could
// overwrite a successful move with stale state.
router.get('/games/active', auth, async (req, res) => {
  try {
    const doc = await SolitaireGame.findOne({
      userId: req.user.userId,
      status: 'active',
      isDaily: false,
    }).sort({ updatedAt: -1 });
    if (!doc) return res.json({ gameId: null });
    recomputeElapsed(doc);
    res.json({ gameId: String(doc._id), state: engine.viewState(doc) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch active game' });
  }
});

// GET /api/aquataire/games/:id  -> read-only fetch (see comment above)
router.get('/games/:id', auth, async (req, res) => {
  try {
    const game = await loadOwnedGame(req, res);
    if (!game) return;
    recomputeElapsed(game);
    res.json({ gameId: String(game._id), state: engine.viewState(game) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

// POST /api/aquataire/games/:id/action  { type: 'draw' | 'recycle' | 'play' | 'autoComplete', from, to }
router.post('/games/:id/action', auth, async (req, res) => {
  try {
    await withGameLock(req.params.id, async () => {
      const game = await loadOwnedGame(req, res);
      if (!game) return;
      if (game.status !== 'active') {
        return res.status(409).json({ error: 'Game is not active' });
      }
      const move = req.body || {};
      try {
        engine.applyMove(game, move);
      } catch (e) {
        // Illegal move — return current authoritative state so the client can
        // re-sync without doing a separate refetch (which used to race with
        // an in-flight successful save).
        recomputeElapsed(game);
        return res.status(400).json({
          error: e.message || 'Illegal move',
          state: engine.viewState(game),
          gameId: String(game._id),
        });
      }

      if (engine.isWon(game)) {
        game.status = 'won';
        game.endedAt = new Date();
        recomputeElapsed(game);
        await game.save();
        await recordWin(game, getIO());
        return res.json({
          gameId: String(game._id),
          state: engine.viewState(game, { revealAll: true }),
          won: true,
        });
      }

      recomputeElapsed(game);
      await game.save();
      res.json({ gameId: String(game._id), state: engine.viewState(game) });
    });
  } catch (err) {
    console.error('[Aquataire] action error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Action failed' });
  }
});

// POST /api/aquataire/games/:id/undo
router.post('/games/:id/undo', auth, async (req, res) => {
  try {
    await withGameLock(req.params.id, async () => {
      const game = await loadOwnedGame(req, res);
      if (!game) return;
      if (game.status !== 'active') return res.status(409).json({ error: 'Game is not active' });
      try {
        engine.undoLast(game);
      } catch (e) {
        recomputeElapsed(game);
        return res.status(400).json({
          error: e.message || 'Cannot undo',
          state: engine.viewState(game),
          gameId: String(game._id),
        });
      }
      recomputeElapsed(game);
      await game.save();
      res.json({ gameId: String(game._id), state: engine.viewState(game) });
    });
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: 'Undo failed' });
  }
});

// POST /api/aquataire/games/:id/hint
router.post('/games/:id/hint', auth, async (req, res) => {
  try {
    const game = await loadOwnedGame(req, res);
    if (!game) return;
    if (game.status !== 'active') return res.status(409).json({ error: 'Game is not active' });
    const hint = engine.findHint(game);
    res.json({ hint });
  } catch (err) {
    res.status(500).json({ error: 'Hint failed' });
  }
});

// POST /api/aquataire/games/:id/abandon
router.post('/games/:id/abandon', auth, async (req, res) => {
  try {
    await withGameLock(req.params.id, async () => {
      const game = await loadOwnedGame(req, res);
      if (!game) return;
      if (game.status !== 'active') return res.json({ ok: true, alreadyEnded: true });
      game.status = 'abandoned';
      game.endedAt = new Date();
      recomputeElapsed(game);
      await game.save();
      res.json({ ok: true });
    });
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: 'Abandon failed' });
  }
});

// GET /api/aquataire/daily/status
router.get('/daily/status', auth, async (req, res) => {
  try {
    const todayKey = engine.dailyKey();
    const existing = await SolitaireGame.findOne({
      userId: req.user.userId,
      isDaily: true,
      dailyKey: todayKey,
    }).sort({ createdAt: -1 });
    res.json({
      dateUtc: todayKey,
      played: !!existing,
      status: existing ? existing.status : null,
      gameId: existing ? String(existing._id) : null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Daily status failed' });
  }
});

// GET /api/aquataire/leaderboard?mode=klondike-d1|klondike-d3|daily&sort=score|time
router.get('/leaderboard', async (req, res) => {
  try {
    const mode = String(req.query.mode || 'klondike-d1');
    const sortBy = req.query.sort === 'time' ? 'time' : 'score';
    const limit = Math.min(Number(req.query.limit) || 25, 100);

    const match = { game: LEADERBOARD_GAME, result: 'Win', grid: mode };

    // group by user, take their best entry per mode
    const sortStage = sortBy === 'time' ? { ai: 1, you: -1 } : { you: -1, ai: 1 };
    const rows = await LeaderboardEntry.aggregate([
      { $match: match },
      { $sort: sortStage },
      {
        $group: {
          _id: '$userId',
          username: { $first: '$username' },
          best: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$best' } },
      { $sort: sortStage },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          userId: 1,
          username: 1,
          score: '$you',
          timeSec: '$ai',
          mode: '$grid',
          difficulty: 1,
          createdAt: 1,
        },
      },
    ]);
    res.json({ mode, sort: sortBy, rows });
  } catch (err) {
    console.error('[Aquataire] leaderboard error:', err);
    res.status(500).json({ error: 'Leaderboard failed' });
  }
});

module.exports = router;
