import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getLeaderboard, submitLeaderboard, buyPowerUp, fetchMyPoints, socket } from '../services/api';

// Dots & Boxes with a strong AI opponent, SVG animations, and modern styling
// Board representation: rows x cols boxes (dots are rows+1 x cols+1)

const PLAYER = 'YOU';
const AI = 'AI';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// Fair 50/50 coin flip using cryptographic randomness when available
function fairCoinFlip() {
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return (buf[0] & 1) === 1;
    }
  } catch (_) {}
  return Math.random() < 0.5;
}

function createEmptyBoard(rows, cols) {
  const horizontalEdges = Array.from({ length: rows + 1 }, () => Array(cols).fill(false));
  const verticalEdges = Array.from({ length: rows }, () => Array(cols + 1).fill(false));
  const boxes = Array.from({ length: rows }, () => Array(cols).fill(null));
  return { horizontalEdges, verticalEdges, boxes };
}

function countBoxSides(horizontalEdges, verticalEdges, r, c) {
  let count = 0;
  if (horizontalEdges[r][c]) count++; // top
  if (horizontalEdges[r + 1][c]) count++; // bottom
  if (verticalEdges[r][c]) count++; // left
  if (verticalEdges[r][c + 1]) count++; // right
  return count;
}

function cloneState(state) {
  return {
    rows: state.rows,
    cols: state.cols,
    turn: state.turn,
    horizontalEdges: state.horizontalEdges.map(row => row.slice()),
    verticalEdges: state.verticalEdges.map(row => row.slice()),
    boxes: state.boxes.map(row => row.slice()),
    score: { ...state.score },
  };
}

function applyEdge(state, move, owner) {
  const next = cloneState(state);
  const { type, r, c } = move; // type: 'H' | 'V'
  if (type === 'H') {
    if (next.horizontalEdges[r][c]) return { next, captured: 0 };
    next.horizontalEdges[r][c] = true;
  } else {
    if (next.verticalEdges[r][c]) return { next, captured: 0 };
    next.verticalEdges[r][c] = true;
  }

  // Check completed boxes
  let captured = 0;
  const impacted = [];
  if (type === 'H') {
    if (r > 0) impacted.push([r - 1, c]);
    if (r < next.rows) impacted.push([r, c]);
  } else {
    if (c > 0) impacted.push([r, c - 1]);
    if (c < next.cols) impacted.push([r, c]);
  }
  for (const [br, bc] of impacted) {
    if (!next.boxes[br][bc] && countBoxSides(next.horizontalEdges, next.verticalEdges, br, bc) === 4) {
      next.boxes[br][bc] = owner;
      captured += 1;
      next.score[owner] += 1;
    }
  }
  return { next, captured };
}

function getAllMoves(state) {
  const moves = [];
  for (let r = 0; r < state.rows + 1; r++) {
    for (let c = 0; c < state.cols; c++) {
      if (!state.horizontalEdges[r][c]) moves.push({ type: 'H', r, c });
    }
  }
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols + 1; c++) {
      if (!state.verticalEdges[r][c]) moves.push({ type: 'V', r, c });
    }
  }
  return moves;
}

function isSafeMove(state, move) {
  // A move is "safe" if it does not create a box with 3 sides (giving opponent an easy capture)
  const temp = cloneState(state);
  const { next } = applyEdge(temp, move, state.turn);
  // Check boxes that could have become 3-sided
  const check = [];
  if (move.type === 'H') {
    if (move.r > 0) check.push([move.r - 1, move.c]);
    if (move.r < next.rows) check.push([move.r, move.c]);
  } else {
    if (move.c > 0) check.push([move.r, move.c - 1]);
    if (move.c < next.cols) check.push([move.r, move.c]);
  }
  for (const [br, bc] of check) {
    const sides = countBoxSides(next.horizontalEdges, next.verticalEdges, br, bc);
    if (sides === 3 && next.boxes[br][bc] === null) return false;
  }
  return true;
}

function greedyPlayout(state, currentTurn) {
  // Continue capturing boxes as long as available for currentTurn
  let activeTurn = currentTurn;
  let s = cloneState(state);
  while (true) {
    let capturedThisLoop = 0;
    // Try to find a move that completes a box
    const moves = getAllMoves(s);
    let played = false;
    for (const move of moves) {
      const { next, captured } = applyEdge(s, move, activeTurn);
      if (captured > 0) {
        s = next;
        capturedThisLoop += captured;
        played = true;
        break; // take one at a time, then check again because still same turn
      }
    }
    if (!played) {
      // No immediate captures; turn passes to the other player
      if (capturedThisLoop === 0) {
        return { state: s, turn: activeTurn === PLAYER ? AI : PLAYER };
      }
    }
  }
}

