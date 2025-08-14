import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getLeaderboard, submitLeaderboard } from '../services/api';

// Dots & Boxes with a strong AI opponent, SVG animations, and modern styling
// Board representation: rows x cols boxes (dots are rows+1 x cols+1)

const PLAYER = 'YOU';
const AI = 'AI';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

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

  // Prefer safe moves in early/mid game
  const safeMoves = moves.filter(m => isSafeMove(state, m));

  const evaluate = (s) => evaluatePosition(s, AI);

  const depth = difficulty === 'Hard' ? 3 : difficulty === 'Medium' ? 2 : 1;

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

  const candidateMoves = safeMoves.length > 0 ? safeMoves : moves;

  let bestMove = candidateMoves[0];
  let bestScore = -Infinity;
  for (const mv of candidateMoves) {
    const sim = simulateMoveWithGreedy(state, mv, AI);
    const val = minimaxPosition(sim.state, sim.turn, depth - 1);
    // Small bonus for immediate captures
    const immediate = applyEdge(state, mv, AI).captured;
    const score = val + immediate * 3;
    if (score > bestScore) {
      bestScore = score;
      bestMove = mv;
    }
  }
  return bestMove;
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
  const [hover, setHover] = useState(null); // { type, r, c }
  const [animEdge, setAnimEdge] = useState(null); // for line draw animation key
  const [animBox, setAnimBox] = useState(null); // { r, c, owner }
  const [gameOver, setGameOver] = useState(false);
  const [resultRecorded, setResultRecorded] = useState(false);
  const hasSubmittedRef = useRef(false);

  const [leaderboard, setLeaderboard] = useState([]);
  const [filterDifficulty, setFilterDifficulty] = useState('All');
  const [filterGrid, setFilterGrid] = useState('All');

  const svgRef = useRef(null);

  const size = useMemo(() => {
    // Responsive sizing leaning desktop; limited change for mobile
    const viewport = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const base = clamp(viewport * 0.5, 420, 800);
    return base;
  }, []);

  const spacing = useMemo(() => size / (Math.max(rows, cols) + 2), [size, rows, cols]);

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

  // Load leaderboard from server
  useEffect(() => {
    (async () => {
      try {
        const rows = await getLeaderboard('dots-and-boxes', { limit: 50 });
        setLeaderboard(rows);
      } catch (e) {
        // silent fail
      }
    })();
  }, []);

  const resetGame = (newRows = rows, newCols = cols) => {
    const b = createEmptyBoard(newRows, newCols);
    setRows(newRows);
    setCols(newCols);
    setState({
      rows: newRows,
      cols: newCols,
      horizontalEdges: b.horizontalEdges,
      verticalEdges: b.verticalEdges,
      boxes: b.boxes,
      turn: PLAYER,
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
      setState({ ...next, turn: who === PLAYER ? AI : PLAYER });
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
        const saved = await submitLeaderboard('dots-and-boxes', entryPayload);
        setLeaderboard(prev => [saved, ...prev].slice(0, 50));
      } catch (e) {
        // If server fails, still show a transient entry in UI
        const fallback = {
          _id: `${Date.now()}`,
          username: (currentUser && (currentUser.username || currentUser.email)) || 'Guest',
          createdAt: new Date().toISOString(),
          ...entryPayload,
          game: 'dots-and-boxes',
        };
        setLeaderboard(prev => [fallback, ...prev].slice(0, 50));
      } finally {
        setResultRecorded(true);
      }
    })();
  }, [gameOver, resultRecorded, pScore, aiScore, rows, cols, difficulty, currentUser]);

  const filteredLeaderboard = useMemo(() => {
    return leaderboard
      .filter(r => (filterDifficulty === 'All' || r.difficulty === filterDifficulty))
      .filter(r => (filterGrid === 'All' || r.grid === filterGrid))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [leaderboard, filterDifficulty, filterGrid]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-sky-400 to-fuchsia-500 text-transparent bg-clip-text">Dots & Boxes</span>
            </h1>
            <p className="text-gray-300 mt-1">Play against a strong AI with sleek animations.</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
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
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
            >
              <option value="3x3">3 x 3</option>
              <option value="4x4">4 x 4</option>
              <option value="5x5">5 x 5</option>
            </select>
            <button
              onClick={() => resetGame(rows, cols)}
              className="bg-indigo-600 hover:bg-indigo-500 transition-colors px-4 py-2 rounded text-sm"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="flex-1">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6">
              <svg
                ref={svgRef}
                width={size}
                height={size}
                viewBox={`0 0 ${spacing * (cols + 2)} ${spacing * (rows + 2)}`}
                className="mx-auto block"
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
                {edges.map((e, idx) => {
                  const isHover = hover && hover.type === e.type && hover.r === e.r && hover.c === e.c;
                  const stroke = e.taken ? 'url(#edgeGradient)' : isHover ? '#64748b' : '#334155';
                  const strokeWidth = e.taken ? 6 : isHover ? 6 : 4;
                  const dash = e.taken ? 0 : isHover ? 0 : 6;
                  const lineKey = `${e.type}-${e.r}-${e.c}`;
                  return (
                    <line
                      key={lineKey}
                      x1={e.x1}
                      y1={e.y1}
                      x2={e.x2}
                      y2={e.y2}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      strokeDasharray={dash}
                      filter={e.taken ? 'url(#glow)' : 'none'}
                      style={e.taken && animEdge ? { strokeDasharray: 300, strokeDashoffset: 0, transition: 'stroke-dashoffset 280ms ease-out' } : undefined}
                      onMouseEnter={() => !e.taken && setHover({ type: e.type, r: e.r, c: e.c })}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => !e.taken && onEdgeClick({ type: e.type, r: e.r, c: e.c })}
                      cursor={e.taken ? 'default' : 'pointer'}
                    />
                  );
                })}

                {/* Dots */}
                {dots.map((d, i) => (
                  <circle key={`dot-${i}`} cx={d.x} cy={d.y} r={6} fill="#e2e8f0" />
                ))}
              </svg>
            </div>
          </div>

          <div className="w-full md:w-80 bg-gray-900/60 rounded-xl p-4 border border-gray-800">
            <div className="mb-4">
              <div className="text-sm text-gray-400">Turn</div>
              <div className="text-lg font-semibold">
                {state.turn === PLAYER ? 'Your move' : 'Computer thinking…'}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-gray-800 p-3">
                <div className="text-xs text-gray-400">You</div>
                <div className="text-2xl font-bold text-emerald-400">{pScore}</div>
              </div>
              <div className="rounded-lg bg-gray-800 p-3">
                <div className="text-xs text-gray-400">Computer</div>
                <div className="text-2xl font-bold text-orange-400">{aiScore}</div>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-400">Boxes captured: {pScore + aiScore} / {totalBoxes}</div>

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

            <div className="mt-6 text-xs text-gray-500 leading-relaxed">
              Tip: Avoid creating a third side of a box until you can take a long chain.
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">Leaderboard (Local)</div>
                {/* Clearing server leaderboard is privileged; no client clear */}
              </div>
              <div className="flex gap-2 mb-3">
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
              <div className="max-h-72 overflow-y-auto rounded border border-gray-800">
                <table className="w-full text-xs">
                  <thead className="bg-gray-800/70 text-gray-300 sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1 font-medium">User</th>
                      <th className="text-left px-2 py-1 font-medium">Result</th>
                      <th className="text-left px-2 py-1 font-medium">Score</th>
                      <th className="text-left px-2 py-1 font-medium">Grid</th>
                      <th className="text-left px-2 py-1 font-medium">Diff</th>
                      <th className="text-left px-2 py-1 font-medium">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeaderboard.length === 0 ? (
                      <tr>
                        <td className="px-2 py-2 text-gray-500" colSpan={6}>No games yet.</td>
                      </tr>
                    ) : (
                      filteredLeaderboard.map(row => (
                        <tr key={row.id} className="odd:bg-gray-900/30">
                          <td className="px-2 py-1">{row.username || 'Guest'}</td>
                          <td className="px-2 py-1">
                            <span className={row.result === 'Win' ? 'text-emerald-400' : row.result === 'Loss' ? 'text-red-400' : 'text-gray-300'}>
                              {row.result}
                            </span>
                          </td>
                          <td className="px-2 py-1">{row.you} - {row.ai}</td>
                          <td className="px-2 py-1">{row.grid}</td>
                          <td className="px-2 py-1">{row.difficulty}</td>
                          <td className="px-2 py-1">{new Date(row.createdAt || row.date).toLocaleString()}</td>
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
    </div>
  );
}


