import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import {
  socket,
  getLeaderboard,
  checkersNewGame,
  checkersGetActive,
  checkersMove,
  checkersAbandon,
} from '../services/api';
import './Checkers.css';

const BOARD_SIZE = 8;
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function isDarkSquare(r, c) {
  return (r + c) % 2 === 1;
}

function sameSquare(a, b) {
  return a && b && a.r === b.r && a.c === b.c;
}

function moveMatches(mv, from, to) {
  return sameSquare(mv.from, from) && sameSquare(mv.to, to);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeBoardSize() {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 800;
  if (vw < 640) return Math.min(vw - 32, 360);
  if (vw < 1024) return Math.min(vw * 0.58, 480);
  return Math.min(520, vw * 0.4);
}

function Piece({ owner, king, selected, animating }) {
  const isRed = owner === 'red';
  return (
    <div
      className={`checkers-piece-wrap ${selected ? 'checkers-piece-wrap--selected' : ''} ${animating ? 'checkers-piece-wrap--animating' : ''}`}
    >
      <div className="checkers-piece-shadow" aria-hidden="true" />
      <div
        className={`checkers-piece ${isRed ? 'checkers-piece--red' : 'checkers-piece--black'} ${king ? 'checkers-piece--king' : ''}`}
      >
        {king && <span className="checkers-piece-crown" aria-hidden="true">♛</span>}
      </div>
    </div>
  );
}

function CapturedTray({ captured, total, color }) {
  const dots = [];
  for (let i = 0; i < total; i += 1) {
    dots.push(
      <span
        key={i}
        className={`checkers-captured-dot checkers-captured-dot--${color} ${i < captured ? '' : 'checkers-captured-dot--ghost'}`}
        aria-hidden="true"
      />
    );
  }
  return <div className="checkers-captured-tray">{dots}</div>;
}

export default function Checkers({ currentUser }) {
  const [gameId, setGameId] = useState(null);
  const [state, setState] = useState(null);
  const [difficulty, setDifficulty] = useState('Medium');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [filterDifficulty, setFilterDifficulty] = useState('All');
  const [animating, setAnimating] = useState(false);
  const [boardSize, setBoardSize] = useState(computeBoardSize);
  const boardRef = useRef(null);

  const loggedIn = !!(currentUser && currentUser.token);
  const cellSize = boardSize / BOARD_SIZE;
  const gameActive = !!(state && state.status === 'active');

  const legalTargets = useMemo(() => {
    if (!state || !selected || state.turn !== 'red' || !gameActive) return [];
    return (state.legalMoves || [])
      .filter((mv) => sameSquare(mv.from, selected))
      .map((mv) => mv.to);
  }, [state, selected, gameActive]);

  const selectableSquares = useMemo(() => {
    const froms = new Set();
    if (!state || state.turn !== 'red' || !gameActive) return froms;
    for (const mv of state.legalMoves || []) {
      froms.add(`${mv.from.r},${mv.from.c}`);
    }
    return froms;
  }, [state, gameActive]);

  useEffect(() => {
    const onResize = () => setBoardSize(computeBoardSize());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const loadLeaderboard = useCallback(async () => {
    try {
      const rows = await getLeaderboard('checkers', { limit: 25 });
      setLeaderboard(Array.isArray(rows) ? rows : []);
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadLeaderboard();
    const onUpdate = (data) => {
      if (data && data.game === 'checkers') loadLeaderboard();
    };
    if (socket && typeof socket.on === 'function') {
      socket.on('leaderboardUpdated', onUpdate);
      return () => {
        if (socket && typeof socket.off === 'function') socket.off('leaderboardUpdated', onUpdate);
      };
    }
    return undefined;
  }, [loadLeaderboard]);

  useEffect(() => {
    if (!loggedIn) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const active = await checkersGetActive();
        if (active && active.gameId) {
          setGameId(active.gameId);
          setState(active.state);
          if (active.state && active.state.difficulty) setDifficulty(active.state.difficulty);
        }
      } catch (e) {
        setError(e.message || 'Failed to load game');
      } finally {
        setLoading(false);
      }
    })();
  }, [loggedIn]);

  const startNewGame = async (diff = difficulty) => {
    if (!loggedIn) return;
    try {
      setBusy(true);
      setError('');
      setSelected(null);
      if (gameId) {
        try { await checkersAbandon(gameId); } catch (_) {}
      }
      const r = await checkersNewGame({ difficulty: diff });
      setGameId(r.gameId);
      setState(r.state);
    } catch (e) {
      setError(e.message || 'Could not start game');
    } finally {
      setBusy(false);
    }
  };

  const playAiMoves = async (aiMoves, baseBoard, finalState) => {
    if (!aiMoves || !aiMoves.length) return;
    setAnimating(true);
    let board = baseBoard.map((row) => row.map((cell) => (cell ? { ...cell } : null)));

    for (const mv of aiMoves) {
      await sleep(320);
      const piece = board[mv.from.r][mv.from.c];
      board[mv.from.r][mv.from.c] = null;
      board[mv.to.r][mv.to.c] = piece ? { ...piece } : null;
      for (const cap of mv.captures || []) {
        board[cap.r][cap.c] = null;
      }
      if (piece && !piece.king && piece.owner === 'black' && mv.to.r === BOARD_SIZE - 1) {
        board[mv.to.r][mv.to.c] = { ...board[mv.to.r][mv.to.c], king: true };
      }
      setState((prev) => (prev ? {
        ...prev,
        board: board.map((row) => row.map((cell) => (cell ? { ...cell } : null))),
      } : prev));
    }

    setState(finalState);
    setAnimating(false);
  };

  const mergePlayerState = (prev, afterPlayer, fullState) => {
    if (!afterPlayer) return fullState;
    return {
      ...fullState,
      board: afterPlayer.board,
      turn: afterPlayer.turn,
      jumpFrom: afterPlayer.jumpFrom,
      captured: afterPlayer.captured,
      moveCount: afterPlayer.moveCount,
      legalMoves: fullState.legalMoves,
    };
  };

  const submitMove = async (from, to) => {
    if (!gameId || busy || animating || !state || state.turn !== 'red' || !gameActive) return;
    const legal = (state.legalMoves || []).some((mv) => moveMatches(mv, from, to));
    if (!legal) return;

    try {
      setBusy(true);
      setError('');
      const r = await checkersMove(gameId, from, to);
      const interim = mergePlayerState(state, r.stateAfterPlayer, r.state);
      setState(interim);
      setSelected(r.state.jumpFrom || null);

      if (r.aiMoves && r.aiMoves.length && r.stateAfterPlayer) {
        await playAiMoves(r.aiMoves, r.stateAfterPlayer.board, r.state);
      } else {
        setState(r.state);
      }
    } catch (e) {
      if (e.data && e.data.state) {
        setState(e.data.state);
        setSelected(e.data.state.jumpFrom || null);
      }
      setError(e.message || 'Move rejected');
    } finally {
      setBusy(false);
    }
  };

  const onSquareClick = (r, c) => {
    if (busy || animating || !state || !gameActive || state.turn !== 'red') return;

    const piece = state.board[r][c];
    const key = `${r},${c}`;

    if (selected && legalTargets.some((t) => sameSquare(t, { r, c }))) {
      submitMove(selected, { r, c });
      if (!state.jumpFrom) setSelected(null);
      return;
    }

    if (piece && piece.owner === 'red') {
      if (state.jumpFrom && !sameSquare(state.jumpFrom, { r, c })) return;
      if (!state.jumpFrom && !selectableSquares.has(key)) return;
      setSelected({ r, c });
      return;
    }

    if (!state.jumpFrom) setSelected(null);
  };

  const filteredLeaderboard = useMemo(() => {
    return leaderboard.filter((row) => filterDifficulty === 'All' || row.difficulty === filterDifficulty);
  }, [leaderboard, filterDifficulty]);

  const statusMessage = useMemo(() => {
    if (!state) return '';
    if (state.status === 'won') return 'You win! Great game.';
    if (state.status === 'lost') return 'CPU wins. Try again!';
    if (animating || (busy && state.turn === 'black')) return 'CPU is thinking…';
    if (state.turn === 'red') {
      if (state.jumpFrom) return 'Continue your jump';
      return 'Your turn';
    }
    return 'Waiting…';
  }, [state, busy, animating]);

  const capturedRed = state?.captured?.red ?? 0;
  const capturedBlack = state?.captured?.black ?? 0;

  return (
    <div className="checkers-page min-h-screen text-white">
      <Helmet>
        <title>Checkers | Aquads</title>
        <meta name="description" content="Play checkers against the CPU on Aquads. Server-validated moves and leaderboard." />
      </Helmet>

      <div className="container mx-auto px-3 sm:px-4 py-5 sm:py-8 max-w-6xl">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div>
                <Link to="/" className="text-xs text-stone-400 hover:text-white mb-1 inline-block">← Aquads</Link>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  <span className="bg-gradient-to-r from-amber-200 via-yellow-500 to-orange-600 text-transparent bg-clip-text">Checkers</span>
                </h1>
                <p className="text-stone-400 text-sm mt-1">Classic draughts on a tournament board — vs CPU.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructions(true)}
                className="self-start text-sm bg-stone-800/80 hover:bg-stone-700 border border-amber-900/40 rounded-lg px-3 py-2"
              >
                How to play
              </button>
            </div>

            {!loggedIn && (
              <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-100">
                Sign in to play and appear on the leaderboard. Wins are recorded automatically by the server.
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <label className="text-xs text-stone-400">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                disabled={busy || (gameActive && !!gameId)}
                className="bg-stone-800 border border-stone-600 rounded-lg px-2 py-1.5 text-sm"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => startNewGame(difficulty)}
                disabled={!loggedIn || busy || loading}
                className="ml-auto sm:ml-0 bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-semibold shadow-lg"
              >
                {gameId ? 'New game' : 'Start game'}
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64 text-stone-400">Loading…</div>
            ) : state ? (
              <>
                <div className="checkers-status-bar flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3 py-2.5 mb-4 text-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-500 uppercase tracking-wide w-14">You</span>
                      <CapturedTray captured={capturedRed} total={12} color="black" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-500 uppercase tracking-wide w-14">CPU</span>
                      <CapturedTray captured={capturedBlack} total={12} color="red" />
                    </div>
                  </div>
                  <div className={`checkers-turn-indicator ${state.turn === 'red' && gameActive ? 'checkers-turn-indicator--active' : ''}`}>
                    <span className={`checkers-turn-dot checkers-turn-dot--${state.turn === 'red' ? 'red' : 'black'}`} />
                    <span className="text-stone-300">{statusMessage}</span>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div
                    ref={boardRef}
                    className="checkers-board-frame touch-manipulation select-none"
                    style={{ width: boardSize + 36, maxWidth: '100%' }}
                  >
                    <div
                      className="checkers-board-inner mx-auto"
                      style={{ width: boardSize, height: boardSize }}
                    >
                      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
                        {Array.from({ length: BOARD_SIZE }).map((_, r) =>
                          Array.from({ length: BOARD_SIZE }).map((__, c) => {
                            const dark = isDarkSquare(r, c);
                            const piece = state.board[r][c];
                            const isSelected = sameSquare(selected, { r, c });
                            const isTarget = legalTargets.some((t) => sameSquare(t, { r, c }));
                            const canSelect = selectableSquares.has(`${r},${c}`);
                            const displayRow = BOARD_SIZE - r;

                            return (
                              <button
                                key={`${r}-${c}`}
                                type="button"
                                aria-label={piece ? `${piece.owner} ${piece.king ? 'king' : 'piece'}` : dark ? `square ${FILES[c]}${displayRow}` : 'light square'}
                                disabled={!dark || busy || animating}
                                onClick={() => dark && onSquareClick(r, c)}
                                className={[
                                  'checkers-square',
                                  dark ? 'checkers-square--dark' : 'checkers-square--light',
                                  isSelected ? 'checkers-square--selected' : '',
                                  isTarget ? 'checkers-square--target' : '',
                                  canSelect && !isSelected ? 'checkers-square--can-select' : '',
                                ].filter(Boolean).join(' ')}
                                style={{ width: cellSize, height: cellSize }}
                              >
                                {c === 0 && dark && (
                                  <span className="checkers-board-coord checkers-board-coord--rank">{displayRow}</span>
                                )}
                                {r === BOARD_SIZE - 1 && (
                                  <span className="checkers-board-coord checkers-board-coord--file">{FILES[c]}</span>
                                )}
                                {piece && (
                                  <Piece
                                    owner={piece.owner}
                                    king={piece.king}
                                    selected={isSelected}
                                    animating={animating && piece.owner === 'black'}
                                  />
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {(state.status === 'won' || state.status === 'lost') && (
                  <div className="mt-5 text-center">
                    <p className={`text-xl font-bold ${state.status === 'won' ? 'text-emerald-400' : 'text-red-300'}`}>
                      {state.status === 'won' ? 'Victory!' : 'Defeat'}
                    </p>
                    {state.status === 'won' && loggedIn && (
                      <p className="text-sm text-stone-400 mt-1">
                        Captured {capturedRed} pieces in {state.moveCount} moves — recorded on the leaderboard.
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : loggedIn ? (
              <div className="text-center py-16 text-stone-400">
                <p className="mb-4">No active game. Start a new match against the CPU.</p>
              </div>
            ) : null}
          </div>

          <aside className="w-full lg:w-80 shrink-0">
            <div className="rounded-xl border border-amber-900/30 bg-stone-900/70 p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-amber-200">Leaderboard</h2>
                <button type="button" onClick={loadLeaderboard} className="text-xs text-stone-400 hover:text-white">Refresh</button>
              </div>
              <select
                className="w-full bg-stone-800 border border-stone-600 rounded px-2 py-1 text-xs mb-3"
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
              >
                <option>All</option>
                {DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
              </select>
              <div className="max-h-72 overflow-y-auto rounded border border-stone-800">
                <table className="w-full text-xs">
                  <thead className="bg-stone-800/80 text-stone-300 sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1">Player</th>
                      <th className="text-left px-2 py-1">Cap.</th>
                      <th className="text-left px-2 py-1 hidden sm:table-cell">Moves</th>
                      <th className="text-left px-2 py-1 hidden sm:table-cell">Diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeaderboard.length === 0 ? (
                      <tr><td colSpan={4} className="px-2 py-3 text-stone-500">No wins yet.</td></tr>
                    ) : (
                      filteredLeaderboard.map((row) => (
                        <tr key={row._id} className="odd:bg-stone-900/40">
                          <td className="px-2 py-1 truncate max-w-[6rem]">{row.username || 'Guest'}</td>
                          <td className="px-2 py-1 text-emerald-400 font-medium">{row.you}</td>
                          <td className="px-2 py-1 hidden sm:table-cell">{row.moves ?? '—'}</td>
                          <td className="px-2 py-1 hidden sm:table-cell">{row.difficulty}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {showInstructions && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-stone-900 rounded-2xl border border-amber-900/40 max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-amber-300">How to play</h2>
              <button type="button" onClick={() => setShowInstructions(false)} className="text-stone-400 hover:text-white text-2xl leading-none">×</button>
            </div>
            <ul className="space-y-2 text-sm text-stone-300 list-disc pl-5">
              <li>You play red (bottom); the CPU plays black.</li>
              <li>Move diagonally on dark squares. Capture by jumping over an opponent piece.</li>
              <li>Captures are mandatory when available.</li>
              <li>Multi-jumps must be completed with the same piece in one turn.</li>
              <li>Reach the far row to become a king (moves both directions).</li>
              <li>Win by capturing all CPU pieces or blocking all CPU moves.</li>
            </ul>
            <button
              type="button"
              onClick={() => setShowInstructions(false)}
              className="mt-6 w-full bg-amber-700 hover:bg-amber-600 rounded-lg py-2 font-semibold"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
