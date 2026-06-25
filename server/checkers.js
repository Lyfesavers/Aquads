'use strict';

/**
 * Server-authoritative American checkers (8×8, mandatory captures, multi-jump).
 * Player is always red (bottom); AI is black (top).
 */

const BOARD_SIZE = 8;
const PLAYER = 'red';
const AI = 'black';

function isDarkSquare(r, c) {
  return (r + c) % 2 === 1;
}

function cloneBoard(board) {
  return board.map((row) => row.map((cell) => (cell ? { owner: cell.owner, king: !!cell.king } : null)));
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
  return board[r][c];
}

function countPieces(board) {
  const counts = { [PLAYER]: 0, [AI]: 0 };
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r][c];
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
  const dirs = piece.king ? allDirs() : forwardDirs(owner);
  for (const [dr, dc] of dirs) {
    const nr = r + dr;
    const nc = c + dc;
    if (!inBounds(nr, nc) || !isDarkSquare(nr, nc)) continue;
    if (board[nr][nc]) continue;
    moves.push({ from: { r, c }, to: { r: nr, c: nc }, captures: [] });
  }
  return moves;
}

function captureMovesFrom(board, r, c, owner, captured = []) {
  const moves = [];
  const piece = board[r][c];
  if (!piece || piece.owner !== owner) return moves;
  const dirs = piece.king ? allDirs() : forwardDirs(owner);

  for (const [dr, dc] of dirs) {
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
    nextBoard[lr][lc] = { owner, king: piece.king };
    promoteIfNeeded(nextBoard, lr, lc);

    const nextCaptured = captured.concat([{ r: mr, c: mc }]);
    const further = captureMovesFrom(nextBoard, lr, lc, owner, nextCaptured);
    if (further.length) {
      moves.push(...further);
    } else {
      moves.push({ from: { r, c }, to: { r: lr, c: lc }, captures: nextCaptured });
    }
  }
  return moves;
}

function normalizeJumpFrom(jf) {
  if (jf && jf.r != null && jf.c != null) return { r: jf.r, c: jf.c };
  return null;
}

function getLegalMoves(board, owner, jumpFrom = null) {
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
  return a.r === b.r && a.c === b.c;
}

function moveKey(mv) {
  const caps = (mv.captures || []).map((p) => `${p.r},${p.c}`).join('|');
  return `${mv.from.r},${mv.from.c}->${mv.to.r},${mv.to.c}:${caps}`;
}

function findMove(board, owner, jumpFrom, from, to) {
  const legal = getLegalMoves(board, owner, jumpFrom);
  return legal.find((mv) => sameSquare(mv.from, from) && sameSquare(mv.to, to)) || null;
}

function applyMove(board, mv) {
  const next = cloneBoard(board);
  const piece = next[mv.from.r][mv.from.c];
  if (!piece) throw new Error('No piece at source');
  next[mv.from.r][mv.from.c] = null;
  next[mv.to.r][mv.to.c] = { owner: piece.owner, king: piece.king };
  for (const cap of mv.captures || []) {
    next[cap.r][cap.c] = null;
  }
  promoteIfNeeded(next, mv.to.r, mv.to.c);
  return next;
}

function hasMoreJumps(board, mv) {
  if (!mv.captures || mv.captures.length === 0) return false;
  return captureMovesFrom(board, mv.to.r, mv.to.c, board[mv.to.r][mv.to.c].owner).length > 0;
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

function chooseAiMove(board, difficulty) {
  const moves = getLegalMoves(board, AI);
  if (!moves.length) return null;

  if (difficulty === 'Easy') {
    const captures = moves.filter((m) => (m.captures || []).length > 0);
    const pool = captures.length ? captures : moves;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const depth = difficulty === 'Hard' ? 5 : 3;
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
  const owner = game.turn;
  const legal = findMove(game.board, owner, game.jumpFrom, mv.from, mv.to);
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
    const mv = chooseAiMove(game.board, game.difficulty);
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
  const legalMoves = game.status === 'active' && game.turn === PLAYER
    ? getLegalMoves(game.board, PLAYER, game.jumpFrom)
    : [];

  return {
    board: cloneBoard(game.board),
    turn: game.turn,
    jumpFrom: normalizeJumpFrom(game.jumpFrom),
    status: game.status,
    difficulty: game.difficulty,
    playerColor: PLAYER,
    moveCount: game.moveCount,
    captured: { ...game.captured },
    pieceCounts: countPieces(game.board),
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
};
