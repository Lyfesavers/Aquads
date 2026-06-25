'use strict';

/**
 * Server-authoritative checkers (8×8, mandatory captures, multi-jump, flying kings).
 * Men move/capture forward one step; crowned kings slide and capture any distance diagonally.
 * Player is always red (bottom); AI is black (top).
 */

const BOARD_SIZE = 8;
const PLAYER = 'red';
const AI = 'black';

function isDarkSquare(r, c) {
  return (r + c) % 2 === 1;
}

function boardRow(board, r) {
  if (!board) return null;
  if (Array.isArray(board)) return board[r];
  return board[r] ?? board[String(r)] ?? null;
}

function boardCell(board, r, c) {
  const row = boardRow(board, r);
  if (!row) return null;
  if (Array.isArray(row)) return row[c] ?? null;
  return row[c] ?? row[String(c)] ?? null;
}

/** MongoDB/Mongoose may return sparse or object-keyed boards — always rebuild 8×8. */
function normalizeBoard(board) {
  const out = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = boardCell(board, r, c);
      if (cell && (cell.owner === PLAYER || cell.owner === AI)) {
        out[r][c] = { owner: cell.owner, king: !!cell.king };
      }
    }
  }
  return out;
}

function cloneBoard(board) {
  return normalizeBoard(board).map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function deserializeBoard(raw) {
  if (typeof raw === 'string' && raw.length > 0) {
    try {
      return normalizeBoard(JSON.parse(raw));
    } catch (_) {
      /* fall through */
    }
  }
  return normalizeBoard(raw);
}

function serializeBoard(board) {
  return JSON.stringify(normalizeBoard(board));
}

function normalizeSquare(sq) {
  if (!sq || sq.r == null || sq.c == null) return null;
  return { r: Number(sq.r), c: Number(sq.c) };
}

function createInitialBoard() {
  const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (!isDarkSquare(r, c)) continue;
      if (r < 3) board[r][c] = { owner: AI, king: false };
      else if (r > 4) board[r][c] = { owner: PLAYER, king: false };
    }
  }
  return board;
}

function inBounds(r, c) {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

function forwardDirs(owner) {
  if (owner === PLAYER) return [[-1, -1], [-1, 1]];
  return [[1, -1], [1, 1]];
}

function allDirs() {
  return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
}

function pieceAt(board, r, c) {
  if (!inBounds(r, c)) return null;
  return boardCell(board, r, c);
}

function countPieces(board) {
  const b = normalizeBoard(board);
  const counts = { [PLAYER]: 0, [AI]: 0 };
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = b[r][c];
      if (p) counts[p.owner] += 1;
    }
  }
  return counts;
}

function promoteIfNeeded(board, r, c) {
  const p = board[r][c];
  if (!p || p.king) return;
  if (p.owner === PLAYER && r === 0) p.king = true;
  if (p.owner === AI && r === BOARD_SIZE - 1) p.king = true;
}

function slideMovesFrom(board, r, c, owner) {
  const moves = [];
  const piece = board[r][c];
  if (!piece || piece.owner !== owner) return moves;

  if (piece.king) {
    for (const [dr, dc] of allDirs()) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc) && isDarkSquare(nr, nc) && !board[nr][nc]) {
        moves.push({ from: { r, c }, to: { r: nr, c: nc }, captures: [] });
        nr += dr;
        nc += dc;
      }
    }
    return moves;
  }

  for (const [dr, dc] of forwardDirs(owner)) {
    const nr = r + dr;
    const nc = c + dc;
    if (!inBounds(nr, nc) || !isDarkSquare(nr, nc)) continue;
    if (board[nr][nc]) continue;
    moves.push({ from: { r, c }, to: { r: nr, c: nc }, captures: [] });
  }
  return moves;
}

function manCaptureMovesFrom(board, r, c, owner, captured = [], chainStart = null) {
  const moves = [];
  const piece = board[r][c];
  if (!piece || piece.owner !== owner || piece.king) return moves;
  const start = chainStart || { r, c };

  for (const [dr, dc] of forwardDirs(owner)) {
    const mr = r + dr;
    const mc = c + dc;
    const lr = r + dr * 2;
    const lc = c + dc * 2;
    if (!inBounds(lr, lc) || !isDarkSquare(lr, lc)) continue;
    const mid = pieceAt(board, mr, mc);
    if (!mid || mid.owner === owner) continue;
    if (board[lr][lc]) continue;
    if (captured.some((p) => p.r === mr && p.c === mc)) continue;

    const nextBoard = cloneBoard(board);
    nextBoard[r][c] = null;
    nextBoard[mr][mc] = null;
    nextBoard[lr][lc] = { owner, king: false };
    promoteIfNeeded(nextBoard, lr, lc);

    const nextCaptured = captured.concat([{ r: mr, c: mc }]);
    const further = captureMovesFrom(nextBoard, lr, lc, owner, nextCaptured, start);
    if (further.length) {
      moves.push(...further);
    } else {
      moves.push({ from: { r: start.r, c: start.c }, to: { r: lr, c: lc }, captures: nextCaptured });
    }
  }
  return moves;
}

