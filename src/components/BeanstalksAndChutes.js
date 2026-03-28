import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { socket, reconnectSocket } from '../services/api';

const BOARD_CELLS = 100;

/* Must match server/beanstalksChutes.js — classic set + one extra pipe & chute */
const LADDERS = [
  [1, 38], [4, 14], [9, 31], [21, 42], [28, 84], [36, 44], [51, 67], [71, 91], [80, 100],
  [17, 40], [12, 35],
];
const SNAKES = [
  [98, 28], [95, 24], [92, 51], [89, 53], [74, 17], [64, 60], [62, 19], [56, 45], [49, 11], [47, 26],
  [16, 6],
];

const API_BASE = process.env.REACT_APP_API_URL || '';

function playerImageUrl(src) {
  if (!src) return null;
  if (src.startsWith('http') || src.startsWith('data:') || src.startsWith('blob:')) return src;
  if (src.startsWith('/')) return `${API_BASE}${src}`;
  return src;
}

function getPad(inner) {
  return Math.round(12 + inner * 0.028);
}

function cellCenter(cell, inner) {
  const pad = getPad(inner);
  const cs = inner / 10;
  if (cell <= 0) {
    return { x: pad + cs * 0.5, y: pad + inner + cs * 0.42 };
  }
  const n = cell - 1;
  const rowFromBottom = Math.floor(n / 10);
  const rowFromTop = 9 - rowFromBottom;
  const colInRow = n % 10;
  const col = rowFromBottom % 2 === 0 ? colInRow : 9 - colInRow;
  return {
    x: pad + col * cs + cs / 2,
    y: pad + rowFromTop * cs + cs / 2,
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

const DICE_ROT = {
  1: [0, 0],
  2: [0, -90],
  3: [-90, 0],
  4: [90, 0],
  5: [0, 90],
  6: [0, 180],
};

function PipFace({ value, size }) {
  const pip = 'rounded-full bg-stone-900 shadow-inner';
  const s = size / 5;
  const spots = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[28, 28], [28, 72], [72, 28], [72, 72]],
    5: [[28, 28], [28, 72], [50, 50], [72, 28], [72, 72]],
    6: [[28, 22], [28, 50], [28, 78], [72, 22], [72, 50], [72, 78]],
  }[value] || [[50, 50]];
  return (
    <div
      className="absolute inset-0 rounded-md border-2 border-stone-700 bg-gradient-to-br from-stone-50 via-white to-stone-200 shadow-inner"
      style={{ width: size, height: size }}
    >
      {spots.map(([lx, ly], i) => (
        <div
          key={i}
          className={`absolute ${pip}`}
          style={{
            width: s,
            height: s,
            left: `${lx}%`,
            top: `${ly}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  );
}

function DiceCube({ spinning, value, size = 76 }) {
  const hz = size / 2;
  const faceStyle = (transform) => ({
    position: 'absolute',
    width: size,
    height: size,
    transform,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
  });

  const [rx, ry] = DICE_ROT[value] || [0, 0];

  return (
    <div
      className="relative mx-auto"
      style={{
        width: size,
        height: size,
        perspective: size * 4,
      }}
    >
      <motion.div
        className="relative"
        style={{
          width: size,
          height: size,
          transformStyle: 'preserve-3d',
        }}
        animate={
          spinning
            ? {
                rotateX: [0, 360, 720, 1080],
                rotateY: [0, 540, 900, 1440],
              }
            : { rotateX: rx, rotateY: ry }
        }
        transition={
          spinning
            ? { duration: 0.45, repeat: Infinity, ease: 'linear' }
            : { type: 'spring', damping: 16, stiffness: 90, mass: 0.8 }
        }
      >
        <div style={{ ...faceStyle(`translateZ(${hz}px)`), transformStyle: 'preserve-3d' }}>
          <PipFace value={1} size={size} />
        </div>
        <div style={{ ...faceStyle(`rotateY(180deg) translateZ(${hz}px)`), transformStyle: 'preserve-3d' }}>
          <PipFace value={6} size={size} />
        </div>
        <div style={{ ...faceStyle(`rotateY(90deg) translateZ(${hz}px)`), transformStyle: 'preserve-3d' }}>
          <PipFace value={2} size={size} />
        </div>
        <div style={{ ...faceStyle(`rotateY(-90deg) translateZ(${hz}px)`), transformStyle: 'preserve-3d' }}>
          <PipFace value={5} size={size} />
        </div>
        <div style={{ ...faceStyle(`rotateX(90deg) translateZ(${hz}px)`), transformStyle: 'preserve-3d' }}>
          <PipFace value={3} size={size} />
        </div>
        <div style={{ ...faceStyle(`rotateX(-90deg) translateZ(${hz}px)`), transformStyle: 'preserve-3d' }}>
          <PipFace value={4} size={size} />
        </div>
      </motion.div>
      <div
        className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-[100%] bg-black/35 blur-sm"
        style={{ width: size * 0.85, height: size * 0.22 }}
      />
    </div>
  );
}

function pipeRings(a, b, count) {
  const rings = [];
  for (let i = 1; i < count; i++) {
    const t = i / count;
    rings.push({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      key: `ring-${i}`,
    });
  }
  return rings;
}

export default function BeanstalksAndChutes({ currentUser }) {
  const [gameState, setGameState] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [banner, setBanner] = useState('');
  const [diceSpinning, setDiceSpinning] = useState(false);
  const [diceValue, setDiceValue] = useState(1);
  const [animOverride, setAnimOverride] = useState(null);
  const [rollPending, setRollPending] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [boardInner, setBoardInner] = useState(440);
  const [cellPulse, setCellPulse] = useState(null);
  const [openRooms, setOpenRooms] = useState([]);

  const animTimerRef = useRef(null);
  const turnDelayRef = useRef(null);
  const spinStartRef = useRef(0);

  const myUserId = currentUser?.userId || currentUser?.id;
  const pad = getPad(boardInner);

  useEffect(() => {
    const measure = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 900;
      const h = typeof window !== 'undefined' ? window.innerHeight : 800;
      const navAndChrome = 118;
      const toolbarRow = 44;
      const diceRail = 120;
      const gap = 16;
      const sidebar = w >= 1024 ? 268 : 0;
      const gridGutter = w >= 1024 ? 16 : 0;
      const horizontalPad = 24;
      const maxFromH = Math.max(260, h - navAndChrome - toolbarRow - horizontalPad);
      const contentW = Math.min(1152, w) - horizontalPad;
      const maxFromW = Math.max(260, contentW - sidebar - gridGutter - diceRail - gap);
      const cap = w >= 1024 ? 600 : w >= 768 ? 520 : 480;
      const next = Math.min(cap, Math.max(280, Math.floor(Math.min(maxFromW, maxFromH))));
      setBoardInner(next);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const stopIntervals = useCallback(() => {
    if (animTimerRef.current) {
      clearInterval(animTimerRef.current);
      animTimerRef.current = null;
    }
    if (turnDelayRef.current) {
      clearTimeout(turnDelayRef.current);
      turnDelayRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (currentUser?.token) reconnectSocket();
  }, [currentUser?.token]);

  useEffect(() => {
    if (!currentUser?.token || gameState) return undefined;

    const requestList = () => socket.emit('snl:listOpenRooms');
    const onList = ({ rooms }) => setOpenRooms(Array.isArray(rooms) ? rooms : []);
    const onRefresh = () => requestList();

    socket.on('snl:openRooms', onList);
    socket.on('snl:openRoomsRefresh', onRefresh);
    requestList();
    const interval = setInterval(requestList, 8000);

    return () => {
      socket.off('snl:openRooms', onList);
      socket.off('snl:openRoomsRefresh', onRefresh);
      clearInterval(interval);
    };
  }, [currentUser?.token, gameState]);

  useEffect(() => {
    const runPathAnimation = (payload) => {
      const path = payload.path || [0];
      if (path.length <= 1 || !payload.moved) {
        setGameState(payload.state);
        setAnimOverride(null);
        setAnimating(false);
        setCellPulse(null);
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
          setCellPulse(null);
          setGameState(payload.state);
          if (payload.slides?.length) {
            const last = payload.slides[payload.slides.length - 1];
            playBlip(last.type === 'ladder' ? 720 : 180, 0.1);
          }
          if (payload.gameOver) playBlip(880, 0.15);
          return;
        }
        const c = path[step];
        setAnimOverride({ playerIndex: payload.playerIndex, cell: c });
        setCellPulse(c);
        playBlip(420, 0.03);
      }, 105);
    };

    const onJoined = ({ state }) => {
      setGameState(state);
      setError('');
    };
    const onState = (state) => {
      setGameState(state);
    };

    const onTurn = (payload) => {
      stopIntervals();
      setRollPending(false);

      const settleDiceAndMove = () => {
        setDiceValue(payload.roll);
        setDiceSpinning(false);
        playBlip(380 + payload.roll * 40, 0.05);
        runPathAnimation(payload);
      };

      const minSpin = 1050;
      const elapsed = Date.now() - spinStartRef.current;
      const wait = Math.max(0, minSpin - elapsed);
      if (wait > 0) {
        turnDelayRef.current = setTimeout(settleDiceAndMove, wait);
      } else {
        settleDiceAndMove();
      }
    };

    const onErr = ({ message }) => {
      stopIntervals();
      setDiceSpinning(false);
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

  const joinOpenRoom = (code) => {
    const c = String(code || '').toUpperCase().trim();
    if (c.length !== 6) return;
    setError('');
    setBanner('');
    setJoinCode(c);
    socket.emit('snl:joinRoom', { code: c });
  };

  const startGame = () => {
    setError('');
    socket.emit('snl:startGame');
  };

  const roll = () => {
    setError('');
    spinStartRef.current = Date.now();
    setRollPending(true);
    setDiceSpinning(true);
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

  const svgSize = boardInner + pad * 2 + 10;

  const ladderLines = useMemo(() => {
    return LADDERS.map(([from, to]) => {
      const a = cellCenter(from, boardInner);
      const b = cellCenter(to, boardInner);
      return { from, to, a, b, key: `L-${from}-${to}`, rings: pipeRings(a, b, 7) };
    });
  }, [boardInner]);

  const snakeLines = useMemo(() => {
    return SNAKES.map(([from, to]) => {
      const a = cellCenter(from, boardInner);
      const b = cellCenter(to, boardInner);
      const mx = (a.x + b.x) / 2 + (a.y - b.y) * 0.2;
      const my = (a.y + b.y) / 2 - (a.x - b.x) * 0.18;
      return { from, to, a, b, mx, my, key: `S-${from}-${to}` };
    });
  }, [boardInner]);

  const displayPosition = (idx) => {
    if (animOverride && animOverride.playerIndex === idx) return animOverride.cell;
    return gameState?.players[idx]?.position ?? 0;
  };

  const pawnRadius = Math.max(13, boardInner * 0.036);
  const PAWN_OFF = useMemo(() => {
    const d = pawnRadius * 0.55;
    return [
      [-d, -d],
      [d, -d],
      [-d, d],
      [d, d],
    ];
  }, [pawnRadius]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#5c94fc] flex flex-col items-center justify-center px-4 font-['Press_Start_2P',cursive] text-[10px] sm:text-xs">
        <Helmet>
          <title>Beanstalks &amp; Chutes — Aquads Game Hub</title>
          <link rel="canonical" href="https://www.aquads.xyz/games/beanstalks-and-chutes" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
        </Helmet>
        <div className="bg-[#c84c0c] border-4 border-black p-6 max-w-md text-center text-yellow-200 shadow-[8px_8px_0_#000]">
          <p className="mb-4 leading-relaxed">Log in to play Beanstalks &amp; Chutes — the 4-player arena. Dice and moves are locked on Aquads so nobody can cheat.</p>
          <Link to="/games" className="inline-block bg-[#fcbcb0] text-black border-4 border-black px-4 py-3 hover:bg-white">
            ← Game Hub
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`text-yellow-100 overflow-x-hidden relative ${gameState ? 'min-h-0 h-[100dvh] flex flex-col overflow-hidden' : 'min-h-screen pb-12'}`}
      style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px' }}
    >
      <Helmet>
        <title>Beanstalks &amp; Chutes — Multiplayer | Aquads</title>
        <meta
          name="description"
          content="Beanstalks &amp; Chutes: 4-player retro pipes and chutes on Aquads. Server-authoritative dice and turns — fair public play."
        />
        <link rel="canonical" href="https://www.aquads.xyz/games/beanstalks-and-chutes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      </Helmet>

      <style>{`
        @keyframes snl-cell-pulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.25) saturate(1.2); }
        }
        .snl-pulse { animation: snl-cell-pulse 0.35s ease-out; }
      `}</style>

      <div className="fixed inset-0 bg-gradient-to-b from-[#5c94fc] via-[#6bb5ff] to-[#88d0ff] -z-20" />
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="fixed -z-10 opacity-90"
          style={{ top: `${8 + i * 14}%`, left: `${-20 + i * 35}%` }}
          animate={{ x: [0, 140, 0] }}
          transition={{ duration: 20 + i * 5, repeat: Infinity, ease: 'linear' }}
        >
          <div className="flex gap-1">
            <div className="w-10 h-6 bg-white rounded-full border-2 border-black" />
            <div className="w-12 h-7 bg-white rounded-full border-2 border-black -ml-3 mt-1" />
            <div className="w-9 h-6 bg-white rounded-full border-2 border-black -ml-3" />
          </div>
        </motion.div>
      ))}

      <nav className="relative z-10 flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:py-3 bg-[#c84c0c] border-b-4 border-black shrink-0">
        <Link to="/games" className="text-[#fcbcb0] hover:text-white border-2 border-black bg-black/20 px-2 py-1">
          ← HUB
        </Link>
        <h1 className="text-[7px] sm:text-[9px] md:text-[10px] text-center flex-1 text-yellow-200 drop-shadow-[2px_2px_0_#000] leading-tight px-1">
          BEANSTALKS &amp; CHUTES
        </h1>
        <span className="text-[8px] text-[#fcbcb0] hidden sm:inline">4P · SERVER FAIR</span>
      </nav>

      <div
        className={`relative z-10 max-w-6xl mx-auto px-2 sm:px-4 w-full ${gameState ? 'flex-1 min-h-0 flex flex-col pt-1' : 'pt-4'}`}
      >
        {!gameState && (
          <p className="text-center text-[8px] sm:text-[9px] text-black/80 mb-4 max-w-xl mx-auto leading-relaxed bg-white/30 border-2 border-black px-2 py-2">
            <span className="font-bold text-black">Beanstalks &amp; Chutes</span> — climb{' '}
            <span className="text-green-900 font-bold">warp pipes</span>, ride the{' '}
            <span className="text-red-900 font-bold">piranha chutes</span>. Big board, 3D dice, avatars on the track —
            rolls come from Aquads.
          </p>
        )}

        {error && (
          <div className={`bg-red-600 border-4 border-black text-white px-2 py-1.5 text-[8px] shrink-0 ${gameState ? 'mb-1' : 'mb-3'}`}>
            {error}
          </div>
        )}
        {banner && (
          <div className={`bg-green-700 border-4 border-black text-yellow-100 px-2 py-1.5 text-[8px] shrink-0 ${gameState ? 'mb-1' : 'mb-3'}`}>
            {banner}
          </div>
        )}

        {!gameState ? (
          <>
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
                <h2 className="text-black mb-3 text-[10px]">JOIN WITH CODE</h2>
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

            <div className="mt-4 bg-[#fcbcb0] border-4 border-black p-3 sm:p-4 shadow-[6px_6px_0_#000]">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 className="text-black text-[10px]">OPEN LOBBIES</h2>
                <button
                  type="button"
                  onClick={() => socket.emit('snl:listOpenRooms')}
                  className="text-[8px] bg-white border-2 border-black px-2 py-1 text-black hover:bg-gray-100"
                >
                  REFRESH
                </button>
              </div>
              {openRooms.length === 0 ? (
                <p className="text-black/80 text-[8px] leading-relaxed">
                  No open rooms right now. Create one above or check back in a few seconds — the list updates automatically.
                </p>
              ) : (
                <ul className="space-y-2 max-h-[min(280px,45vh)] overflow-y-auto pr-1">
                  {openRooms.map((r) => (
                    <li
                      key={r.code}
                      className="flex flex-wrap items-center justify-between gap-2 bg-white/90 border-2 border-black px-2 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-black font-bold tracking-[0.15em] text-[10px] sm:text-[11px]">{r.code}</div>
                        <div className="text-[7px] sm:text-[8px] text-black/75 mt-0.5">
                          Host <span className="text-black font-semibold">{r.host}</span> · {r.players}/{r.max} players
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => joinOpenRoom(r.code)}
                        className="shrink-0 bg-[#049cd8] text-black border-4 border-black px-3 py-2 text-[8px] sm:text-[9px] hover:brightness-110 active:translate-y-0.5 shadow-[3px_3px_0_#000]"
                      >
                        JOIN
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <div className="grid lg:grid-cols-[1fr_minmax(200px,248px)] gap-2 sm:gap-3 flex-1 min-h-0 items-stretch">
            <div className="flex flex-col min-w-0 min-h-0 gap-1 sm:gap-2">
              <div className="flex flex-wrap items-center gap-1 sm:gap-2 shrink-0">
                <span className="bg-black text-yellow-300 border-2 border-yellow-400 px-2 py-0.5 tracking-[0.2em] text-[8px] sm:text-[9px]">
                  {gameState.code}
                </span>
                <button type="button" onClick={copyCode} className="bg-[#ffd700] text-black border-2 sm:border-4 border-black px-2 py-0.5 text-[8px]">
                  COPY
                </button>
                <button type="button" onClick={leave} className="bg-red-600 text-white border-2 sm:border-4 border-black px-2 py-0.5 text-[8px]">
                  LEAVE
                </button>
              </div>

              <div className="flex flex-row gap-2 sm:gap-3 flex-1 min-h-0 items-stretch">
                <div className="flex-1 min-w-0 min-h-0 flex items-center justify-center overflow-hidden">
                  <motion.div
                    layout
                    className="relative bg-[#d4a574] border-4 border-black p-1 sm:p-2 shadow-[8px_8px_0_#000] w-full max-h-full max-w-full"
                    style={{ aspectRatio: '1 / 1', maxHeight: 'min(100%, calc(100dvh - 6.75rem))' }}
                    initial={false}
                  >
                    <svg
                      width="100%"
                      height="100%"
                      viewBox={`0 0 ${svgSize} ${svgSize}`}
                      className="w-full h-full block select-none"
                      aria-label="Game board"
                      preserveAspectRatio="xMidYMid meet"
                    >
                  <defs>
                    <pattern id="snl-brick" width="16" height="8" patternUnits="userSpaceOnUse">
                      <rect width="16" height="8" fill="#b5651d" />
                      <path d="M0 0 H16 M0 4 H8 M8 4 H16 M8 0 V8 M0 4 V8" stroke="#5c2e0a" strokeWidth="1" />
                    </pattern>
                    <linearGradient id="pipeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1b5e20" />
                      <stop offset="45%" stopColor="#43b047" />
                      <stop offset="100%" stopColor="#2e7d32" />
                    </linearGradient>
                    <linearGradient id="pipeShine" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="chuteGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#5c0000" />
                      <stop offset="50%" stopColor="#b71c1c" />
                      <stop offset="100%" stopColor="#7f0000" />
                    </linearGradient>
                    <radialGradient id="chuteHole" cx="50%" cy="40%" r="60%">
                      <stop offset="0%" stopColor="#1a0505" />
                      <stop offset="100%" stopColor="#4a0a0a" />
                    </radialGradient>
                    <filter id="snl-shadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="1" dy="2" stdDeviation="1.2" floodOpacity="0.4" />
                    </filter>
                  </defs>
                  <rect x="2" y="2" width={svgSize - 4} height={svgSize - 4} fill="url(#snl-brick)" stroke="#000" strokeWidth="4" />

                  {Array.from({ length: BOARD_CELLS }, (_, i) => {
                    const cell = BOARD_CELLS - i;
                    const cs = boardInner / 10;
                    const rowFromBottom = Math.floor((cell - 1) / 10);
                    const rowFromTop = 9 - rowFromBottom;
                    const colInRow = (cell - 1) % 10;
                    const col = rowFromBottom % 2 === 0 ? colInRow : 9 - colInRow;
                    const x = pad + col * cs;
                    const y = pad + rowFromTop * cs;
                    const shade = (rowFromTop + col) % 2 === 0 ? '#e8c99b' : '#d4a574';
                    const pulse = cellPulse === cell;
                    return (
                      <g key={cell} className={pulse ? 'snl-pulse' : ''}>
                        <rect x={x + 1} y={y + 1} width={cs - 2} height={cs - 2} fill={shade} stroke="#3d2914" strokeWidth="1" rx="2" />
                        <text
                          x={x + cs * 0.5}
                          y={y + cs * 0.62}
                          textAnchor="middle"
                          fill="#3d2914"
                          style={{ fontSize: Math.max(8, cs * 0.2), fontFamily: "'Press Start 2P', monospace" }}
                        >
                          {cell}
                        </text>
                      </g>
                    );
                  })}

                  {ladderLines.map(({ a, b, rings, key }) => (
                    <g key={key} filter="url(#snl-shadow)">
                      <line
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke="url(#pipeGrad)"
                        strokeWidth={Math.max(10, boardInner * 0.028)}
                        strokeLinecap="round"
                      />
                      <line
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke="url(#pipeShine)"
                        strokeWidth={Math.max(4, boardInner * 0.012)}
                        strokeLinecap="round"
                        opacity={0.9}
                      />
                      {rings.map((r) => (
                        <ellipse
                          key={r.key}
                          cx={r.x}
                          cy={r.y}
                          rx={Math.max(7, boardInner * 0.02)}
                          ry={Math.max(4, boardInner * 0.012)}
                          fill="none"
                          stroke="#0d3d0f"
                          strokeWidth="2.5"
                          transform={`rotate(${((r.x + r.y) % 40) - 20} ${r.x} ${r.y})`}
                        />
                      ))}
                      <g transform={`translate(${b.x}, ${b.y})`}>
                        <ellipse cx={0} cy={-4} rx={14} ry={8} fill="#2e7d32" stroke="#0d280d" strokeWidth="2" />
                        <path d="M -12 -8 Q -6 -22 0 -18 Q 6 -24 12 -10" fill="none" stroke="#1b5e20" strokeWidth="3" strokeLinecap="round" />
                        <path d="M -8 -6 Q 0 -20 10 -8" fill="none" stroke="#66bb6a" strokeWidth="2" strokeLinecap="round" />
                      </g>
                    </g>
                  ))}

                  {snakeLines.map(({ a, b, mx, my, key }) => (
                    <g key={key} filter="url(#snl-shadow)">
                      <path
                        d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
                        fill="none"
                        stroke="#2a0505"
                        strokeWidth={Math.max(13, boardInner * 0.034)}
                        strokeLinecap="round"
                      />
                      <path
                        d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
                        fill="none"
                        stroke="url(#chuteGrad)"
                        strokeWidth={Math.max(8, boardInner * 0.022)}
                        strokeLinecap="round"
                      />
                      <path
                        d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
                        fill="none"
                        stroke="#ffcdd2"
                        strokeWidth="2"
                        strokeDasharray="4 6"
                        strokeLinecap="round"
                        opacity={0.85}
                      />
                      <g transform={`translate(${a.x}, ${a.y})`}>
                        <circle r={Math.max(11, boardInner * 0.03)} fill="url(#chuteHole)" stroke="#3e2723" strokeWidth="2" />
                        {[...Array(8)].map((_, i) => {
                          const ang = (i / 8) * Math.PI * 2 - Math.PI / 2;
                          const rm = Math.max(10, boardInner * 0.028);
                          const x1 = Math.cos(ang) * rm;
                          const y1 = Math.sin(ang) * rm;
                          const x2 = Math.cos(ang + 0.28) * rm * 0.55;
                          const y2 = Math.sin(ang + 0.28) * rm * 0.55;
                          return (
                            <polygon
                              key={i}
                              points={`0,0 ${x1.toFixed(2)},${y1.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)}`}
                              fill="#fff59d"
                              stroke="#4e342e"
                              strokeWidth="0.6"
                            />
                          );
                        })}
                      </g>
                    </g>
                  ))}

                  {gameState.players.map((pl, idx) => {
                    const pos = displayPosition(idx);
                    const { x, y } = cellCenter(pos, boardInner);
                    const [ox, oy] = PAWN_OFF[idx] || [0, 0];
                    const cx = x + ox;
                    const cy = y + oy - pawnRadius * 0.15;
                    const img = playerImageUrl(pl.image);
                    const clipId = `pawn-clip-${pl.userId}`;
                    return (
                      <motion.g
                        key={`${pl.userId}-${pos}`}
                        initial={{ scale: 1 }}
                        animate={{ scale: [1, 1.12, 1] }}
                        transition={{ duration: 0.22 }}
                      >
                        <ellipse cx={cx + 1} cy={cy + pawnRadius * 0.85} rx={pawnRadius * 0.95} ry={pawnRadius * 0.35} fill="#000" opacity="0.4" />
                        <defs>
                          <clipPath id={clipId}>
                            <circle cx={cx} cy={cy} r={pawnRadius} />
                          </clipPath>
                        </defs>
                        <circle cx={cx} cy={cy} r={pawnRadius + 2} fill="#000" />
                        <circle cx={cx} cy={cy} r={pawnRadius + 1} fill={pl.color} />
                        {img ? (
                          <image
                            href={img}
                            x={cx - pawnRadius}
                            y={cy - pawnRadius}
                            width={pawnRadius * 2}
                            height={pawnRadius * 2}
                            clipPath={`url(#${clipId})`}
                            preserveAspectRatio="xMidYMid slice"
                            className="pointer-events-none"
                          />
                        ) : (
                          <text
                            x={cx}
                            y={cy + 4}
                            textAnchor="middle"
                            fill="#fff"
                            style={{
                              fontSize: Math.max(9, pawnRadius * 0.85),
                              fontFamily: "'Press Start 2P', monospace",
                              textShadow: '1px 1px 0 #000',
                            }}
                          >
                            {(pl.username || '?')[0].toUpperCase()}
                          </text>
                        )}
                        <circle cx={cx} cy={cy} r={pawnRadius} fill="none" stroke="#000" strokeWidth="2.5" />
                      </motion.g>
                    );
                  })}
                </svg>

                <AnimatePresence>
                  {gameState.phase === 'finished' && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center bg-black/60 border-4 border-yellow-400"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <motion.div
                        className="bg-[#ffd700] border-4 border-black px-4 py-3 text-center text-black max-w-[90%]"
                        initial={{ scale: 0.8, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                      >
                        <p className="mb-2 text-[10px]">FLAG CAPTURE!</p>
                        <p className="text-[8px] mb-3">{gameState.players[gameState.winnerIndex]?.username} WINS</p>
                        {isHost && (
                          <button
                            type="button"
                            onClick={rematch}
                            className="bg-green-600 text-white border-4 border-black px-3 py-2 text-[8px]"
                          >
                            RUN IT BACK
                          </button>
                        )}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
                  </motion.div>
                </div>

                <aside className="flex flex-col items-center justify-center gap-2 sm:gap-3 w-[96px] sm:w-[118px] shrink-0 self-stretch bg-[#fcbcb0] border-4 border-black shadow-[4px_4px_0_#000] py-2 sm:py-3 px-1.5">
                  <DiceCube
                    spinning={diceSpinning}
                    value={diceValue}
                    size={Math.min(76, Math.max(52, Math.min(boardInner * 0.16, 84)))}
                  />
                  <span className="text-[6px] sm:text-[7px] text-black/80 bg-white/70 px-1 border border-black/30 text-center leading-tight">
                    SERVER
                    <br />
                    ROLL
                  </span>
                  {gameState.phase === 'playing' && isMyTurn && (
                    <button
                      type="button"
                      onClick={roll}
                      disabled={rollPending || animating}
                      className="w-full bg-[#e52521] text-white border-2 sm:border-4 border-black px-1 py-2.5 text-[7px] sm:text-[8px] leading-tight hover:brightness-110 disabled:opacity-50 shadow-[3px_3px_0_#000] active:translate-y-0.5"
                    >
                      ROLL
                    </button>
                  )}
                  {gameState.phase === 'playing' && !isMyTurn && (
                    <p className="text-black bg-white/90 border-2 border-black px-1 py-1.5 text-[6px] sm:text-[7px] text-center leading-snug break-words w-full">
                      {gameState.players[gameState.currentTurnIndex]?.username?.slice(0, 10)}
                      {gameState.players[gameState.currentTurnIndex]?.username?.length > 10 ? '…' : ''}
                      <span className="block text-[6px] opacity-80">TURN</span>
                    </p>
                  )}
                  {gameState.phase === 'lobby' && isHost && (
                    <button
                      type="button"
                      onClick={startGame}
                      disabled={gameState.players.length < 2}
                      className="w-full bg-[#43b047] text-black border-2 sm:border-4 border-black px-1 py-2 text-[7px] sm:text-[8px] leading-tight disabled:opacity-40"
                    >
                      START {gameState.players.length}/4
                    </button>
                  )}
                  {gameState.phase === 'lobby' && !isHost && (
                    <span className="text-black text-[6px] sm:text-[7px] text-center leading-tight px-0.5">WAIT HOST…</span>
                  )}
                </aside>
              </div>
            </div>

            <div className="bg-[#fcbcb0] border-4 border-black p-2 sm:p-3 text-black space-y-2 shadow-[6px_6px_0_#000] min-h-0 max-h-[min(240px,42dvh)] overflow-y-auto overscroll-contain lg:max-h-[calc(100dvh-5.25rem)]">
              <h3 className="text-[9px] border-b-2 border-black pb-1">PLAYERS</h3>
              <ul className="space-y-2">
                {gameState.players.map((pl, i) => {
                  const img = playerImageUrl(pl.image);
                  return (
                    <li key={pl.userId} className="flex items-center gap-2 text-[8px]">
                      {img ? (
                        <img src={img} alt="" className="w-7 h-7 rounded-full border-2 border-black object-cover shrink-0" />
                      ) : (
                        <span className="w-7 h-7 rounded-full border-2 border-black shrink-0" style={{ background: pl.color }} />
                      )}
                      <span className="flex-1 truncate">{pl.username}</span>
                      {!pl.connected && <span className="text-red-700">OUT</span>}
                      {gameState.phase === 'playing' && gameState.currentTurnIndex === i && (
                        <span className="text-green-800">◆</span>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="text-[7px] leading-relaxed pt-2 border-t-2 border-black/30">
                <p className="mb-1">· Roll a 6 to leave the start and land on square 6.</p>
                <p className="mb-1">· Land exactly on 100 to win. Chutes are softer; pipes help more.</p>
                <p>· Roll 6 = bonus roll (still from the server).</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