function evaluatePosition(state, perspective) {
  const my = state.score[perspective];
  const opp = state.score[perspective === PLAYER ? AI : PLAYER];
  // Heuristic bonus: fewer 3-sided boxes on board is generally better before endgame
  let danger = 0;
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      if (!state.boxes[r][c] && countBoxSides(state.horizontalEdges, state.verticalEdges, r, c) === 3) danger++;
    }
  }
  return (my - opp) * 10 - danger;
}

function simulateMoveWithGreedy(state, move, current) {
  // Apply move, then perform greedy playouts for whoever earns extra turns
  const { next, captured } = applyEdge(state, move, current);
  let s = next;
  let nextTurn = current;
  if (captured > 0) {
    // current continues; play greedily to exhaustion
    const res = greedyPlayout(s, current);
    s = res.state;
    nextTurn = res.turn;
  } else {
    nextTurn = current === PLAYER ? AI : PLAYER;
  }
  return { state: s, turn: nextTurn };
}

function chooseAiMove(state, difficulty) {
  const moves = getAllMoves(state);
  if (moves.length === 0) return null;

  // Difficulty tuning
  const config = {
    Hard: { depth: 3, mistakeChance: 0.03, safeBias: 2.0, noise: 0.15, topK: 1, captureWeight: 3 },
    Medium: { depth: 2, mistakeChance: 0.12, safeBias: 1.0, noise: 0.6, topK: 3, captureWeight: 2 },
    Easy: { depth: 1, mistakeChance: 0.33, safeBias: 0.4, noise: 1.2, topK: 5, captureWeight: 1 },
  }[difficulty] || { depth: 2, mistakeChance: 0.12, safeBias: 1.0, noise: 0.6, topK: 3, captureWeight: 2 };

  const safeMovesSet = new Set(
    moves.filter(m => isSafeMove(state, m)).map(m => `${m.type}-${m.r}-${m.c}`)
  );

  const evaluate = (s) => evaluatePosition(s, AI);

  function minimaxPosition(s, turn, d) {
    if (d === 0 || getAllMoves(s).length === 0) return evaluate(s);
    const isAi = turn === AI;
    const list = getAllMoves(s);
    let best = isAi ? -Infinity : Infinity;
    for (const mv of list) {
      const sim = simulateMoveWithGreedy(s, mv, turn);
      const val = minimaxPosition(sim.state, sim.turn, d - 1);
      if (isAi) best = Math.max(best, val); else best = Math.min(best, val);
    }
    return best;
  }

  // Score each move with difficulty-aware noise and safe bias
  const scored = moves.map(mv => {
    const sim = simulateMoveWithGreedy(state, mv, AI);
    const val = minimaxPosition(sim.state, sim.turn, config.depth - 1);
    const immediate = applyEdge(state, mv, AI).captured;
    const isSafe = safeMovesSet.has(`${mv.type}-${mv.r}-${mv.c}`);
    const safeBonus = isSafe ? config.safeBias : -0.25 * (2 - config.safeBias);
    const noise = (Math.random() * 2 - 1) * config.noise;
    const score = val + immediate * config.captureWeight + safeBonus + noise;
    return { mv, score };
  });

  // Sometimes intentionally blunder based on mistakeChance
  if (Math.random() < config.mistakeChance) {
    const randomIndex = Math.floor(Math.random() * scored.length);
    return scored[randomIndex].mv;
  }

  // Otherwise pick among the top K
  scored.sort((a, b) => b.score - a.score);
  const topK = Math.max(1, Math.min(config.topK, scored.length));
  const choiceIndex = Math.floor(Math.random() * topK);
  return scored[choiceIndex].mv;
}