function kingCaptureMovesFrom(board, r, c, owner, captured = [], chainStart = null) {
  const moves = [];
  const piece = board[r][c];
  if (!piece || piece.owner !== owner || !piece.king) return moves;
  const start = chainStart || { r, c };

  for (const [dr, dc] of allDirs()) {
    let sr = r + dr;
    let sc = c + dc;
    let opponent = null;

    while (inBounds(sr, sc) && isDarkSquare(sr, sc)) {
      const cell = board[sr][sc];
      if (cell) {
        if (cell.owner === owner) break;
        if (captured.some((p) => p.r === sr && p.c === sc)) break;
        opponent = { r: sr, c: sc };
        break;
      }
      sr += dr;
      sc += dc;
    }
    if (!opponent) continue;

    let lr = opponent.r + dr;
    let lc = opponent.c + dc;
    while (inBounds(lr, lc) && isDarkSquare(lr, lc) && !board[lr][lc]) {
      const nextBoard = cloneBoard(board);
      nextBoard[r][c] = null;
      nextBoard[opponent.r][opponent.c] = null;
      nextBoard[lr][lc] = { owner, king: true };

      const nextCaptured = captured.concat([opponent]);
      const further = kingCaptureMovesFrom(nextBoard, lr, lc, owner, nextCaptured, start);
      if (further.length) {
        moves.push(...further);
      } else {
        moves.push({ from: { r: start.r, c: start.c }, to: { r: lr, c: lc }, captures: nextCaptured });
      }
      lr += dr;
      lc += dc;
    }
  }
  return moves;
}

function captureMovesFrom(board, r, c, owner, captured = [], chainStart = null) {
  const piece = board[r][c];
  if (!piece || piece.owner !== owner) return [];
  if (piece.king) return kingCaptureMovesFrom(board, r, c, owner, captured, chainStart);
  return manCaptureMovesFrom(board, r, c, owner, captured, chainStart);
}

function normalizeJumpFrom(jf) {
  return normalizeSquare(jf);
}

function getLegalMoves(board, owner, jumpFrom = null) {
  board = normalizeBoard(board);
  jumpFrom = normalizeJumpFrom(jumpFrom);
  if (jumpFrom) {
    return captureMovesFrom(board, jumpFrom.r, jumpFrom.c, owner);
  }

  const captures = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r][c];
      if (!p || p.owner !== owner) continue;
      captures.push(...captureMovesFrom(board, r, c, owner));
    }
  }
  if (captures.length) return captures;

  const slides = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r][c];
      if (!p || p.owner !== owner) continue;
      slides.push(...slideMovesFrom(board, r, c, owner));
    }
  }
  return slides;
}

function sameSquare(a, b) {
  if (!a || !b || a.r == null || a.c == null || b.r == null || b.c == null) return false;
  return Number(a.r) === Number(b.r) && Number(a.c) === Number(b.c);
}

function moveKey(mv) {
  const caps = (mv.captures || []).map((p) => `${p.r},${p.c}`).join('|');
  return `${mv.from.r},${mv.from.c}->${mv.to.r},${mv.to.c}:${caps}`;
}

function findMove(board, owner, jumpFrom, from, to) {
  board = normalizeBoard(board);
  const jf = normalizeJumpFrom(jumpFrom);
  from = normalizeSquare(from);
  to = normalizeSquare(to);
  if (!from || !to) return null;

  const legal = getLegalMoves(board, owner, jf);
  let mv = legal.find((m) => sameSquare(m.from, from) && sameSquare(m.to, to));
  // Mid-jump: accept destination if it matches a legal continuation from jumpFrom.
  if (!mv && jf) {
    mv = legal.find((m) => sameSquare(m.from, jf) && sameSquare(m.to, to));
  }
  return mv || null;
}

function crownPiece(piece, r) {
  if (!piece || piece.king) return;
  if (piece.owner === PLAYER && r === 0) piece.king = true;
  if (piece.owner === AI && r === BOARD_SIZE - 1) piece.king = true;
}

