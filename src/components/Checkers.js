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

const BOARD_SIZE = 8;
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

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

function Piece({ owner, king, size }) {
  const isRed = owner === 'red';
  return (
    <div
      className={`rounded-full shadow-lg border-2 flex items-center justify-center transition-transform duration-150 ${
        isRed
          ? 'bg-gradient-to-br from-rose-400 to-red-700 border-red-900/60'
          : 'bg-gradient-to-br from-slate-500 to-slate-900 border-slate-950/70'
      }`}
      style={{ width: size * 0.72, height: size * 0.72 }}
    >
      {king && (
        <span className="text-[0.55em] leading-none select-none" aria-hidden="true">
          ♛
        </span>
      )}
    </div>
  );
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
  const boardRef = useRef(null);

  const loggedIn = !!(currentUser && currentUser.token);

  const boardSize = useMemo(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 800;
    if (vw < 640) return Math.min(vw - 32, 360);
    if (vw < 1024) return Math.min(vw * 0.55, 480);
    return Math.min(520, vw * 0.38);
  }, []);

  const cellSize = boardSize / BOARD_SIZE;

  const legalTargets = useMemo(() => {
    if (!state || !selected || state.turn !== 'red' || state.status !== 'active') return [];
    return (state.legalMoves || [])
      .filter((mv) => sameSquare(mv.from, selected))
      .map((mv) => mv.to);
  }, [state, selected]);

  const selectableSquares = useMemo(() => {
    if (!state || state.turn !== 'red' || state.status !== 'active') return [];
    const froms = new Set();
    for (const mv of state.legalMoves || []) {
      froms.add(`${mv.from.r},${mv.from.c}`);
    }
    return froms;
  }, [state]);

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
    socket.on('leaderboardUpdated', onUpdate);
    return () => socket.off('leaderboardUpdated', onUpdate);
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
      await sleep(380);
      const piece = board[mv.from.r][mv.from.c];
      board[mv.from.r][mv.from.c] = null;
      board[mv.to.r][mv.to.c] = piece ? { ...piece } : null;
      for (const cap of mv.captures || []) {
        board[cap.r][cap.c] = null;
      }
      if (piece && !piece.king) {
        if (piece.owner === 'black' && mv.to.r === BOARD_SIZE - 1) {
          board[mv.to.r][mv.to.c] = { ...board[mv.to.r][mv.to.c], king: true };
        }
      }
      setState((prev) => (prev ? { ...prev, board: board.map((row) => row.map((cell) => (cell ? { ...cell } : null))) } : prev));
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
    if (!gameId || busy || animating || !state || state.turn !== 'red' || state.status !== 'active') return;
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
    if (busy || animating || !state || state.status !== 'active' || state.turn !== 'red') return;

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
      return 'Your turn — select a piece';
    }
    return 'Waiting…';
  }, [state, busy, animating]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 via-neutral-950 to-stone-900 text-white">
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
                  <span className="bg-gradient-to-r from-amber-300 to-orange-500 text-transparent bg-clip-text">Checkers</span>
                </h1>
                <p className="text-stone-400 text-sm mt-1">Classic 8×8 draughts vs CPU — moves validated on the server.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructions(true)}
                className="self-start text-sm bg-stone-800 hover:bg-stone-700 border border-stone-600 rounded-lg px-3 py-2"
              >
                How to play
              </button>
            </div>

            {!loggedIn && (
              <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-100">
                Sign in to play and appear on the leaderboard. Wins are recorded automatically by the server — no client score submission.
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
                disabled={busy || !!gameId && state && state.status === 'active'}
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
                className="ml-auto sm:ml-0 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-semibold shadow-lg"
              >
                {gameId ? 'New game' : 'Start game'}
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64 text-stone-400">Loading…</div>
            ) : state ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-sm">
                  <div className="flex gap-4">
                    <span className="text-rose-300">You: {state.pieceCounts?.red ?? 0} pieces</span>
                    <span className="text-stone-400">CPU: {state.pieceCounts?.black ?? 0} pieces</span>
                  </div>
                  <span className="text-stone-300">{statusMessage}</span>
                </div>

                <div className="flex justify-center">
                  <div
                    ref={boardRef}
                    className="rounded-xl overflow-hidden shadow-2xl border-4 border-amber-900/80 touch-manipulation select-none"
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

                          return (
                            <button
                              key={`${r}-${c}`}
                              type="button"
                              aria-label={piece ? `${piece.owner} piece` : dark ? 'empty square' : 'light square'}
                              disabled={!dark || busy || animating}
                              onClick={() => dark && onSquareClick(r, c)}
                              className={`relative flex items-center justify-center p-0 border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                                dark ? 'cursor-pointer' : 'cursor-default'
                              } ${dark ? (r + c) % 4 === 1 ? 'bg-amber-900/90' : 'bg-amber-950' : 'bg-stone-300/15'} ${
                                isSelected ? 'ring-2 ring-inset ring-yellow-300' : ''
                              } ${isTarget ? 'bg-emerald-900/70' : ''} ${canSelect && !isSelected ? 'hover:brightness-110' : ''}`}
                              style={{ width: cellSize, height: cellSize }}
                            >
                              {piece && <Piece owner={piece.owner} king={piece.king} size={cellSize} />}
                              {isTarget && (
                                <span className="absolute w-2 h-2 rounded-full bg-emerald-400/80 pointer-events-none" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {(state.status === 'won' || state.status === 'lost') && (
                  <div className="mt-4 text-center">
                    <p className={`text-lg font-semibold ${state.status === 'won' ? 'text-emerald-400' : 'text-red-300'}`}>
                      {state.status === 'won' ? 'Victory!' : 'Defeat'}
                    </p>
                    {state.status === 'won' && loggedIn && (
                      <p className="text-sm text-stone-400 mt-1">
                        Captured {state.captured?.red ?? 0} pieces in {state.moveCount} moves — recorded on the leaderboard.
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
            <div className="rounded-xl border border-stone-700 bg-stone-900/60 p-4">
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
              <p className="text-[10px] text-stone-500 mt-2 leading-relaxed">
                Ranked by pieces captured, then fewest total moves. Wins are server-validated only.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {showInstructions && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-stone-900 rounded-2xl border border-stone-700 max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6">
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
            <p className="mt-4 text-xs text-stone-500">
              Anti-cheat: every move is validated on Aquads servers. You cannot submit fake wins to the leaderboard.
            </p>
            <button
              type="button"
              onClick={() => setShowInstructions(false)}
              className="mt-6 w-full bg-amber-600 hover:bg-amber-500 rounded-lg py-2 font-semibold"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
