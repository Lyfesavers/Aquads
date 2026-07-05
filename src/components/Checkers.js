import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
const FRAME_PAD = 36;

function isDarkSquare(r, c) {
  return (r + c) % 2 === 1;
}

function sameSquare(a, b) {
  if (!a || !b || a.r == null || a.c == null || b.r == null || b.c == null) return false;
  return Number(a.r) === Number(b.r) && Number(a.c) === Number(b.c);
}

function normSquare(sq) {
  if (!sq || sq.r == null || sq.c == null) return null;
  return { r: Number(sq.r), c: Number(sq.c) };
}

function moveMatches(mv, from, to) {
  return sameSquare(mv.from, from) && sameSquare(mv.to, to);
}

function findClientMove(legalMoves, from, to, jumpFrom) {
  const f = normSquare(from);
  const t = normSquare(to);
  const jf = normSquare(jumpFrom);
  if (!f || !t || !legalMoves) return null;
  let mv = legalMoves.find((m) => moveMatches(m, f, t));
  if (!mv && jf) {
    mv = legalMoves.find((m) => sameSquare(m.from, jf) && sameSquare(m.to, t));
  }
  return mv;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function LeaderboardPanel({ leaderboard, filterDifficulty, setFilterDifficulty, onRefresh }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-amber-200">Leaderboard</h2>
        <button type="button" onClick={onRefresh} className="text-xs text-stone-400 hover:text-white">Refresh</button>
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
            {leaderboard.length === 0 ? (
              <tr><td colSpan={4} className="px-2 py-3 text-stone-500">No wins yet.</td></tr>
            ) : (
              leaderboard.map((row) => (
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
        Ranked by difficulty (Hard → Medium → Easy), then pieces captured, then fewest moves.
      </p>
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
  const [showMenu, setShowMenu] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [filterDifficulty, setFilterDifficulty] = useState('All');
  const [animating, setAnimating] = useState(false);
  const [boardSize, setBoardSize] = useState(360);
  const boardStageRef = useRef(null);
  const submitLock = useRef(false);

  const loggedIn = !!(currentUser && currentUser.token);
  const inGame = !!state;
  const cellSize = boardSize / BOARD_SIZE;
  const gameActive = !!(state && state.status === 'active');

  const activeFrom = useMemo(() => {
    if (!state) return null;
    return normSquare(state.jumpFrom) || normSquare(selected);
  }, [state, selected]);

  const legalTargets = useMemo(() => {
    if (!state || !activeFrom || state.turn !== 'red' || !gameActive) return [];
    return (state.legalMoves || [])
      .filter((mv) => sameSquare(mv.from, activeFrom))
      .map((mv) => normSquare(mv.to))
      .filter(Boolean);
  }, [state, activeFrom, gameActive]);

  const selectableSquares = useMemo(() => {
    const froms = new Set();
    if (!state || state.turn !== 'red' || !gameActive) return froms;
    for (const mv of state.legalMoves || []) {
      froms.add(`${mv.from.r},${mv.from.c}`);
    }
    return froms;
  }, [state, gameActive]);

  useEffect(() => {
    if (state && state.jumpFrom && state.turn === 'red' && gameActive) {
      setSelected(normSquare(state.jumpFrom));
    }
  }, [state?.jumpFrom?.r, state?.jumpFrom?.c, state?.turn, gameActive]);

  useLayoutEffect(() => {
    if (!inGame) return undefined;

    const el = boardStageRef.current;
    if (!el) return undefined;

    const update = () => {
      const r = el.getBoundingClientRect();
      const narrow = r.width < 640;
      const framePad = narrow ? 28 : FRAME_PAD;
      const pad = narrow ? 8 : 16;
      const maxInner = Math.min(r.width, r.height) - framePad - pad;
      setBoardSize(Math.max(240, Math.floor(maxInner)));
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [inGame]);

  useEffect(() => {
    if (!showMenu) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showMenu]);

  const loadLeaderboard = useCallback(async () => {
    try {
      const params = { limit: 25 };
      if (filterDifficulty && filterDifficulty !== 'All') {
        params.difficulty = filterDifficulty;
      }
      const rows = await getLeaderboard('checkers', params);
      setLeaderboard(Array.isArray(rows) ? rows : []);
    } catch (_) {}
  }, [filterDifficulty]);

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
      setShowMenu(false);
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

  const playAiDelay = async (aiMoves, finalState) => {
    if (!aiMoves || !aiMoves.length) {
      setState(finalState);
      setSelected(normSquare(finalState.jumpFrom));
      return;
    }
    setAnimating(true);
    await sleep(Math.min(1200, 260 + aiMoves.length * 220));
    setState(finalState);
    setSelected(normSquare(finalState.jumpFrom));
    setAnimating(false);
  };

  const applyServerState = (nextState) => {
    if (!nextState) return;
    setState(nextState);
    setSelected(normSquare(nextState.jumpFrom));
  };

  const submitMove = async (from, to) => {
    if (submitLock.current || !gameId || busy || animating || !state || state.turn !== 'red' || !gameActive) {
      return;
    }

    const fromSq = normSquare(from);
    const toSq = normSquare(to);
    const effectiveFrom = normSquare(state.jumpFrom) || fromSq;
    if (!effectiveFrom || !toSq) return;

    const matched = findClientMove(state.legalMoves, effectiveFrom, toSq, state.jumpFrom);
    if (!matched) {
      setError('That square is not a legal move right now.');
      return;
    }

    submitLock.current = true;
    setBusy(true);
    setError('');

    try {
      const r = await checkersMove(gameId, matched.from, matched.to);

      if (r.stateAfterPlayer && r.aiMoves && r.aiMoves.length) {
        setState({
          ...r.state,
          board: r.stateAfterPlayer.board,
          turn: 'black',
          jumpFrom: r.stateAfterPlayer.jumpFrom,
          captured: r.stateAfterPlayer.captured,
          moveCount: r.stateAfterPlayer.moveCount,
          legalMoves: [],
        });
        await playAiDelay(r.aiMoves, r.state);
      } else {
        applyServerState(r.state);
      }
    } catch (e) {
      if (e.data && e.data.state) {
        applyServerState(e.data.state);
      }
      setError(e.message || 'Move rejected — board synced from server.');
    } finally {
      setBusy(false);
      submitLock.current = false;
    }
  };

  const onSquareClick = (r, c) => {
    if (busy || animating || !state || !gameActive || state.turn !== 'red') return;

    const click = { r, c };
    const piece = state.board[r] && state.board[r][c];
    const key = `${r},${c}`;
    const fromSq = activeFrom;

    if (fromSq && legalTargets.some((t) => sameSquare(t, click))) {
      submitMove(fromSq, click);
      return;
    }

    if (piece && piece.owner === 'red') {
      if (state.jumpFrom && !sameSquare(state.jumpFrom, click)) return;
      if (!state.jumpFrom && !selectableSquares.has(key)) return;
      setSelected({ r, c });
      return;
    }

    if (!state.jumpFrom) setSelected(null);
  };

  const statusMessage = useMemo(() => {
    if (!state) return '';
    if (state.status === 'won') return 'You win!';
    if (state.status === 'lost') return 'CPU wins';
    if (animating || (busy && state.turn === 'black')) return 'CPU is thinking…';
    if (state.turn === 'red') {
      if (state.jumpFrom) return 'Continue your jump';
      return 'Your turn';
    }
    return 'Waiting…';
  }, [state, busy, animating]);

  const capturedRed = state?.captured?.red ?? 0;
  const gameEnded = state && (state.status === 'won' || state.status === 'lost');

  const renderBoard = () => (
    <div
      className="checkers-board-frame touch-manipulation select-none shrink-0"
      style={{ width: boardSize + FRAME_PAD, height: boardSize + FRAME_PAD }}
    >
      <div
        className="checkers-board-inner mx-auto"
        style={{ width: boardSize, height: boardSize }}
      >
        <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
          {Array.from({ length: BOARD_SIZE }).map((_, r) =>
            Array.from({ length: BOARD_SIZE }).map((__, c) => {
              const dark = isDarkSquare(r, c);
              const piece = state.board[r] && state.board[r][c];
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
  );

  return (
    <div
      className={`checkers-page text-white overflow-x-hidden relative ${
        inGame ? 'fixed inset-0 h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden' : 'min-h-screen'
      }`}
    >
      <Helmet>
        <title>Checkers | Aquads</title>
        <meta name="description" content="Play checkers against the CPU on Aquads. Server-validated moves and leaderboard." />
      </Helmet>

      <nav
        className={`checkers-nav relative z-20 flex items-center gap-2 border-b border-amber-900/30 bg-stone-950/80 backdrop-blur-md shrink-0 ${
          inGame ? 'min-h-[44px] px-2 py-1.5 sm:px-3' : 'px-3 py-2 sm:py-3'
        }`}
      >
        <Link
          to="/games"
          className={`relative z-30 text-stone-400 hover:text-white border border-stone-700/60 bg-stone-800/60 rounded-lg shrink-0 ${
            inGame ? 'px-2 py-1 text-[10px] sm:text-xs' : 'px-3 py-1.5 text-xs'
          }`}
        >
          ← Hub
        </Link>
        <h1
          className={`font-extrabold tracking-tight bg-gradient-to-r from-amber-200 via-yellow-500 to-orange-600 text-transparent bg-clip-text ${
            inGame
              ? 'pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs sm:text-sm z-10'
              : 'flex-1 text-center text-lg sm:text-xl'
          }`}
        >
          Checkers
        </h1>
        {inGame ? (
          <div className="relative z-30 ml-auto flex items-center gap-1.5 sm:gap-2">
            <span
              className={`hidden sm:inline-flex checkers-turn-indicator text-[10px] ${
                state.turn === 'red' && gameActive ? 'checkers-turn-indicator--active' : ''
              }`}
            >
              <span className={`checkers-turn-dot checkers-turn-dot--${state.turn === 'red' ? 'red' : 'black'}`} />
              <span className="text-stone-300 max-w-[8rem] truncate">{statusMessage}</span>
            </span>
            <button
              type="button"
              onClick={() => setShowMenu(true)}
              className="text-xs sm:text-sm bg-stone-800/90 hover:bg-stone-700 border border-amber-900/40 rounded-lg px-2.5 py-1.5 font-medium"
              aria-label="Open game menu"
            >
              Menu
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowInstructions(true)}
            className="relative z-30 text-xs bg-stone-800/80 hover:bg-stone-700 border border-amber-900/40 rounded-lg px-3 py-1.5 shrink-0"
          >
            How to play
          </button>
        )}
      </nav>

      <div className={`relative z-10 w-full ${inGame ? 'flex-1 min-h-0 flex flex-col' : 'container mx-auto px-3 sm:px-4 py-5 sm:py-8 max-w-4xl'}`}>
        {error && (
          <div className={`rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-200 shrink-0 ${inGame ? 'mx-2 mt-1' : 'mb-4'}`}>
            {error}
          </div>
        )}

        {!inGame && (
          <>
            <p className="text-stone-400 text-sm text-center mb-6">
              Classic draughts on a tournament board — vs CPU.
            </p>

            {!loggedIn && (
              <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-100">
                Sign in to play and appear on the leaderboard. Wins are recorded automatically by the server.
              </div>
            )}

            <div className="rounded-xl border border-amber-900/30 bg-stone-900/70 p-5 shadow-xl mb-6">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <label className="text-xs text-stone-400">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  disabled={busy || loading}
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
                  className="ml-auto bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-lg"
                >
                  Start game
                </button>
              </div>
              {loading && loggedIn && (
                <p className="text-stone-500 text-sm text-center py-4">Loading your game…</p>
              )}
            </div>

            <div className="rounded-xl border border-amber-900/30 bg-stone-900/70 p-4 shadow-xl">
              <LeaderboardPanel
                leaderboard={leaderboard}
                filterDifficulty={filterDifficulty}
                setFilterDifficulty={setFilterDifficulty}
                onRefresh={loadLeaderboard}
              />
            </div>
          </>
        )}

        {inGame && loading && (
          <div className="flex-1 flex items-center justify-center text-stone-400">Loading…</div>
        )}

        {inGame && !loading && (
          <div className="relative flex-1 min-h-0 flex flex-col">
            <div
              ref={boardStageRef}
              className="flex-1 min-h-0 min-w-0 flex items-center justify-center p-2 sm:p-3 overflow-hidden"
            >
              {renderBoard()}
            </div>

            <div className="checkers-mobile-status sm:hidden shrink-0 flex justify-center px-2 pt-1">
              <div
                className={`checkers-turn-indicator ${
                  state.turn === 'red' && gameActive ? 'checkers-turn-indicator--active' : ''
                }`}
              >
                <span className={`checkers-turn-dot checkers-turn-dot--${state.turn === 'red' ? 'red' : 'black'}`} />
                <span className="text-stone-300 text-xs">{statusMessage}</span>
              </div>
            </div>

            {gameEnded && (
              <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]">
                <div className="checkers-end-overlay rounded-2xl border border-amber-900/40 bg-stone-900/95 px-6 py-5 text-center shadow-2xl max-w-sm w-full">
                  <p className={`text-2xl font-bold ${state.status === 'won' ? 'text-emerald-400' : 'text-red-300'}`}>
                    {state.status === 'won' ? 'Victory!' : 'Defeat'}
                  </p>
                  <p className="text-sm text-stone-400 mt-2">{statusMessage}</p>
                  {state.status === 'won' && loggedIn && (
                    <p className="text-xs text-stone-500 mt-2">
                      Captured {capturedRed} pieces in {state.moveCount} moves — recorded on the leaderboard.
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2 mt-5">
                    <button
                      type="button"
                      onClick={() => startNewGame(difficulty)}
                      disabled={busy}
                      className="flex-1 bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 rounded-lg px-4 py-2.5 text-sm font-semibold"
                    >
                      Play again
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMenu(true)}
                      className="flex-1 bg-stone-800 hover:bg-stone-700 border border-stone-600 rounded-lg px-4 py-2.5 text-sm"
                    >
                      Menu
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showMenu && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setShowMenu(false)}
          />
          <div className="relative z-10 w-full max-w-sm h-full bg-stone-900 border-l border-amber-900/30 shadow-2xl flex flex-col overflow-hidden animate-[checkers-slide-in_0.2s_ease-out]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 shrink-0">
              <h2 className="font-bold text-amber-200">Game menu</h2>
              <button
                type="button"
                onClick={() => setShowMenu(false)}
                className="text-stone-400 hover:text-white text-2xl leading-none px-1"
                aria-label="Close menu"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div>
                <label className="text-xs text-stone-400 block mb-1.5">Difficulty</label>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    disabled={busy || (gameActive && !!gameId)}
                    className="flex-1 min-w-0 bg-stone-800 border border-stone-600 rounded-lg px-2 py-2 text-sm"
                  >
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => startNewGame(difficulty)}
                    disabled={!loggedIn || busy}
                    className="shrink-0 bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-semibold"
                  >
                    New game
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setShowMenu(false); setShowInstructions(true); }}
                className="w-full text-left text-sm bg-stone-800/80 hover:bg-stone-700 border border-stone-700 rounded-lg px-3 py-2.5"
              >
                How to play
              </button>

              <div className="rounded-xl border border-stone-800 bg-stone-950/50 p-3">
                <LeaderboardPanel
                  leaderboard={leaderboard}
                  filterDifficulty={filterDifficulty}
                  setFilterDifficulty={setFilterDifficulty}
                  onRefresh={loadLeaderboard}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {showInstructions && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-stone-900 rounded-2xl border border-amber-900/40 max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-amber-300">How to play</h2>
              <button type="button" onClick={() => setShowInstructions(false)} className="text-stone-400 hover:text-white text-2xl leading-none">×</button>
            </div>
            <ul className="space-y-2 text-sm text-stone-300 list-disc pl-5">
              <li>You play red (bottom); the CPU plays black.</li>
              <li>Move diagonally on dark squares. Jump over opponent pieces to capture.</li>
              <li>Captures are mandatory when available.</li>
              <li>Multi-jumps must be completed with the same piece in one turn.</li>
              <li>Reach the opposite end to become a king (shown with a gold crown).</li>
              <li>Kings move and capture diagonally in any direction, any distance along open squares.</li>
              <li>Regular pieces move forward only; captures are mandatory when available.</li>
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