function applyMove(board, mv) {
  const next = cloneBoard(board);
  const piece = next[mv.from.r][mv.from.c];
  if (!piece) throw new Error('No piece at source');

  const caps = mv.captures || [];
  next[mv.from.r][mv.from.c] = null;

  if (caps.length === 0) {
    next[mv.to.r][mv.to.c] = { owner: piece.owner, king: !!piece.king };
    promoteIfNeeded(next, mv.to.r, mv.to.c);
    return next;
  }

  for (const cap of caps) {
    next[cap.r][cap.c] = null;
  }

  const moving = { owner: piece.owner, king: !!piece.king };

  if (caps.length) {
    let r = mv.from.r;
    let c = mv.from.c;
    for (const cap of caps) {
      const adr = Math.abs(cap.r - r);
      const adc = Math.abs(cap.c - c);
      if (adr === 1 && adc === 1) {
        r = cap.r + (cap.r - r);
        c = cap.c + (cap.c - c);
        crownPiece(moving, r);
      } else {
        // Flying-king segment (or man that just crowned and continues as king).
        moving.king = true;
      }
    }
    crownPiece(moving, mv.to.r);
  }

  next[mv.to.r][mv.to.c] = { owner: moving.owner, king: moving.king };
  promoteIfNeeded(next, mv.to.r, mv.to.c);
  return next;
}

function hasMoreJumps(board, mv) {
  board = normalizeBoard(board);
  if (!mv.captures || mv.captures.length === 0) return false;
  const piece = boardCell(board, mv.to.r, mv.to.c);
  if (!piece) return false;
  return captureMovesFrom(board, mv.to.r, mv.to.c, piece.owner).length > 0;
}

function evaluateBoard(board, perspective = PLAYER) {
  const counts = countPieces(board);
  let score = (counts[perspective] - counts[perspective === PLAYER ? AI : PLAYER]) * 100;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r][c];
      if (!p) continue;
      const sign = p.owner === perspective ? 1 : -1;
      if (p.king) score += 15 * sign;
      else score += 5 * sign;
      const centerDist = Math.abs(c - 3.5) + Math.abs(r - 3.5);
      score += (4 - centerDist) * sign;
    }
  }

  const myMoves = getLegalMoves(board, perspective).length;
  const oppMoves = getLegalMoves(board, perspective === PLAYER ? AI : PLAYER).length;
  score += (myMoves - oppMoves) * 3;
  return score;
}

