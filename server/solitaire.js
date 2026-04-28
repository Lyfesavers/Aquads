'use strict';

/**
 * Aquataire — server-authoritative Klondike Solitaire engine.
 *
 * The server owns the full deck, deals it, and validates every move. Clients only
 * see face-up cards; face-down cards are redacted in the wire view, so a player
 * cannot peek at the stock or face-down tableau cards from the browser.
 *
 * Scoring follows standard Klondike (not Vegas):
 *   - waste -> tableau           : +5
 *   - waste -> foundation        : +10
 *   - tableau -> foundation      : +10
 *   - turn over face-down card   : +5
 *   - foundation -> tableau      : -15
 *   - recycle waste (draw-1)     : -100 per recycle pass
 *   - recycle waste (draw-3)     :  -20 per recycle pass
 */

const crypto = require('crypto');

const SUITS = ['s', 'h', 'd', 'c'];
const RED = new Set(['h', 'd']);

const HISTORY_LIMIT = 30; // capped to keep DB doc size bounded

// --- PRNG ---------------------------------------------------------------

/** Seedable PRNG (mulberry32). Same seed -> same deal, which the Daily Challenge needs. */
function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(str) {
  const h = crypto.createHash('sha256').update(String(str)).digest();
  // first 4 bytes -> uint32
  return h.readUInt32BE(0);
}

function randomSeed() {
  return crypto.randomBytes(8).toString('hex');
}

function dailyKey(date = new Date()) {
  // YYYY-MM-DD in UTC so everyone gets the same daily deal
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// --- Deck / deal --------------------------------------------------------

function makeDeck() {
  const deck = [];
  for (let s = 0; s < 4; s++) {
    for (let r = 1; r <= 13; r++) {
      deck.push({ id: s * 13 + (r - 1), suit: SUITS[s], rank: r, faceUp: false });
    }
  }
  return deck;
}

function shuffle(deck, rand) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Deal a Klondike layout from a seeded shuffled deck.
 * Returns { tableau, stock, waste, foundation }.
 */
function dealKlondike(seedString) {
  const seedNum = seedFromString(seedString);
  const rand = mulberry32(seedNum);
  const deck = shuffle(makeDeck(), rand);

  const tableau = [[], [], [], [], [], [], []];
  let cursor = 0;
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = { ...deck[cursor++], faceUp: row === col };
      tableau[col].push(card);
    }
  }
  const stock = deck.slice(cursor).map((c) => ({ ...c, faceUp: false }));
  return {
    tableau,
    stock,
    waste: [],
    foundation: { s: [], h: [], d: [], c: [] },
  };
}

// --- Helpers ------------------------------------------------------------

function isRed(card) {
  return RED.has(card.suit);
}
function colorOf(card) {
  return isRed(card) ? 'red' : 'black';
}
function topOf(pile) {
  return pile.length ? pile[pile.length - 1] : null;
}

function cloneState(g) {
  return {
    tableau: g.tableau.map((col) => col.map((c) => ({ ...c }))),
    foundation: {
      s: g.foundation.s.map((c) => ({ ...c })),
      h: g.foundation.h.map((c) => ({ ...c })),
      d: g.foundation.d.map((c) => ({ ...c })),
      c: g.foundation.c.map((c) => ({ ...c })),
    },
    stock: g.stock.map((c) => ({ ...c })),
    waste: g.waste.map((c) => ({ ...c })),
    moves: g.moves,
    score: g.score,
    recycles: g.recycles,
  };
}

function pushHistory(g) {
  g.history.push(cloneState(g));
  if (g.history.length > HISTORY_LIMIT) {
    g.history.splice(0, g.history.length - HISTORY_LIMIT);
  }
}

// --- Move validation ---------------------------------------------------

function canStackOnTableau(card, target) {
  if (!target) return card.rank === 13; // King onto empty column
  if (!target.faceUp) return false;
  return colorOf(card) !== colorOf(target) && card.rank === target.rank - 1;
}

function canPlaceOnFoundation(card, foundationPile) {
  if (foundationPile.length === 0) return card.rank === 1;
  const t = foundationPile[foundationPile.length - 1];
  return card.suit === t.suit && card.rank === t.rank + 1;
}

/** A tableau sub-stack starting at idx must be a valid descending alt-color sequence. */
function isValidTableauRun(col, idx) {
  for (let i = idx; i < col.length; i++) {
    if (!col[i].faceUp) return false;
  }
  for (let i = idx; i < col.length - 1; i++) {
    const a = col[i];
    const b = col[i + 1];
    if (colorOf(a) === colorOf(b)) return false;
    if (a.rank !== b.rank + 1) return false;
  }
  return true;
}