export default function DotsAndBoxes({ currentUser }) {
  const [rows, setRows] = useState(4); // boxes high
  const [cols, setCols] = useState(4); // boxes wide
  const [state, setState] = useState(() => {
    const b = createEmptyBoard(4, 4);
    return {
      rows: 4,
      cols: 4,
      horizontalEdges: b.horizontalEdges,
      verticalEdges: b.verticalEdges,
      boxes: b.boxes,
      turn: PLAYER,
      score: { [PLAYER]: 0, [AI]: 0 },
    };
  });
  const [difficulty, setDifficulty] = useState('Hard');
  // First move is decided by coin toss overlay (no manual selection)
  const [hover, setHover] = useState(null); // { type, r, c }
  const [animEdge, setAnimEdge] = useState(null); // for line draw animation key
  const [animBox, setAnimBox] = useState(null); // { r, c, owner }
  const [gameOver, setGameOver] = useState(false);
  const [resultRecorded, setResultRecorded] = useState(false);
  const hasSubmittedRef = useRef(false);

  const [leaderboard, setLeaderboard] = useState([]);
  const [filterDifficulty, setFilterDifficulty] = useState('All');
  const [filterGrid, setFilterGrid] = useState('All');
  const [showInstructions, setShowInstructions] = useState(false);
  const [tossing, setTossing] = useState(false);
  const [tossWinner, setTossWinner] = useState(null); // 'You' | 'Computer' | null
  const [powerUps, setPowerUps] = useState({ twoMoves: 0, fourMoves: 0 });
  const [points, setPoints] = useState(0);
  const [usingMultiMove, setUsingMultiMove] = useState(0); // remaining extra moves in current activation
  const [buyingPowerUp, setBuyingPowerUp] = useState(null); // tracks which power-up is being purchased

  const svgRef = useRef(null);

  const size = useMemo(() => {
    // Fully responsive sizing for all screen sizes
    const viewport = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const isMobile = viewport < 768;
    const isTablet = viewport >= 768 && viewport < 1024;
    
    if (isMobile) {
      // Mobile: use most of screen width, but ensure minimum size for playability
      return clamp(viewport * 0.85, 320, 500);
    } else if (isTablet) {
      // Tablet: balanced sizing
      return clamp(viewport * 0.65, 500, 700);
    } else {
      // Desktop: larger size for better experience
      return clamp(viewport * 0.55, 600, 900);
    }
  }, []);

  const spacing = useMemo(() => size / (Math.max(rows, cols) + 2), [size, rows, cols]);
  const isDesktop = useMemo(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : true), []);
  const isMobile = useMemo(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false), []);
  const isTablet = useMemo(() => (typeof window !== 'undefined' ? window.innerWidth >= 768 && window.innerWidth < 1024 : false), []);

  useEffect(() => {
    // Check game over
    const remaining = getAllMoves(state).length;
    if (remaining === 0) setGameOver(true);
  }, [state]);

  useEffect(() => {
    if (gameOver) return;
    if (state.turn === AI) {
      const id = setTimeout(() => {
        const mv = chooseAiMove(state, difficulty);
        if (!mv) return;
        playMove(mv, AI);
      }, 450);
      return () => clearTimeout(id);
    }
  }, [state, difficulty, gameOver]);

  // Load leaderboard from server and setup WebSocket
  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const rows = await getLeaderboard('dots-and-boxes', { limit: 20 });
        setLeaderboard(rows);
      } catch (e) {
        console.error('Failed to load leaderboard:', e);
      }
    };

    loadLeaderboard();

    // Listen for real-time leaderboard updates
    const handleLeaderboardUpdate = (data) => {
      if (data.game === 'dots-and-boxes' && data.entry.result === 'Win') {
        setLeaderboard(prev => {
          // Check if this entry already exists (to prevent duplicates from local submission)
          const existingEntry = prev.find(entry => entry._id === data.entry._id);
          if (existingEntry) {
            return prev; // Don't add duplicate
          }
          // Add new win entry and keep only top 20
          const newLeaderboard = [data.entry, ...prev];
          return newLeaderboard.slice(0, 20);
        });
      }
    };

    socket.on('leaderboardUpdated', handleLeaderboardUpdate);

    // Cleanup
    return () => {
      socket.off('leaderboardUpdated', handleLeaderboardUpdate);
    };
  }, []);

  // Load user points & power-ups if logged in
  useEffect(() => {
    (async () => {
      try {
        if (currentUser && currentUser.token) {
          const data = await fetchMyPoints();
          setPoints(data.points || 0);
          setPowerUps(data.powerUps || { twoMoves: 0, fourMoves: 0 });
        }
      } catch (_) {}
    })();
  }, [currentUser]);

  const resetGame = (newRows = rows, newCols = cols) => {
    const b = createEmptyBoard(newRows, newCols);
    setRows(newRows);
    setCols(newCols);
    const initialTurn = null; // decided by coin toss click overlay
    setState({
      rows: newRows,
      cols: newCols,
      horizontalEdges: b.horizontalEdges,
      verticalEdges: b.verticalEdges,
      boxes: b.boxes,
      turn: initialTurn,
      score: { [PLAYER]: 0, [AI]: 0 },
    });
    setGameOver(false);
    setAnimEdge(null);
    setAnimBox(null);
    setResultRecorded(false);
  };

  function playMove(move, who) {
    if (gameOver) return;
    const { next, captured } = applyEdge(state, move, who);
    setAnimEdge({ key: `${move.type}-${move.r}-${move.c}-${Date.now()}` });
    if (captured > 0) {
      // Find which boxes were captured for animation
      const impacted = [];
      if (move.type === 'H') {
        if (move.r > 0) impacted.push([move.r - 1, move.c]);
        if (move.r < next.rows) impacted.push([move.r, move.c]);
      } else {
        if (move.c > 0) impacted.push([move.r, move.c - 1]);
        if (move.c < next.cols) impacted.push([move.r, move.c]);
      }
      for (const [br, bc] of impacted) {
        if (next.boxes[br][bc] === who) setAnimBox({ r: br, c: bc, owner: who, key: `${br}-${bc}-${Date.now()}` });
      }
      // Same player continues
      setState({ ...next, turn: who });
    } else {
      // Multi-move power-up: allow extra sequential moves for the player
      if (who === PLAYER && usingMultiMove > 0) {
        setUsingMultiMove(usingMultiMove - 1);
        setState({ ...next, turn: PLAYER });
      } else {
        setState({ ...next, turn: who === PLAYER ? AI : PLAYER });
      }
    }
  }

  function onEdgeClick(move) {
    if (state.turn !== PLAYER || gameOver) return;
    // Ignore if already drawn
    if (move.type === 'H' && state.horizontalEdges[move.r][move.c]) return;
    if (move.type === 'V' && state.verticalEdges[move.r][move.c]) return;
    playMove(move, PLAYER);
  }

  // Geometry helpers
  const toXY = (r, c) => ({ x: spacing * (c + 1), y: spacing * (r + 1) });

  const edges = useMemo(() => {
    const e = [];
    for (let r = 0; r < rows + 1; r++) {
      for (let c = 0; c < cols; c++) {
        const p1 = toXY(r, c);
        const p2 = toXY(r, c + 1);
        e.push({ type: 'H', r, c, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, taken: state.horizontalEdges[r][c] });
      }
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols + 1; c++) {
        const p1 = toXY(r, c);
        const p2 = toXY(r + 1, c);
        e.push({ type: 'V', r, c, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, taken: state.verticalEdges[r][c] });
      }
    }
    return e;
  }, [rows, cols, spacing, state.horizontalEdges, state.verticalEdges]);

  const dots = useMemo(() => {
    const d = [];
    for (let r = 0; r < rows + 1; r++) {
      for (let c = 0; c < cols + 1; c++) {
        const p = toXY(r, c);
        d.push({ x: p.x, y: p.y });
      }
    }
    return d;
  }, [rows, cols, spacing]);

  const boxes = useMemo(() => {
    const b = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const p1 = toXY(r, c);
        const p2 = toXY(r + 1, c + 1);
        b.push({ r, c, x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y, owner: state.boxes[r][c] });
      }
    }
    return b;
  }, [rows, cols, spacing, state.boxes]);

  const totalBoxes = rows * cols;
  const pScore = state.score[PLAYER];
  const aiScore = state.score[AI];

  // Record result once on game over
  useEffect(() => {
    if (!gameOver || resultRecorded || hasSubmittedRef.current) return;
    const result = pScore === aiScore ? 'Draw' : pScore > aiScore ? 'Win' : 'Loss';
    const entryPayload = {
      result,
      you: pScore,
      ai: aiScore,
      grid: `${rows}x${cols}`,
      difficulty,
    };
    (async () => {
      try {
        hasSubmittedRef.current = true;
        const token = (currentUser && currentUser.token) || null;
        await submitLeaderboard('dots-and-boxes', entryPayload, token);
        // Don't add to local state - let WebSocket handle it to prevent duplicates
             } catch (e) {
         // If server fails, still show a transient entry in UI (only for wins)
         if (result === 'Win') {
           const fallback = {
             _id: `${Date.now()}`,
             username: (currentUser && (currentUser.username || currentUser.email)) || 'Guest',
             createdAt: new Date().toISOString(),
             ...entryPayload,
             game: 'dots-and-boxes',
           };
           setLeaderboard(prev => [fallback, ...prev].slice(0, 20));
         }
       } finally {
        setResultRecorded(true);
      }
    })();
  }, [gameOver, resultRecorded, pScore, aiScore, rows, cols, difficulty, currentUser]);

  const filteredLeaderboard = useMemo(() => {
    return leaderboard
      .filter(r => (filterDifficulty === 'All' || r.difficulty === filterDifficulty))
      .filter(r => (filterGrid === 'All' || r.grid === filterGrid));
  }, [leaderboard, filterDifficulty, filterGrid]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-sky-400 to-fuchsia-500 text-transparent bg-clip-text">Dots & Boxes</span>
            </h1>
            <p className="text-gray-300 mt-1 text-sm sm:text-base">Play against a strong AI with sleek animations.</p>
          </div>
          
          {/* Mobile Controls - Stacked */}
          <div className="flex flex-col sm:hidden gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => setShowInstructions(true)}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 transition-all px-3 py-2 rounded text-xs font-medium shadow-lg"
              >
                📖 How to Play
              </button>
              <button
                onClick={() => resetGame(rows, cols)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 transition-colors px-3 py-2 rounded text-xs"
              >
                Reset
              </button>
            </div>
            <div className="flex gap-2">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-2 text-xs"
              >
                <option>Hard</option>
                <option>Medium</option>
                <option>Easy</option>
              </select>
              <select
                value={`${rows}x${cols}`}
                onChange={(e) => {
                  const [r, c] = e.target.value.split('x').map(Number);
                  resetGame(r, c);
                }}
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-2 text-xs"
              >
                <option value="3x3">3×3</option>
                <option value="4x4">4×4</option>
                <option value="5x5">5×5</option>
                <option value="6x6">6×6</option>
                <option value="7x7">7×7</option>
              </select>
            </div>
          </div>

          {/* Desktop/Tablet Controls - Horizontal */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => setShowInstructions(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 transition-all px-3 sm:px-4 py-2 rounded text-xs sm:text-sm font-medium shadow-lg"
            >
              📖 How to Play
            </button>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-2 sm:px-3 py-2 text-xs sm:text-sm"
            >
              <option>Hard</option>
              <option>Medium</option>
              <option>Easy</option>
            </select>
            <select
              value={`${rows}x${cols}`}
              onChange={(e) => {
                const [r, c] = e.target.value.split('x').map(Number);
                resetGame(r, c);
              }}
              className="bg-gray-800 border border-gray-700 rounded px-2 sm:px-3 py-2 text-xs sm:text-sm"
            >
              <option value="3x3">3×3</option>
              <option value="4x4">4×4</option>
              <option value="5x5">5×5</option>
              <option value="6x6">6×6</option>
              <option value="7x7">7×7</option>
            </select>
            <button
              onClick={() => resetGame(rows, cols)}
              className="bg-indigo-600 hover:bg-indigo-500 transition-colors px-3 sm:px-4 py-2 rounded text-xs sm:text-sm"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start">
          <div className="flex-1 w-full">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-3 sm:p-4 md:p-6">
                             <svg
                 ref={svgRef}
                 width="100%"
                 height={size}
                 viewBox={`0 0 ${spacing * (cols + 2)} ${spacing * (rows + 2)}`}
                 className="mx-auto block max-w-full"
                 style={{ maxHeight: `${size}px` }}
               >
                <defs>
                  <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                  <linearGradient id="playerFill" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.75" />
                    <stop offset="100%" stopColor="#16a34a" stopOpacity="0.85" />
                  </linearGradient>
                  <linearGradient id="aiFill" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f97316" stopOpacity="0.75" />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity="0.85" />
                  </linearGradient>
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Captured box fills with subtle animation */}
                {boxes.map(b => (
                  <rect
                    key={`box-${b.r}-${b.c}`}
                    x={b.x + 2}
                    y={b.y + 2}
                    width={b.w - 4}
                    height={b.h - 4}
                    fill={b.owner === PLAYER ? 'url(#playerFill)' : b.owner === AI ? 'url(#aiFill)' : 'transparent'}
                    opacity={b.owner ? 0.85 : 0}
                    style={{ transition: 'opacity 220ms ease-out' }}
                    rx={8}
                    ry={8}
                  />
                ))}

                {/* Edges */}
                {edges.map((e) => {
                  const isHover = hover && hover.type === e.type && hover.r === e.r && hover.c === e.c;
                  const visibleStroke = e.taken ? 'url(#edgeGradient)' : isHover ? '#7dd3fc' : '#64748b';
                  const strokeWidth = e.taken ? (isMobile ? 6 : isTablet ? 7 : 8) : isHover ? (isMobile ? 6 : isTablet ? 7 : 8) : (isMobile ? 4 : isTablet ? 5 : 6);
                  const lineKey = `${e.type}-${e.r}-${e.c}`;
                  const hitWidth = isMobile ? 16 : isTablet ? 20 : 22;
                  return (
                    <g key={lineKey}>
                      {/* Invisible, thick hit area to make clicking easier */}
                      {!e.taken && (
                        <line
                          x1={e.x1}
                          y1={e.y1}
                          x2={e.x2}
                          y2={e.y2}
                          stroke="#000"
                          strokeOpacity="0.001"
                          strokeWidth={hitWidth}
                          strokeLinecap="round"
                          pointerEvents="stroke"
                          onMouseEnter={() => setHover({ type: e.type, r: e.r, c: e.c })}
                          onMouseLeave={() => setHover(null)}
                          onClick={() => onEdgeClick({ type: e.type, r: e.r, c: e.c })}
                          cursor="pointer"
                        />
                      )}

                      {/* Visible edge */}
                      <line
                        x1={e.x1}
                        y1={e.y1}
                        x2={e.x2}
                        y2={e.y2}
                        stroke={visibleStroke}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        filter={e.taken ? 'url(#glow)' : 'none'}
                        style={e.taken && animEdge ? { strokeDasharray: 300, strokeDashoffset: 0, transition: 'stroke-dashoffset 280ms ease-out' } : undefined}
                      />
                    </g>
                  );
                })}

                {/* Dots */}
                {dots.map((d, i) => (
                  <circle key={`dot-${i}`} cx={d.x} cy={d.y} r={isMobile ? 4 : isTablet ? 5 : 6} fill="#e2e8f0" />
                ))}

                {/* Coin toss overlay: click to decide who starts (shown until first edge is drawn) */}
                {state.horizontalEdges.every(row => row.every(v => !v)) && state.verticalEdges.every(row => row.every(v => !v)) && state.turn == null && (
                  <g>
                    <rect x={spacing*0.5} y={spacing*0.5} width={spacing*(cols+1)} height={spacing*(rows+1)} fill="#000" opacity="0.35" />
                    <g transform={`translate(${(spacing*(cols+2))/2}, ${(spacing*(rows+2))/2})`}>
                      <circle r={isMobile ? 40 : isTablet ? 50 : 60} fill="#0ea5e9" stroke="#a78bfa" strokeWidth="4" filter="url(#glow)"
                        onClick={() => {
                          const winner = fairCoinFlip() ? PLAYER : AI;
                          setState(prev => ({ ...prev, turn: winner }));
                        }} cursor="pointer" />
                      <text textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={isMobile ? 12 : isTablet ? 14 : 16} fontWeight="700">Click coin to toss</text>
                    </g>
                  </g>
                )}
              </svg>
            </div>
          </div>

          <div className="w-full lg:w-80 bg-gray-900/60 rounded-xl p-3 sm:p-4 border border-gray-800">
            <div className="mb-4">
              <div className="text-sm text-gray-400">Turn</div>
              <div className="text-lg font-semibold">
                {state.turn === PLAYER ? 'Your move' : 'Computer thinking…'}
              </div>
            </div>
            {currentUser && (
              <div className="mb-4 rounded-lg bg-gray-800 p-3 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-300">Affiliate Points</div>
                  <div className="text-emerald-400 font-semibold">{points}</div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                    <div className="text-xs sm:text-sm">2 moves (2000 pts)</div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <span className="text-xs text-gray-400">x{powerUps.twoMoves || 0}</span>
                                             <button
                         className="px-2 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
                         onClick={async () => {
                           if (buyingPowerUp) return; // Prevent multiple simultaneous purchases
                           try {
                             setBuyingPowerUp('twoMoves');
                             const res = await buyPowerUp('twoMoves');
                             setPoints(res.points);
                             setPowerUps(res.powerUps);
                           } catch (e) {
                             console.error('Failed to buy power-up:', e);
                           } finally {
                             setBuyingPowerUp(null);
                           }
                         }}
                         disabled={points < 2000 || buyingPowerUp}
                       >{buyingPowerUp === 'twoMoves' ? 'Buying...' : 'Buy'}</button>
                      <button
                        className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
                        onClick={() => {
                          if ((powerUps.twoMoves || 0) > 0 && usingMultiMove === 0 && state.turn === PLAYER) {
                            setPowerUps({ ...powerUps, twoMoves: powerUps.twoMoves - 1 });
                            setUsingMultiMove(1); // +1 extra move after current
                          }
                        }}
                        disabled={(powerUps.twoMoves || 0) === 0 || usingMultiMove !== 0 || state.turn !== PLAYER}
                      >Use</button>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                    <div className="text-xs sm:text-sm">4 moves (3500 pts)</div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <span className="text-xs text-gray-400">x{powerUps.fourMoves || 0}</span>
                                             <button
                         className="px-2 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
                         onClick={async () => {
                           if (buyingPowerUp) return; // Prevent multiple simultaneous purchases
                           try {
                             setBuyingPowerUp('fourMoves');
                             const res = await buyPowerUp('fourMoves');
                             setPoints(res.points);
                             setPowerUps(res.powerUps);
                           } catch (e) {
                             console.error('Failed to buy power-up:', e);
                           } finally {
                             setBuyingPowerUp(null);
                           }
                         }}
                         disabled={points < 3500 || buyingPowerUp}
                       >{buyingPowerUp === 'fourMoves' ? 'Buying...' : 'Buy'}</button>
                      <button
                        className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
                        onClick={() => {
                          if ((powerUps.fourMoves || 0) > 0 && usingMultiMove === 0 && state.turn === PLAYER) {
                            setPowerUps({ ...powerUps, fourMoves: powerUps.fourMoves - 1 });
                            setUsingMultiMove(3); // +3 extra moves after current
                          }
                        }}
                        disabled={(powerUps.fourMoves || 0) === 0 || usingMultiMove !== 0 || state.turn !== PLAYER}
                      >Use</button>
                    </div>
                  </div>
                </div>
                {usingMultiMove > 0 && (
                  <div className="mt-2 text-xs text-amber-300">Power-up active: {usingMultiMove} extra move(s) remaining</div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="rounded-lg bg-gray-800 p-2 sm:p-3">
                <div className="text-xs text-gray-400">You</div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-400">{pScore}</div>
              </div>
              <div className="rounded-lg bg-gray-800 p-2 sm:p-3">
                <div className="text-xs text-gray-400">Computer</div>
                <div className="text-xl sm:text-2xl font-bold text-orange-400">{aiScore}</div>
              </div>
            </div>
            <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-400">Boxes captured: {pScore + aiScore} / {totalBoxes}</div>

            {gameOver && (
              <div className="mt-4 p-3 rounded-lg bg-gradient-to-br from-indigo-900/40 to-fuchsia-900/40 border border-indigo-700/40">
                <div className="font-semibold mb-2">Game Over</div>
                <div className="mb-3">
                  {pScore === aiScore ? 'It\'s a draw!' : pScore > aiScore ? 'You win! 🎉' : 'Computer wins! 🤖'}
                </div>
                <button
                  onClick={() => resetGame(rows, cols)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 transition-colors px-4 py-2 rounded"
                >
                  Play again
                </button>
              </div>
            )}

            <div className="mt-4 sm:mt-6 text-xs text-gray-500 leading-relaxed">
              Tip: Avoid creating a third side of a box until you can take a long chain.
            </div>
            <div className="mt-4 sm:mt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-sm sm:text-base">Leaderboard</div>
                <button
                  onClick={async () => {
                    try {
                      const freshLeaderboard = await getLeaderboard('dots-and-boxes', { limit: 20 });
                      setLeaderboard(freshLeaderboard);
                    } catch (e) {
                      console.error('Failed to refresh leaderboard:', e);
                    }
                  }}
                  className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors"
                >
                  🔄 Refresh
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <select
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs"
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                >
                  <option>All</option>
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
                <select
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs"
                  value={filterGrid}
                  onChange={(e) => setFilterGrid(e.target.value)}
                >
                  <option>All</option>
                  <option>3x3</option>
                  <option>4x4</option>
                  <option>5x5</option>
                </select>
              </div>
              <div className="max-h-48 sm:max-h-72 overflow-y-auto rounded border border-gray-800">
                                 <table className="w-full text-xs">
                   <thead className="bg-gray-800/70 text-gray-300 sticky top-0">
                     <tr>
                       <th className="text-left px-1 sm:px-2 py-1 font-medium">User</th>
                       <th className="text-left px-1 sm:px-2 py-1 font-medium">Score</th>
                       <th className="hidden sm:table-cell text-left px-2 py-1 font-medium">Grid</th>
                       <th className="hidden sm:table-cell text-left px-2 py-1 font-medium">Diff</th>
                       <th className="hidden lg:table-cell text-left px-2 py-1 font-medium">When</th>
                     </tr>
                   </thead>
                                     <tbody>
                     {filteredLeaderboard.length === 0 ? (
                       <tr>
                         <td className="px-2 py-2 text-gray-500" colSpan={5}>No wins yet.</td>
                       </tr>
                     ) : (
                       filteredLeaderboard.map(row => (
                         <tr key={row.id} className="odd:bg-gray-900/30">
                           <td className="px-1 sm:px-2 py-1 text-xs">{row.username || 'Guest'}</td>
                           <td className="px-1 sm:px-2 py-1 text-xs text-emerald-400 font-medium">{row.you} - {row.ai}</td>
                           <td className="hidden sm:table-cell px-2 py-1 text-xs">{row.grid}</td>
                           <td className="hidden sm:table-cell px-2 py-1 text-xs">{row.difficulty}</td>
                           <td className="hidden lg:table-cell px-2 py-1 text-xs">{new Date(row.createdAt || row.date).toLocaleString()}</td>
                         </tr>
                       ))
                     )}
                   </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl sm:rounded-2xl shadow-2xl border border-gray-700 max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-transparent bg-clip-text">
                  🎮 How to Play Dots & Boxes
                </h2>
                <button
                  onClick={() => setShowInstructions(false)}
                  className="text-gray-400 hover:text-white transition-colors text-xl sm:text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4 sm:space-y-6 text-gray-300">
                <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4 border border-gray-700">
                  <h3 className="text-base sm:text-lg font-semibold text-amber-400 mb-2 sm:mb-3">🎯 Objective</h3>
                  <p className="leading-relaxed text-sm sm:text-base">
                    Capture more boxes than your opponent by connecting dots with lines. The player with the most boxes at the end wins!
                  </p>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-lg font-semibold text-emerald-400 mb-3">🎲 Game Rules</h3>
                  <ul className="space-y-2 leading-relaxed">
                    <li className="flex items-start">
                      <span className="text-emerald-400 mr-2">•</span>
                      <span>Click on any line between two dots to draw it</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-emerald-400 mr-2">•</span>
                      <span>If you complete a box (all 4 sides), you capture it and get another turn</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-emerald-400 mr-2">•</span>
                      <span>If you don't complete a box, your turn ends</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-emerald-400 mr-2">•</span>
                      <span>The game ends when all boxes are captured</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-lg font-semibold text-blue-400 mb-3">⚡ Power-ups</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-blue-300">2 Moves (2000 points)</div>
                        <div className="text-sm text-gray-400">Get 1 extra move after your turn</div>
                      </div>
                      <div className="text-xs bg-blue-900/30 px-2 py-1 rounded">2000 pts</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-purple-300">4 Moves (3500 points)</div>
                        <div className="text-sm text-gray-400">Get 3 extra moves after your turn</div>
                      </div>
                      <div className="text-xs bg-purple-900/30 px-2 py-1 rounded">3500 pts</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-lg font-semibold text-orange-400 mb-3">🏆 Strategy Tips</h3>
                  <ul className="space-y-2 leading-relaxed">
                    <li className="flex items-start">
                      <span className="text-orange-400 mr-2">•</span>
                      <span>Avoid creating a third side of a box unless you can complete it</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-400 mr-2">•</span>
                      <span>Try to force your opponent to give you long chains of boxes</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-400 mr-2">•</span>
                      <span>Use power-ups strategically when you're about to capture multiple boxes</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-400 mr-2">•</span>
                      <span>Larger grids (6x6, 7x7) offer more strategic depth</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-lg font-semibold text-fuchsia-400 mb-3">🎲 Getting Started</h3>
                  <ol className="space-y-2 leading-relaxed">
                    <li className="flex items-start">
                      <span className="text-fuchsia-400 mr-2">1.</span>
                      <span>Click the coin to decide who goes first</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-fuchsia-400 mr-2">2.</span>
                      <span>Choose your difficulty level (Easy, Medium, Hard)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-fuchsia-400 mr-2">3.</span>
                      <span>Select grid size (3x3 to 7x7)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-fuchsia-400 mr-2">4.</span>
                      <span>Start playing! Click on lines to draw them</span>
                    </li>
                  </ol>
                </div>
              </div>

              <div className="mt-6 sm:mt-8 flex justify-center">
                <button
                  onClick={() => setShowInstructions(false)}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-semibold shadow-lg text-sm sm:text-base"
                >
                  Let's Play! 🎮
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


