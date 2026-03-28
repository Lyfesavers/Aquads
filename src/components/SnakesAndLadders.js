import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { socket, reconnectSocket } from '../services/api';

const BOARD_CELLS = 100;
const PAD = 12;

const LADDERS = [
  [1, 38], [4, 14], [9, 31], [21, 42], [28, 84], [36, 44], [51, 67], [71, 91], [80, 100],
];
const SNAKES = [
  [98, 28], [95, 24], [92, 51], [89, 53], [74, 17], [64, 60], [62, 19],
  [56, 45], [49, 11], [47, 26], [16, 6],
];

const PAWN_OFFSET = [
  [-7, -7],
  [7, -7],
  [-7, 7],
  [7, 7],
];

function cellCenter(cell, inner) {
  const cs = inner / 10;
  if (cell <= 0) {
    return { x: PAD + cs * 0.5, y: PAD + inner + cs * 0.45 };
  }
  const n = cell - 1;
  const rowFromBottom = Math.floor(n / 10);
  const rowFromTop = 9 - rowFromBottom;
  const colInRow = n % 10;
  const col = rowFromBottom % 2 === 0 ? colInRow : 9 - colInRow;
  return {
    x: PAD + col * cs + cs / 2,
    y: PAD + rowFromTop * cs + cs / 2,
  };
}

function playBlip(freq = 520, dur = 0.06) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = freq;
    o.type = 'square';
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + dur);
    setTimeout(() => ctx.close(), dur * 1000 + 80);
  } catch {
    /* ignore */
  }
}