function minimax(board, depth, alpha, beta, maximizing, perspective) {
  const counts = countPieces(board);
  if (counts[PLAYER] === 0) return { score: perspective === AI ? 100000 : -100000 };
  if (counts[AI] === 0) return { score: perspective === AI ? -100000 : 100000 };

  const side = maximizing ? perspective : (perspective === PLAYER ? AI : PLAYER);
  const moves = getLegalMoves(board, side);
  if (moves.length === 0) {
    return { score: maximizing ? -50000 : 50000 };
  }
  if (depth === 0) {
    return { score: evaluateBoard(board, perspective) };
  }

  let bestMove = moves[0];
  if (maximizing) {
    let best = -Infinity;
    for (const mv of moves) {
      const next = applyMove(board, mv);
      let childScore;
      if (hasMoreJumps(next, mv)) {
        childScore = minimax(next, depth - 1, alpha, beta, true, perspective).score;
      } else {
        childScore = minimax(next, depth - 1, alpha, beta, false, perspective).score;
      }
      if (childScore > best) {
        best = childScore;
        bestMove = mv;
      }
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return { score: best, move: bestMove };
  }

  let best = Infinity;
  for (const mv of moves) {
    const next = applyMove(board, mv);
    let childScore;
    if (hasMoreJumps(next, mv)) {
      childScore = minimax(next, depth - 1, alpha, beta, false, perspective).score;
    } else {
      childScore = minimax(next, depth - 1, alpha, beta, true, perspective).score;
    }
    if (childScore < best) {
      best = childScore;
      bestMove = mv;
    }
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return { score: best, move: bestMove };
}

function chooseAiMove(board, difficulty, jumpFrom = null) {
  const moves = getLegalMoves(board, AI, jumpFrom);
  if (!moves.length) return null;

  if (difficulty === 'Easy') {
    const captures = moves.filter((m) => (m.captures || []).length > 0);
    const pool = captures.length ? captures : moves;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const depth = difficulty === 'Hard' ? 4 : 3;
  const { move } = minimax(board, depth, -Infinity, Infinity, true, AI);
  return move || moves[0];
}

function resolveOutcome(board, turn) {
  const counts = countPieces(board);
  if (counts[PLAYER] === 0) return 'lost';
  if (counts[AI] === 0) return 'won';
  const playerMoves = getLegalMoves(board, PLAYER).length;
  const aiMoves = getLegalMoves(board, AI).length;
  if (turn === PLAYER && playerMoves === 0) return 'lost';
  if (turn === AI && aiMoves === 0) return 'won';
  return null;
}

function createGame({ userId, username, difficulty = 'Medium' }) {
  const board = createInitialBoard();
  return {
    userId,
    username: String(username || 'Player').slice(0, 32),
    difficulty: ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : 'Medium',
    board,
    turn: PLAYER,
    jumpFrom: { r: null, c: null },
    moveCount: 0,
    captured: { [PLAYER]: 0, [AI]: 0 },
    status: 'active',
    endedAt: null,
    leaderboardSubmitted: false,
  };
}

function applySideMove(game, mv) {
  game.board = normalizeBoard(game.board);
  const owner = game.turn;
  const from = normalizeSquare(mv.from);
  const to = normalizeSquare(mv.to);
  const legal = findMove(game.board, owner, game.jumpFrom, from, to);
  if (!legal) throw new Error('Illegal move');

  const capsBefore = (legal.captures || []).length;
  game.board = applyMove(game.board, legal);
  if (capsBefore > 0) {
    game.captured[owner] += capsBefore;
  }
  game.moveCount += 1;

  if (hasMoreJumps(game.board, legal)) {
    game.jumpFrom = { r: legal.to.r, c: legal.to.c };
    return { continuedJump: true };
  }

  game.jumpFrom = null;
  game.turn = owner === PLAYER ? AI : PLAYER;
  return { continuedJump: false };
}

function runAiTurn(game) {
  const aiMoves = [];
  while (game.status === 'active' && game.turn === AI) {
    const mv = chooseAiMove(game.board, game.difficulty, game.jumpFrom);
    if (!mv) {
      game.status = 'won';
      game.endedAt = new Date();
      break;
    }
    aiMoves.push({ from: mv.from, to: mv.to, captures: mv.captures || [] });
    const { continuedJump } = applySideMove(game, mv);
    const outcome = resolveOutcome(game.board, game.turn);
    if (outcome === 'won') {
      game.status = 'won';
      game.endedAt = new Date();
      break;
    }
    if (outcome === 'lost') {
      game.status = 'lost';
      game.endedAt = new Date();
      break;
    }
    if (!continuedJump) break;
  }
  return aiMoves;
}

function applyPlayerMove(game, from, to) {
  if (game.status !== 'active') throw new Error('Game is not active');
  if (game.turn !== PLAYER) throw new Error('Not your turn');
  game.board = normalizeBoard(game.board);
  game.jumpFrom = normalizeJumpFrom(game.jumpFrom);

  const { continuedJump } = applySideMove(game, { from, to });
  let outcome = resolveOutcome(game.board, game.turn);
  if (outcome === 'won') {
    game.status = 'won';
    game.endedAt = new Date();
    return {
      continuedJump,
      aiMoves: [],
      outcome: 'won',
      stateAfterPlayer: {
        board: cloneBoard(game.board),
        turn: game.turn,
        jumpFrom: game.jumpFrom,
        captured: { ...game.captured },
        moveCount: game.moveCount,
      },
    };
  }
  if (outcome === 'lost') {
    game.status = 'lost';
    game.endedAt = new Date();
    return {
      continuedJump,
      aiMoves: [],
      outcome: 'lost',
      stateAfterPlayer: {
        board: cloneBoard(game.board),
        turn: game.turn,
        jumpFrom: game.jumpFrom,
        captured: { ...game.captured },
        moveCount: game.moveCount,
      },
    };
  }

  if (continuedJump) {
    return {
      continuedJump: true,
      aiMoves: [],
      outcome: null,
      stateAfterPlayer: {
        board: cloneBoard(game.board),
        turn: game.turn,
        jumpFrom: game.jumpFrom,
        captured: { ...game.captured },
        moveCount: game.moveCount,
      },
    };
  }

  const stateAfterPlayer = {
    board: cloneBoard(game.board),
    turn: game.turn,
    jumpFrom: game.jumpFrom,
    captured: { ...game.captured },
    moveCount: game.moveCount,
  };

  const aiMoves = runAiTurn(game);
  outcome = game.status === 'active' ? null : game.status;
  return { continuedJump: false, aiMoves, outcome, stateAfterPlayer };
}

function viewState(game) {
  const board = normalizeBoard(game.board);
  const legalMoves = game.status === 'active' && game.turn === PLAYER
    ? getLegalMoves(board, PLAYER, game.jumpFrom)
    : [];

  return {
    board: cloneBoard(board),
    turn: game.turn,
    jumpFrom: normalizeJumpFrom(game.jumpFrom),
    status: game.status,
    difficulty: game.difficulty,
    playerColor: PLAYER,
    moveCount: game.moveCount,
    captured: { ...game.captured },
    pieceCounts: countPieces(board),
    legalMoves: legalMoves.map((mv) => ({
      from: mv.from,
      to: mv.to,
      captures: mv.captures || [],
    })),
  };
}

module.exports = {
  PLAYER,
  AI,
  BOARD_SIZE,
  createGame,
  viewState,
  applyPlayerMove,
  getLegalMoves,
  chooseAiMove,
  countPieces,
  normalizeBoard,
  serializeBoard,
  deserializeBoard,
};