// --- Auto-flip + win detection -----------------------------------------

function autoFlipTableau(g) {
  // After any move that reduces a tableau column, flip its new top if face-down.
  // Returns score delta from flips.
  let delta = 0;
  for (const col of g.tableau) {
    if (col.length > 0) {
      const top = col[col.length - 1];
      if (!top.faceUp) {
        top.faceUp = true;
        delta += 5;
      }
    }
  }
  return delta;
}

function isWon(g) {
  return (
    g.foundation.s.length === 13 &&
    g.foundation.h.length === 13 &&
    g.foundation.d.length === 13 &&
    g.foundation.c.length === 13
  );
}

function noFaceDownLeft(g) {
  if (g.stock.length > 0) return false;
  for (const col of g.tableau) {
    for (const c of col) {
      if (!c.faceUp) return false;
    }
  }
  return true;
}

// --- Move application --------------------------------------------------

/** Helper: apply a move object. Mutates g, throws Error on invalid. */
function applyMove(g, move) {
  if (!move || typeof move !== 'object') throw new Error('Invalid move');

  switch (move.type) {
    case 'draw':
      return doDraw(g);
    case 'recycle':
      return doRecycle(g);
    case 'play':
      return doPlay(g, move.from, move.to);
    case 'autoComplete':
      return doAutoComplete(g);
    default:
      throw new Error(`Unknown move type: ${move.type}`);
  }
}

function doDraw(g) {
  if (g.stock.length === 0) {
    // empty stock — must call recycle explicitly
    throw new Error('Stock is empty');
  }
  pushHistory(g);
  const n = Math.min(g.drawCount || 1, g.stock.length);
  for (let i = 0; i < n; i++) {
    const card = g.stock.pop();
    card.faceUp = true;
    g.waste.push(card);
  }
  g.moves += 1;
}

function doRecycle(g) {
  if (g.stock.length !== 0) throw new Error('Stock is not empty');
  if (g.waste.length === 0) throw new Error('Waste is empty');
  pushHistory(g);
  // pop from waste back to stock so that a subsequent draw reveals the same order again
  while (g.waste.length) {
    const c = g.waste.pop();
    c.faceUp = false;
    g.stock.push(c);
  }
  g.recycles += 1;
  g.moves += 1;
  // recycle scoring penalty
  if (g.drawCount === 1) g.score = Math.max(0, g.score - 100);
  else g.score = Math.max(0, g.score - 20);
}

/**
 * Move one or more cards from `from` to `to`.
 *
 * from:
 *   { kind: 'waste' }
 *   { kind: 'tableau', col, idx }    // from tableau col, take cards [idx..end]
 *   { kind: 'foundation', suit }      // top of foundation suit
 * to:
 *   { kind: 'tableau', col }
 *   { kind: 'foundation', suit? }     // suit optional; auto-pick from card.suit
 */
function doPlay(g, from, to) {
  if (!from || !to) throw new Error('Missing from/to');

  // 1. Resolve the cards being moved + a "remove" closure.
  let moving;
  let removeFromSource;
  let scoreDelta = 0;

  if (from.kind === 'waste') {
    if (g.waste.length === 0) throw new Error('Waste empty');
    moving = [g.waste[g.waste.length - 1]];
    removeFromSource = () => g.waste.pop();
  } else if (from.kind === 'tableau') {
    const col = g.tableau[from.col];
    if (!col) throw new Error('Bad column');
    if (from.idx == null || from.idx < 0 || from.idx >= col.length) throw new Error('Bad index');
    if (!isValidTableauRun(col, from.idx)) throw new Error('Not a valid run');
    moving = col.slice(from.idx);
    removeFromSource = () => col.splice(from.idx, moving.length);
  } else if (from.kind === 'foundation') {
    const pile = g.foundation[from.suit];
    if (!pile || pile.length === 0) throw new Error('Foundation empty');
    moving = [pile[pile.length - 1]];
    removeFromSource = () => pile.pop();
  } else {
    throw new Error('Unknown source');
  }

  // Card-identity guard: if the client pinned the card it thought it was
  // moving, reject the move when that card is no longer at the source. This
  // catches stale duplicate requests (e.g. a double-click that fired twice)
  // before they mutate the wrong card.
  if (from.cardId != null && moving[0] && moving[0].id !== from.cardId) {
    throw new Error('Source card has changed — please retry');
  }

  // 2. Validate target.
  if (to.kind === 'tableau') {
    const col = g.tableau[to.col];
    if (!col) throw new Error('Bad target column');
    const target = topOf(col);
    if (!canStackOnTableau(moving[0], target)) throw new Error('Illegal tableau move');
  } else if (to.kind === 'foundation') {
    if (moving.length !== 1) throw new Error('Foundations take one card at a time');
    const card = moving[0];
    const suit = to.suit || card.suit;
    if (suit !== card.suit) throw new Error('Foundation/suit mismatch');
    const pile = g.foundation[suit];
    if (!canPlaceOnFoundation(card, pile)) throw new Error('Illegal foundation move');
  } else {
    throw new Error('Unknown target');
  }

  // 3. Score the move.
  if (to.kind === 'foundation') {
    if (from.kind === 'tableau' || from.kind === 'waste') scoreDelta += 10;
    // foundation -> foundation impossible
  } else if (to.kind === 'tableau') {
    if (from.kind === 'waste') scoreDelta += 5;
    if (from.kind === 'foundation') scoreDelta -= 15;
  }

  // 4. Apply.
  pushHistory(g);
  removeFromSource();
  if (to.kind === 'tableau') {
    g.tableau[to.col].push(...moving);
  } else {
    g.foundation[moving[0].suit].push(moving[0]);
  }

  // 5. Auto-flip newly exposed tableau cards.
  scoreDelta += autoFlipTableau(g);

  g.score = Math.max(0, g.score + scoreDelta);
  g.moves += 1;
}