export default function SnakesAndLadders({ currentUser }) {
  const [gameState, setGameState] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [banner, setBanner] = useState('');
  const [diceSpin, setDiceSpin] = useState(false);
  const [diceFace, setDiceFace] = useState(1);
  const [animOverride, setAnimOverride] = useState(null);
  const [rollPending, setRollPending] = useState(false);
  const [animating, setAnimating] = useState(false);
  const animTimerRef = useRef(null);
  const diceTimerRef = useRef(null);

  const myUserId = currentUser?.userId || currentUser?.id;
  const boardInner = useMemo(() => 360, []);

  const stopIntervals = useCallback(() => {
    if (animTimerRef.current) {
      clearInterval(animTimerRef.current);
      animTimerRef.current = null;
    }
    if (diceTimerRef.current) {
      clearInterval(diceTimerRef.current);
      diceTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (currentUser?.token) reconnectSocket();
  }, [currentUser?.token]);

  useEffect(() => {
    const onJoined = ({ state }) => {
      setGameState(state);
      setError('');
    };
    const onState = (state) => {
      setGameState(state);
    };
    const onTurn = (payload) => {
      if (diceTimerRef.current) {
        clearInterval(diceTimerRef.current);
        diceTimerRef.current = null;
      }
      setDiceSpin(false);
      setRollPending(false);
      if (animTimerRef.current) {
        clearInterval(animTimerRef.current);
        animTimerRef.current = null;
      }
      setDiceFace(payload.roll);
      playBlip(380 + payload.roll * 40, 0.05);

      const path = payload.path || [0];
      if (path.length <= 1 || !payload.moved) {
        setGameState(payload.state);
        setAnimOverride(null);
        setAnimating(false);
        if (payload.gameOver) playBlip(660, 0.12);
        return;
      }

      let step = 0;
      setAnimating(true);
      setAnimOverride({ playerIndex: payload.playerIndex, cell: path[0] });
      animTimerRef.current = setInterval(() => {
        step += 1;
        if (step >= path.length) {
          clearInterval(animTimerRef.current);
          animTimerRef.current = null;
          setAnimOverride(null);
          setAnimating(false);
          setGameState(payload.state);
          if (payload.slides?.length) {
            const last = payload.slides[payload.slides.length - 1];
            playBlip(last.type === 'ladder' ? 720 : 180, 0.1);
          }
          if (payload.gameOver) playBlip(880, 0.15);
          return;
        }
        setAnimOverride({ playerIndex: payload.playerIndex, cell: path[step] });
        playBlip(420, 0.03);
      }, 115);
    };
    const onErr = ({ message }) => {
      if (diceTimerRef.current) {
        clearInterval(diceTimerRef.current);
        diceTimerRef.current = null;
      }
      setDiceSpin(false);
      setRollPending(false);
      setError(message || 'Something went wrong.');
    };
    const onLeft = () => {
      setGameState(null);
      setBanner('You left the room.');
    };

    socket.on('snl:joined', onJoined);
    socket.on('snl:state', onState);
    socket.on('snl:turnResult', onTurn);
    socket.on('snl:error', onErr);
    socket.on('snl:left', onLeft);

    return () => {
      socket.off('snl:joined', onJoined);
      socket.off('snl:state', onState);
      socket.off('snl:turnResult', onTurn);
      socket.off('snl:error', onErr);
      socket.off('snl:left', onLeft);
      stopIntervals();
      socket.emit('snl:leaveRoom');
    };
  }, [stopIntervals]);

  const createRoom = () => {
    setError('');
    setBanner('');
    socket.emit('snl:createRoom');
  };

  const joinRoom = () => {
    setError('');
    setBanner('');
    socket.emit('snl:joinRoom', { code: joinCode.trim() });
  };

  const startGame = () => {
    setError('');
    socket.emit('snl:startGame');
  };

  const roll = () => {
    setError('');
    setRollPending(true);
    setDiceSpin(true);
    let f = 0;
    diceTimerRef.current = setInterval(() => {
      f = (f % 6) + 1;
      setDiceFace(f);
    }, 45);
    socket.emit('snl:roll');
  };

  const rematch = () => {
    setError('');
    socket.emit('snl:rematch');
  };

  const leave = () => {
    socket.emit('snl:leaveRoom');
    setGameState(null);
  };

  const copyCode = () => {
    if (!gameState?.code) return;
    navigator.clipboard?.writeText(gameState.code);
    setBanner('Room code copied!');
    setTimeout(() => setBanner(''), 2000);
  };

  const isHost = gameState && myUserId && String(gameState.hostId) === String(myUserId);
  const myPlayerIndex = useMemo(() => {
    if (!gameState?.players || !myUserId) return -1;
    return gameState.players.findIndex((p) => String(p.userId) === String(myUserId));
  }, [gameState, myUserId]);

  const isMyTurn =
    gameState?.phase === 'playing' &&
    myPlayerIndex === gameState.currentTurnIndex &&
    gameState.players[myPlayerIndex]?.connected;

  const svgSize = boardInner + PAD * 2 + 8;

  const ladderLines = useMemo(() => {
    return LADDERS.map(([from, to]) => {
      const a = cellCenter(from, boardInner);
      const b = cellCenter(to, boardInner);
      return { from, to, a, b, key: `L-${from}-${to}` };
    });
  }, [boardInner]);

  const snakeLines = useMemo(() => {
    return SNAKES.map(([from, to]) => {
      const a = cellCenter(from, boardInner);
      const b = cellCenter(to, boardInner);
      const mx = (a.x + b.x) / 2 + (a.y - b.y) * 0.12;
      const my = (a.y + b.y) / 2 - (a.x - b.x) * 0.12;
      return { from, to, a, b, mx, my, key: `S-${from}-${to}` };
    });
  }, [boardInner]);

  const displayPosition = (idx) => {
    if (animOverride && animOverride.playerIndex === idx) return animOverride.cell;
    return gameState?.players[idx]?.position ?? 0;
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#5c94fc] flex flex-col items-center justify-center px-4 font-['Press_Start_2P',cursive] text-[10px] sm:text-xs">
        <Helmet>
          <title>Beanstalk Run — Aquads Game Hub</title>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
        </Helmet>
        <div className="bg-[#c84c0c] border-4 border-black p-6 max-w-md text-center text-yellow-200 shadow-[8px_8px_0_#000]">
          <p className="mb-4 leading-relaxed">Log in to play the server-run 4-player arena. Dice and moves are locked on Aquads so nobody can cheat.</p>
          <Link to="/games" className="inline-block bg-[#fcbcb0] text-black border-4 border-black px-4 py-3 hover:bg-white">
            ← Game Hub
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-yellow-100 overflow-x-hidden pb-16 relative"
      style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px' }}
    >
      <Helmet>
        <title>Beanstalk Run — Snakes & Ladders Reinvented | Aquads</title>
        <meta
          name="description"
          content="4-player Snakes & Ladders with Mario-style retro graphics. Server-authoritative dice and turns — fair public play on Aquads."
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      </Helmet>

      {/* Sky & clouds */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#5c94fc] via-[#6bb5ff] to-[#88d0ff] -z-20" />
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="fixed -z-10 opacity-90"
          style={{ top: `${8 + i * 14}%`, left: `${-20 + i * 35}%` }}
          animate={{ x: [0, 120, 0] }}
          transition={{ duration: 18 + i * 4, repeat: Infinity, ease: 'linear' }}
        >
          <div className="flex gap-1">
            <div className="w-10 h-6 bg-white rounded-full border-2 border-black" />
            <div className="w-12 h-7 bg-white rounded-full border-2 border-black -ml-3 mt-1" />
            <div className="w-9 h-6 bg-white rounded-full border-2 border-black -ml-3" />
          </div>
        </motion.div>
      ))}

      <nav className="relative z-10 flex flex-wrap items-center justify-between gap-2 px-3 py-3 bg-[#c84c0c] border-b-4 border-black">
        <Link to="/games" className="text-[#fcbcb0] hover:text-white border-2 border-black bg-black/20 px-2 py-1">
          ← HUB
        </Link>
        <h1 className="text-[9px] sm:text-[11px] text-center flex-1 text-yellow-200 drop-shadow-[2px_2px_0_#000]">
          BEANSTALK RUN
        </h1>
        <span className="text-[8px] text-[#fcbcb0] hidden sm:inline">4P · SERVER FAIR</span>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-2 sm:px-4 pt-4">
        <p className="text-center text-[8px] sm:text-[9px] text-black/80 mb-4 max-w-xl mx-auto leading-relaxed bg-white/30 border-2 border-black px-2 py-2">
          Classic Snakes & Ladders reinvented: climb <span className="text-green-800">beanstalk pipes</span>, slide{' '}
          <span className="text-red-800">piranha chutes</span>. Rolls &amp; tiles are enforced on Aquads — your browser only
          shows the show.
        </p>

        {error && (
          <div className="mb-3 bg-red-600 border-4 border-black text-white px-3 py-2 text-[8px]">{error}</div>
        )}
        {banner && (
          <div className="mb-3 bg-green-700 border-4 border-black text-yellow-100 px-3 py-2 text-[8px]">{banner}</div>
        )}

        {!gameState ? (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-[#fcbcb0] border-4 border-black p-4 shadow-[6px_6px_0_#000]">
              <h2 className="text-black mb-3 text-[10px]">HOST</h2>
              <button
                type="button"
                onClick={createRoom}
                className="w-full bg-[#43b047] text-black border-4 border-black py-3 hover:brightness-110 active:translate-y-0.5"
              >
                CREATE ROOM
              </button>
            </div>
            <div className="bg-[#fcbcb0] border-4 border-black p-4 shadow-[6px_6px_0_#000]">
              <h2 className="text-black mb-3 text-[10px]">JOIN</h2>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="CODE"
                maxLength={6}
                className="w-full mb-3 bg-white border-4 border-black px-2 py-2 text-black uppercase tracking-widest"
              />
              <button
                type="button"
                onClick={joinRoom}
                className="w-full bg-[#049cd8] text-black border-4 border-black py-3 hover:brightness-110"
              >
                ENTER CODE
              </button>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_280px] gap-4 items-start">
            <div className="flex flex-col items-center">
              <div className="flex flex-wrap items-center justify-center gap-2 mb-3 w-full">
                <span className="bg-black text-yellow-300 border-2 border-yellow-400 px-2 py-1 tracking-[0.2em]">
                  {gameState.code}
                </span>
                <button type="button" onClick={copyCode} className="bg-[#ffd700] text-black border-4 border-black px-2 py-1">
                  COPY
                </button>
                <button type="button" onClick={leave} className="bg-red-600 text-white border-4 border-black px-2 py-1">
                  LEAVE
                </button>
              </div>

              <div className="relative bg-[#d4a574] border-4 border-black p-2 shadow-[8px_8px_0_#000]">
                <svg
                  width={svgSize}
                  height={svgSize}
                  viewBox={`0 0 ${svgSize} ${svgSize}`}
                  className="max-w-full h-auto"
                  aria-label="Game board"
                >
                  <defs>
                    <pattern id="brick" width="16" height="8" patternUnits="userSpaceOnUse">
                      <rect width="16" height="8" fill="#b5651d" />
                      <path d="M0 0 H16 M0 4 H8 M8 4 H16 M8 0 V8 M0 4 V8" stroke="#5c2e0a" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect x="2" y="2" width={svgSize - 4} height={svgSize - 4} fill="url(#brick)" stroke="#000" strokeWidth="4" />

                  {Array.from({ length: BOARD_CELLS }, (_, i) => {
                    const cell = BOARD_CELLS - i;
                    const c = cellCenter(cell, boardInner);
                    const cs = boardInner / 10;
                    const rowFromBottom = Math.floor((cell - 1) / 10);
                    const rowFromTop = 9 - rowFromBottom;
                    const colInRow = (cell - 1) % 10;
                    const col = rowFromBottom % 2 === 0 ? colInRow : 9 - colInRow;
                    const x = PAD + col * cs;
                    const y = PAD + rowFromTop * cs;
                    const shade = (rowFromTop + col) % 2 === 0 ? '#e8c99b' : '#d4a574';
                    return (
                      <g key={cell}>
                        <rect x={x + 1} y={y + 1} width={cs - 2} height={cs - 2} fill={shade} stroke="#3d2914" strokeWidth="1" />
                        <text
                          x={x + cs * 0.5}
                          y={y + cs * 0.62}
                          textAnchor="middle"
                          fill="#3d2914"
                          style={{ fontSize: Math.max(7, cs * 0.22), fontFamily: "'Press Start 2P', monospace" }}
                        >
                          {cell}
                        </text>
                      </g>
                    );
                  })}

                  {ladderLines.map(({ a, b, key }) => (
                    <line
                      key={key}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="#1b5e20"
                      strokeWidth="5"
                      strokeLinecap="round"
                      opacity={0.85}
                    />
                  ))}
                  {ladderLines.map(({ a, b, key }) => (
                    <line
                      key={`${key}-pipe`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="#43b047"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                      opacity={0.9}
                    />
                  ))}

                  {snakeLines.map(({ a, b, mx, my, key }) => (
                    <path
                      key={key}
                      d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
                      fill="none"
                      stroke="#8b0000"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  ))}
                  {snakeLines.map(({ a, b, mx, my, key }) => (
                    <path
                      key={`${key}-inner`}
                      d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
                      fill="none"
                      stroke="#ff6b6b"
                      strokeWidth="1.5"
                      strokeDasharray="3 4"
                    />
                  ))}

                  {gameState.players.map((pl, idx) => {
                    const pos = displayPosition(idx);
                    const { x, y } = cellCenter(pos, boardInner);
                    const [ox, oy] = PAWN_OFFSET[idx] || [0, 0];
                    return (
                      <g key={pl.userId}>
                        <circle cx={x + ox} cy={y + oy} r="11" fill="#000" opacity="0.35" />
                        <circle cx={x + ox - 1} cy={y + oy - 1} r="10" fill={pl.color} stroke="#000" strokeWidth="3" />
                        <text
                          x={x + ox}
                          y={y + oy + 3}
                          textAnchor="middle"
                          fill="#000"
                          style={{ fontSize: '9px', fontFamily: "'Press Start 2P', monospace" }}
                        >
                          {idx + 1}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {gameState.phase === 'finished' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/55 border-4 border-yellow-400">
                    <div className="bg-[#ffd700] border-4 border-black px-4 py-3 text-center text-black max-w-[90%]">
                      <p className="mb-2 text-[10px]">FLAG CAPTURE!</p>
                      <p className="text-[8px] mb-3">
                        {gameState.players[gameState.winnerIndex]?.username} WINS
                      </p>
                      {isHost && (
                        <button
                          type="button"
                          onClick={rematch}
                          className="bg-green-600 text-white border-4 border-black px-3 py-2 text-[8px]"
                        >
                          RUN IT BACK
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
                <div
                  className={`w-16 h-16 border-4 border-black flex items-center justify-center text-2xl bg-white text-black shadow-[4px_4px_0_#000] ${
                    diceSpin ? 'animate-pulse' : ''
                  }`}
                >
                  {diceFace}
                </div>
                {gameState.phase === 'playing' && isMyTurn && (
                  <button
                    type="button"
                    onClick={roll}
                    disabled={rollPending || animating}
                    className="bg-[#e52521] text-white border-4 border-black px-6 py-4 text-[10px] hover:brightness-110 disabled:opacity-50 shadow-[6px_6px_0_#000]"
                  >
                    ROLL (SERVER DICE)
                  </button>
                )}
                {gameState.phase === 'playing' && !isMyTurn && (
                  <span className="text-black bg-white/80 border-2 border-black px-2 py-1">
                    {gameState.players[gameState.currentTurnIndex]?.username}&apos;S TURN
                  </span>
                )}
                {gameState.phase === 'lobby' && isHost && (
                  <button
                    type="button"
                    onClick={startGame}
                    disabled={gameState.players.length < 2}
                    className="bg-[#43b047] text-black border-4 border-black px-6 py-3 disabled:opacity-40"
                  >
                    START ({gameState.players.length}/4)
                  </button>
                )}
                {gameState.phase === 'lobby' && !isHost && (
                  <span className="text-black">WAITING FOR HOST…</span>
                )}
              </div>
            </div>

            <div className="bg-[#fcbcb0] border-4 border-black p-3 text-black space-y-2 shadow-[6px_6px_0_#000]">
              <h3 className="text-[9px] border-b-2 border-black pb-1">PLAYERS</h3>
              <ul className="space-y-2">
                {gameState.players.map((pl, i) => (
                  <li key={pl.userId} className="flex items-center gap-2 text-[8px]">
                    <span className="w-3 h-3 border border-black" style={{ background: pl.color }} />
                    <span className="flex-1 truncate">{pl.username}</span>
                    {!pl.connected && <span className="text-red-700">OUT</span>}
                    {gameState.phase === 'playing' && gameState.currentTurnIndex === i && (
                      <span className="text-green-800">◆</span>
                    )}
                  </li>
                ))}
              </ul>
              <div className="text-[7px] leading-relaxed pt-2 border-t-2 border-black/30">
                <p className="mb-1">· Roll a 6 to leave the start line onto square 6.</p>
                <p className="mb-1">· Land exactly on 100 to win.</p>
                <p>· Roll 6 = bonus roll (still fair — server picks the value).</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