/**
 * When all cards are face-up (no face-down stock or tableau), the game is solved
 * mechanically and we can flush every card to its foundation.
 */
function doAutoComplete(g) {
  if (!noFaceDownLeft(g)) throw new Error('Not all cards are face-up yet');
  pushHistory(g);
  let safety = 200;
  while (safety-- > 0) {
    let movedThisPass = false;
    // promote any tableau top that fits on its foundation
    for (let i = 0; i < g.tableau.length; i++) {
      const col = g.tableau[i];
      if (col.length === 0) continue;
      const top = col[col.length - 1];
      if (canPlaceOnFoundation(top, g.foundation[top.suit])) {
        col.pop();
        g.foundation[top.suit].push(top);
        g.score += 10;
        g.moves += 1;
        movedThisPass = true;
      }
    }
    // also promote waste top if any (rare in auto-complete state, but harmless)
    if (g.waste.length > 0) {
      const top = g.waste[g.waste.length - 1];
      if (canPlaceOnFoundation(top, g.foundation[top.suit])) {
        g.waste.pop();
        g.foundation[top.suit].push(top);
        g.score += 10;
        g.moves += 1;
        movedThisPass = true;
      }
    }
    if (!movedThisPass) break;
  }
}

// --- Hint search -------------------------------------------------------

/**
 * Find a useful move suggestion. Priority:
 *   1. Any card -> foundation.
 *   2. Any waste -> tableau if it unburies progress.
 *   3. Any tableau sub-stack -> tableau if it exposes a face-down card or empties a column.
 * Returns a move-shape suggestion or null.
 */
function findHint(g) {
  // 1. tableau / waste -> foundation
  for (let col = 0; col < g.tableau.length; col++) {
    const top = topOf(g.tableau[col]);
    if (top && top.faceUp && canPlaceOnFoundation(top, g.foundation[top.suit])) {
      return { from: { kind: 'tableau', col, idx: g.tableau[col].length - 1 }, to: { kind: 'foundation', suit: top.suit } };
    }
  }
  if (g.waste.length) {
    const top = g.waste[g.waste.length - 1];
    if (canPlaceOnFoundation(top, g.foundation[top.suit])) {
      return { from: { kind: 'waste' }, to: { kind: 'foundation', suit: top.suit } };
    }
  }

  // 2. waste -> tableau
  if (g.waste.length) {
    const w = g.waste[g.waste.length - 1];
    for (let col = 0; col < g.tableau.length; col++) {
      const target = topOf(g.tableau[col]);
      if (canStackOnTableau(w, target)) {
        return { from: { kind: 'waste' }, to: { kind: 'tableau', col } };
      }
    }
  }

  // 3. tableau sub-stack -> tableau (must improve: expose face-down or empty a column with a King)
  for (let from = 0; from < g.tableau.length; from++) {
    const col = g.tableau[from];
    if (col.length === 0) continue;
    // try every face-up start index
    for (let idx = 0; idx < col.length; idx++) {
      if (!col[idx].faceUp) continue;
      if (!isValidTableauRun(col, idx)) continue;
      const head = col[idx];
      const exposesFaceDown = idx > 0 && !col[idx - 1].faceUp;
      const emptiesColumn = idx === 0;
      for (let to = 0; to < g.tableau.length; to++) {
        if (to === from) continue;
        const target = topOf(g.tableau[to]);
        if (!canStackOnTableau(head, target)) continue;
        // Only suggest if it actually improves position
        if (exposesFaceDown || (emptiesColumn && target !== null) || head.rank === 13) {
          return { from: { kind: 'tableau', col: from, idx }, to: { kind: 'tableau', col: to } };
        }
      }
      break; // only consider topmost valid run per column
    }
  }

  // 4. last resort: draw / recycle
  if (g.stock.length > 0) return { type: 'draw' };
  if (g.waste.length > 0) return { type: 'recycle' };

  return null;
}

// --- Wire view (redacts face-down cards) -------------------------------

function viewCard(card) {
  if (card.faceUp) {
    return { id: card.id, suit: card.suit, rank: card.rank, faceUp: true };
  }
  return { faceUp: false };
}

function viewState(g, { revealAll = false } = {}) {
  const expose = (c) => (revealAll ? { id: c.id, suit: c.suit, rank: c.rank, faceUp: c.faceUp } : viewCard(c));
  return {
    variant: g.variant,
    drawCount: g.drawCount,
    isDaily: g.isDaily,
    dailyKey: g.dailyKey,
    tableau: g.tableau.map((col) => col.map(expose)),
    foundation: {
      s: g.foundation.s.map(expose),
      h: g.foundation.h.map(expose),
      d: g.foundation.d.map(expose),
      c: g.foundation.c.map(expose),
    },
    stockCount: g.stock.length,
    wasteTop: g.waste.length ? g.waste.slice(Math.max(0, g.waste.length - 3)).map(expose) : [],
    wasteCount: g.waste.length,
    moves: g.moves,
    score: g.score,
    recycles: g.recycles,
    status: g.status,
    elapsedMs: typeof g.elapsedMs === 'number' ? g.elapsedMs : 0,
    canAutoComplete: noFaceDownLeft(g) && !isWon(g),
    won: isWon(g),
  };
}

function undoLast(g) {
  const snap = g.history.pop();
  if (!snap) throw new Error('Nothing to undo');
  g.tableau = snap.tableau.map((col) => col.map((c) => ({ ...c })));
  g.foundation = {
    s: snap.foundation.s.map((c) => ({ ...c })),
    h: snap.foundation.h.map((c) => ({ ...c })),
    d: snap.foundation.d.map((c) => ({ ...c })),
    c: snap.foundation.c.map((c) => ({ ...c })),
  };
  g.stock = snap.stock.map((c) => ({ ...c }));
  g.waste = snap.waste.map((c) => ({ ...c }));
  g.moves = snap.moves;
  g.score = Math.max(0, snap.score - 2); // small undo penalty
  g.recycles = snap.recycles;
}

// --- Public API --------------------------------------------------------

/**
 * Build a fresh in-memory game object.
 *
 * opts: { userId, username, drawCount, isDaily }
 */
function createGame(opts) {
  const drawCount = opts.drawCount === 3 ? 3 : 1;
  const isDaily = !!opts.isDaily;
  const dKey = isDaily ? dailyKey(opts.now ? new Date(opts.now) : new Date()) : null;
  const seed = isDaily ? `aquataire-daily-${dKey}` : `aquataire-${randomSeed()}`;

  const dealt = dealKlondike(seed);
  const now = new Date();

  return {
    userId: opts.userId,
    username: opts.username,
    variant: 'klondike',
    drawCount,
    isDaily,
    dailyKey: dKey,
    seed,
    tableau: dealt.tableau,
    foundation: dealt.foundation,
    stock: dealt.stock,
    waste: dealt.waste,
    moves: 0,
    score: 0,
    recycles: 0,
    history: [],
    startedAt: now,
    endedAt: null,
    elapsedMs: 0,
    status: 'active',
    leaderboardSubmitted: false,
  };
}

module.exports = {
  // creation + state
  createGame,
  cloneState,
  viewState,
  // moves
  applyMove,
  doDraw,
  doRecycle,
  doPlay,
  doAutoComplete,
  undoLast,
  // helpers
  isWon,
  noFaceDownLeft,
  findHint,
  dailyKey,
  // validators (exported for tests)
  canStackOnTableau,
  canPlaceOnFoundation,
  isValidTableauRun,
};
