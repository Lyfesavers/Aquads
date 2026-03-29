import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { socket, reconnectSocket } from '../services/api';

/* Must match server/ludo.js */
const START = [0, 13, 26, 39];
const YARD = -1;
const DONE = 200;
const SAFE_TRACK = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

function gateOf(p) {
  return (START[p] - 1 + 52) % 52;
}

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

const TOKEN_JITTER = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

function cellAngle(idx) {
  return (idx / 52) * Math.PI * 2 - Math.PI / 2;
}

function tokenXY(pi, t, ti, boardInner) {
  const pad = getPad(boardInner);
  const svgSize = boardInner + pad * 2 + 10;
  const CX = svgSize / 2;
  const CY = svgSize / 2;
  const R = boardInner * 0.3;
  const [jx, jy] = TOKEN_JITTER[ti] || [0, 0];
  if (t === YARD) {
    const ang = cellAngle(START[pi]) + Math.PI;
    const rr = R + boardInner * 0.11;
    return { x: CX + rr * Math.cos(ang) + jx * 7, y: CY + rr * Math.sin(ang) + jy * 7 };
  }
  if (t >= DONE) {
    const ang = (pi / 4) * Math.PI * 2 + ti * 0.55;
    const rr = boardInner * 0.052;
    return { x: CX + rr * Math.cos(ang), y: CY + rr * Math.sin(ang) };
  }
  if (t >= 100 && t <= 104) {
    const h = t - 100;
    const g = gateOf(pi);
    const a = cellAngle(g);
    const inward = 0.14 + (h + 1) * 0.095;
    const rr = R * (1 - inward);
    return { x: CX + rr * Math.cos(a) + jx * 4, y: CY + rr * Math.sin(a) + jy * 4 };
  }
  const a = cellAngle(t);
  return { x: CX + R * Math.cos(a) + jx * 6, y: CY + R * Math.sin(a) + jy * 6 };
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
    o.type = 'sine';
    g.gain.setValueAtTime(0.06, ctx.currentTime);
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
  const pip = 'rounded-full bg-slate-900 shadow-inner';
  const s = size / 5;
  const spots = {
    1: [[50, 50]],
    2: [
      [28, 28],
      [72, 72],
    ],
    3: [
      [28, 28],
      [50, 50],
      [72, 72],
    ],
    4: [
      [28, 28],
      [28, 72],
      [72, 28],
      [72, 72],
    ],
    5: [
      [28, 28],
      [28, 72],
      [50, 50],
      [72, 28],
      [72, 72],
    ],
    6: [
      [28, 22],
      [28, 50],
      [28, 78],
      [72, 22],
      [72, 50],
      [72, 78],
    ],
  }[value] || [[50, 50]];
  return (
    <div
      className="absolute inset-0 rounded-lg border border-white/20 bg-gradient-to-br from-slate-100 via-white to-slate-200 shadow-inner"
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

function DiceCube({ spinning, value, size = 72 }) {
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
    <div className="relative mx-auto" style={{ width: size, height: size, perspective: size * 4 }}>
      <motion.div
        className="relative"
        style={{ width: size, height: size, transformStyle: 'preserve-3d' }}
        animate={
          spinning
            ? { rotateX: [0, 360, 720, 1080], rotateY: [0, 540, 900, 1440] }
            : { rotateX: rx, rotateY: ry }
        }
        transition={
          spinning
            ? { duration: 0.42, repeat: Infinity, ease: 'linear' }
            : { type: 'spring', damping: 17, stiffness: 95, mass: 0.75 }
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
        className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-[100%] bg-cyan-500/25 blur-md"
        style={{ width: size * 0.85, height: size * 0.2 }}
      />
    </div>
  );
}

function pathValueAfterSegment(v, seg) {
  if (!seg) return v;
  if (seg.kind === 'yardOut') return seg.toTrack;
  if (seg.kind === 'track') return seg.pos;
  if (seg.kind === 'enterHome') return 100;
  if (seg.kind === 'home') return 100 + seg.step;
  if (seg.kind === 'finish') return DONE;
  return v;
}

/** Classic Ludo-style pawn: domed head + tapered body (local coords, tip up). */
function LudoPawn({ cx, cy, scale, color, imageUrl, highlight, onClick, pawnId }) {
  const headR = 5.2 * scale;
  const clipId = `sludo-av-${pawnId}`;
  return (
    <g
      transform={`translate(${cx}, ${cy})`}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {highlight && (
        <motion.circle
          r={headR * 2.4}
          fill="none"
          stroke="rgba(34,211,238,0.95)"
          strokeWidth={1.8}
          initial={{ opacity: 0.6 }}
          animate={{ opacity: [0.5, 1, 0.5], r: [headR * 2.1, headR * 2.6, headR * 2.1] }}
          transition={{ duration: 1.05, repeat: Infinity }}
        />
      )}
      <ellipse cx={0} cy={headR * 1.35} rx={headR * 1.15} ry={headR * 0.42} fill="#000" opacity={0.35} />
      <path
        d={`M 0 ${-headR * 2.4} C ${-headR * 1.05} ${-headR * 2.4} ${-headR * 1.45} ${-headR * 1.35} ${-headR * 1.15} ${-headR * 0.35}
            L ${-headR * 1.35} ${headR * 1.85} L ${headR * 1.35} ${headR * 1.85} L ${headR * 1.15} ${-headR * 0.35}
            C ${headR * 1.45} ${-headR * 1.35} ${headR * 1.05} ${-headR * 2.4} 0 ${-headR * 2.4} Z`}
        fill={color}
        stroke="rgba(0,0,0,0.45)"
        strokeWidth={1.1 * scale}
        filter="url(#sludo-pawn-shadow)"
      />
      <circle cx={0} cy={-headR * 2.35} r={headR} fill={color} stroke="rgba(255,255,255,0.5)" strokeWidth={1 * scale} />
      {imageUrl ? (
        <>
          <defs>
            <clipPath id={clipId}>
              <circle cx={0} cy={-headR * 2.35} r={headR * 0.92} />
            </clipPath>
          </defs>
          <image
            href={imageUrl}
            x={-headR * 0.92}
            y={-headR * 2.35 - headR * 0.92}
            width={headR * 1.84}
            height={headR * 1.84}
            clipPath={`url(#${clipId})`}
            preserveAspectRatio="xMidYMid slice"
          />
        </>
      ) : null}
    </g>
  );
}

export default function Sludo({ currentUser }) {
  const [gameState, setGameState] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [banner, setBanner] = useState('');
  const [diceSpinning, setDiceSpinning] = useState(false);
  const [diceValue, setDiceValue] = useState(1);
  const [rollPending, setRollPending] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [animOverride, setAnimOverride] = useState(null);
  const [openRooms, setOpenRooms] = useState([]);
  const [choicePulse, setChoicePulse] = useState(null);
  const [boardInner, setBoardInner] = useState(420);
  const [captureFlash, setCaptureFlash] = useState(null);

  const animTimerRef = useRef(null);
  const turnDelayRef = useRef(null);
  const spinStartRef = useRef(0);

  const myUserId = currentUser?.userId || currentUser?.id;
  const pad = getPad(boardInner);
  const svgSize = boardInner + pad * 2 + 10;
  const CX = svgSize / 2;
  const CY = svgSize / 2;
  const R = boardInner * 0.3;

  useEffect(() => {
    const measure = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 900;
      const h = typeof window !== 'undefined' ? window.innerHeight : 800;
      const cap = w >= 1024 ? 520 : w >= 768 ? 460 : 340;
      const maxH = Math.max(280, h - 200);
      setBoardInner(Math.min(cap, maxH));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const stopTimers = useCallback(() => {
    if (animTimerRef.current != null) {
      clearTimeout(animTimerRef.current);
      animTimerRef.current = null;
    }
    if (turnDelayRef.current) {
      clearTimeout(turnDelayRef.current);
      turnDelayRef.current = null;
    }
    setCaptureFlash(null);
  }, []);

  useEffect(() => {
    if (currentUser?.token) reconnectSocket();
  }, [currentUser?.token]);

  useEffect(() => {
    if (!currentUser?.token || gameState) return undefined;

    const requestList = () => socket.emit('ludo:listOpenRooms');
    const onList = ({ rooms }) => setOpenRooms(Array.isArray(rooms) ? rooms : []);
    const onRefresh = () => requestList();

    socket.on('ludo:openRooms', onList);
    socket.on('ludo:openRoomsRefresh', onRefresh);
    requestList();
    const interval = setInterval(requestList, 8000);

    return () => {
      socket.off('ludo:openRooms', onList);
      socket.off('ludo:openRoomsRefresh', onRefresh);
      clearInterval(interval);
    };
  }, [currentUser?.token, gameState]);

  useEffect(() => {
    const runPathAnimation = (payload) => {
      const path = payload.path || [];
      if (payload.type === 'pass' || path.length === 0) {
        setAnimOverride(null);
        setAnimating(false);
        setChoicePulse(null);
        setGameState(payload.state);
        return;
      }

      const pi = payload.playerIndex;
      const ti = payload.tokenIndex;
      let v = payload.moveFrom;
      if (v === undefined || v === null) v = YARD;

      setAnimating(true);
      setAnimOverride({ playerIndex: pi, tokenIndex: ti, value: v });

      let step = 0;

      const finish = () => {
        animTimerRef.current = null;
        setAnimOverride(null);
        setAnimating(false);
        setChoicePulse(null);
        setGameState(payload.state);
        if (payload.gameOver) playBlip(880, 0.14);
        else if (payload.captures?.length) playBlip(180, 0.1);
      };

      const tick = () => {
        if (step >= path.length) {
          finish();
          return;
        }
        const seg = path[step];
        v = pathValueAfterSegment(v, seg);
        setAnimOverride({ playerIndex: pi, tokenIndex: ti, value: v });
        if (seg.kind === 'track' || seg.kind === 'yardOut') playBlip(400 + step * 12, 0.035);
        if (seg.kind === 'home' || seg.kind === 'enterHome') playBlip(560, 0.04);
        if (seg.kind === 'finish') playBlip(720, 0.08);
        step += 1;
        animTimerRef.current = setTimeout(tick, seg.kind === 'yardOut' ? 220 : 115);
      };

      animTimerRef.current = setTimeout(tick, 80);
    };

    const onJoined = ({ state }) => {
      setGameState(state);
      setError('');
    };
    const onState = (state) => {
      setGameState(state);
    };

    const onChoose = (payload) => {
      stopTimers();
      setRollPending(false);
      setDiceSpinning(false);
      setDiceValue(payload.roll);
      setGameState(payload.state);
      setChoicePulse({
        playerIndex: payload.playerIndex,
        options: (payload.options || []).map((o) => o.tokenIndex),
        roll: payload.roll,
      });
      playBlip(480, 0.05);
    };

    const onTurn = (payload) => {
      stopTimers();
      setRollPending(false);
      setChoicePulse(null);

      const settle = () => {
        setDiceValue(payload.roll);
        setDiceSpinning(false);
        playBlip(380 + payload.roll * 35, 0.05);
        if (payload.captures?.length) {
          setCaptureFlash(payload.captures);
          setTimeout(() => setCaptureFlash(null), 900);
        }
        runPathAnimation(payload);
      };

      const minSpin = 1000;
      const elapsed = Date.now() - spinStartRef.current;
      const wait = Math.max(0, minSpin - elapsed);
      if (wait > 0) turnDelayRef.current = setTimeout(settle, wait);
      else settle();
    };

    const onErr = ({ message }) => {
      stopTimers();
      setDiceSpinning(false);
      setRollPending(false);
      setChoicePulse(null);
      setError(message || 'Something went wrong.');
    };

    const onLeft = () => {
      setGameState(null);
      setBanner('You left the room.');
      setChoicePulse(null);
    };

    socket.on('ludo:joined', onJoined);
    socket.on('ludo:state', onState);
    socket.on('ludo:turnResult', onTurn);
    socket.on('ludo:choosePiece', onChoose);
    socket.on('ludo:error', onErr);
    socket.on('ludo:left', onLeft);

    return () => {
      socket.off('ludo:joined', onJoined);
      socket.off('ludo:state', onState);
      socket.off('ludo:turnResult', onTurn);
      socket.off('ludo:choosePiece', onChoose);
      socket.off('ludo:error', onErr);
      socket.off('ludo:left', onLeft);
      stopTimers();
      socket.emit('ludo:leaveRoom');
    };
  }, [stopTimers]);

  const createRoom = () => {
    setError('');
    setBanner('');
    socket.emit('ludo:createRoom');
  };

  const joinRoom = () => {
    setError('');
    setBanner('');
    socket.emit('ludo:joinRoom', { code: joinCode.trim() });
  };

  const joinOpenRoom = (code) => {
    const c = String(code || '').toUpperCase().trim();
    if (c.length !== 6) return;
    setError('');
    setBanner('');
    setJoinCode(c);
    socket.emit('ludo:joinRoom', { code: c });
  };

  const startGame = () => {
    setError('');
    socket.emit('ludo:startGame');
  };

  const roll = () => {
    setError('');
    spinStartRef.current = Date.now();
    setRollPending(true);
    setDiceSpinning(true);
    socket.emit('ludo:roll');
  };

  const selectPiece = (tokenIndex) => {
    setError('');
    socket.emit('ludo:selectPiece', { tokenIndex });
  };

  const rematch = () => {
    setError('');
    socket.emit('ludo:rematch');
  };

  const leave = () => {
    socket.emit('ludo:leaveRoom');
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

  const displayTokenValue = (pi, ti) => {
    if (animOverride && animOverride.playerIndex === pi && animOverride.tokenIndex === ti) {
      return animOverride.value;
    }
    return gameState?.players[pi]?.tokens?.[ti] ?? YARD;
  };

  const pawnScale = Math.max(0.85, Math.min(1.35, boardInner / 380));

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#070a12] flex flex-col items-center justify-center px-4 font-[Syne,sans-serif]">
        <Helmet>
          <title>Sludo — Aquads Game Hub</title>
          <link rel="canonical" href="https://www.aquads.xyz/games/sludo" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800&family=Syne:wght@500;700&display=swap" rel="stylesheet" />
        </Helmet>
        <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/90 p-8 max-w-md text-center text-slate-200 shadow-[0_0_40px_rgba(34,211,238,0.15)]">
          <p className="mb-6 leading-relaxed text-sm">
            Log in to play Sludo — classic Ludo-style pawns on a neon board. Server-fair dice and moves.
          </p>
          <Link
            to="/games"
            className="inline-block rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-5 py-3 text-sm font-bold text-slate-950"
          >
            ← Game Hub
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`text-slate-100 overflow-x-hidden relative ${gameState ? 'min-h-0 h-[100dvh] flex flex-col overflow-hidden' : 'min-h-screen pb-12'}`}
      style={{ fontFamily: "'Syne', sans-serif" }}
    >
      <Helmet>
        <title>Sludo — Multiplayer | Aquads</title>
        <meta
          name="description"
          content="Sludo: Ludo-style board on Aquads — server dice, captures, home stretch, classic pawns. Fair multiplayer."
        />
        <link rel="canonical" href="https://www.aquads.xyz/games/sludo" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800&family=Syne:wght@500;700&display=swap" rel="stylesheet" />
      </Helmet>

      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(217,70,239,0.18),transparent_50%),radial-gradient(ellipse_at_80%_100%,rgba(34,211,238,0.16),transparent_45%),#070a12] -z-20" />
      <motion.div
        className="fixed inset-0 -z-10 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.06) 1px,transparent 1px)',
          backgroundSize: '48px 48px',
        }}
        animate={{ backgroundPosition: ['0 0', '48px 48px'] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
      />

      <nav className="relative z-10 flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:py-3 border-b border-white/10 bg-black/30 backdrop-blur-md shrink-0">
        <Link
          to="/games"
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-cyan-200 hover:bg-white/10"
        >
          ← Hub
        </Link>
        <h1 className="text-center flex-1 font-['Orbitron'] text-xs sm:text-sm tracking-[0.35em] text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 via-white to-cyan-300">
          SLUDO
        </h1>
        <span className="text-[10px] text-fuchsia-300/80 hidden sm:inline tracking-widest">4P · SYNC</span>
      </nav>

      <div className={`relative z-10 max-w-6xl mx-auto px-2 sm:px-4 w-full ${gameState ? 'flex-1 min-h-0 flex flex-col pt-2' : 'pt-6'}`}>
        {!gameState && (
          <p className="text-center text-xs sm:text-sm text-slate-400 mb-6 max-w-xl mx-auto leading-relaxed">
            <span className="text-cyan-300 font-semibold">Sludo</span> — race four pawns around the ring, bump rivals home on a lucky roll,
            and finish with exact counts in the core.
          </p>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/50 bg-red-950/60 text-red-100 px-3 py-2 text-xs shrink-0 mb-2">{error}</div>
        )}
        {banner && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/50 text-emerald-100 px-3 py-2 text-xs shrink-0 mb-2">{banner}</div>
        )}

        {!gameState ? (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-fuchsia-500/25 bg-slate-900/60 p-5 shadow-[0_0_32px_rgba(217,70,239,0.12)]"
              >
                <h2 className="font-['Orbitron'] text-xs tracking-widest text-fuchsia-200 mb-4">HOST</h2>
                <button
                  type="button"
                  onClick={createRoom}
                  className="w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-500 py-3 text-sm font-bold text-white shadow-lg shadow-fuchsia-900/40 hover:brightness-110"
                >
                  Create room
                </button>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-2xl border border-cyan-500/25 bg-slate-900/60 p-5 shadow-[0_0_32px_rgba(34,211,238,0.12)]"
              >
                <h2 className="font-['Orbitron'] text-xs tracking-widest text-cyan-200 mb-4">JOIN CODE</h2>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="CODE"
                  maxLength={6}
                  className="w-full mb-3 rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-slate-100 uppercase tracking-[0.35em] text-center"
                />
                <button
                  type="button"
                  onClick={joinRoom}
                  className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 py-3 text-sm font-bold text-slate-950 hover:brightness-110"
                >
                  Enter code
                </button>
              </motion.div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 className="font-['Orbitron'] text-xs tracking-widest text-slate-300">OPEN LOBBIES</h2>
                <button
                  type="button"
                  onClick={() => socket.emit('ludo:listOpenRooms')}
                  className="text-[10px] rounded-lg border border-white/15 px-2 py-1 hover:bg-white/5"
                >
                  Refresh
                </button>
              </div>
              {openRooms.length === 0 ? (
                <p className="text-slate-500 text-xs leading-relaxed">No open rooms — create one or check back shortly.</p>
              ) : (
                <ul className="space-y-2 max-h-[min(280px,45vh)] overflow-y-auto pr-1">
                  {openRooms.map((r) => (
                    <li
                      key={r.code}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-['Orbitron'] text-sm tracking-[0.2em] text-cyan-200">{r.code}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Host <span className="text-slate-300">{r.host}</span> · {r.players}/{r.max}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => joinOpenRoom(r.code)}
                        className="shrink-0 rounded-lg bg-cyan-500/20 border border-cyan-400/40 px-3 py-2 text-[10px] font-bold text-cyan-200 hover:bg-cyan-500/30"
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
          <div className="flex flex-col min-w-0 min-h-0 gap-2 flex-1">
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="font-['Orbitron'] text-[10px] sm:text-xs tracking-[0.25em] text-cyan-300 border border-cyan-500/40 rounded-lg px-2 py-1 bg-cyan-500/10">
                {gameState.code}
              </span>
              <button type="button" onClick={copyCode} className="text-[10px] rounded-lg border border-white/15 px-2 py-1 hover:bg-white/5">
                Copy
              </button>
              <button type="button" onClick={leave} className="text-[10px] rounded-lg border border-red-500/30 text-red-300 px-2 py-1 hover:bg-red-500/10">
                Leave
              </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0 items-stretch">
              <div className="flex-1 min-w-0 min-h-0 flex items-center justify-center overflow-hidden order-1">
                <motion.div
                  layout
                  className="relative rounded-3xl border border-white/10 bg-slate-900/40 shadow-[0_0_60px_rgba(34,211,238,0.08)] w-full max-h-full"
                  style={{
                    width: boardInner + pad * 2 + 10,
                    height: boardInner + pad * 2 + 10,
                    maxWidth: '100%',
                    maxHeight: 'min(100%, calc(100dvh - 7rem))',
                    aspectRatio: '1 / 1',
                  }}
                >
                  <svg
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${svgSize} ${svgSize}`}
                    className="block select-none"
                    aria-label="Sludo board"
                  >
                    <defs>
                      <filter id="sludo-pawn-shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodOpacity="0.35" />
                      </filter>
                      <radialGradient id="sludo-hub" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#1e293b" />
                        <stop offset="100%" stopColor="#0f172a" />
                      </radialGradient>
                    </defs>

                    <rect
                      x={4}
                      y={4}
                      width={svgSize - 8}
                      height={svgSize - 8}
                      rx={18}
                      fill="#0c1222"
                      stroke="rgba(34,211,238,0.2)"
                      strokeWidth={2}
                    />
                    <circle cx={CX} cy={CY} r={R + 16} fill="none" stroke="rgba(34,211,238,0.15)" strokeWidth={1} />
                    <circle cx={CX} cy={CY} r={R + 6} fill="none" stroke="rgba(244,114,182,0.2)" strokeWidth={1} strokeDasharray="5 9" />

                    {Array.from({ length: 52 }, (_, i) => {
                      const a = cellAngle(i);
                      const x = CX + R * Math.cos(a);
                      const y = CY + R * Math.sin(a);
                      const safe = SAFE_TRACK.has(i);
                      const isStart = START.includes(i);
                      const cr = safe ? 5.5 : 4.2;
                      return (
                        <g key={i}>
                          <circle
                            cx={x}
                            cy={y}
                            r={cr}
                            fill={
                              isStart ? 'rgba(244,114,182,0.4)' : safe ? 'rgba(250,204,21,0.28)' : 'rgba(148,163,184,0.14)'
                            }
                            stroke={isStart ? 'rgba(244,114,182,0.85)' : safe ? 'rgba(250,204,21,0.5)' : 'rgba(148,163,184,0.3)'}
                            strokeWidth={1}
                          />
                        </g>
                      );
                    })}

                    <circle cx={CX} cy={CY} r={28} fill="url(#sludo-hub)" stroke="rgba(34,211,238,0.4)" strokeWidth={2} />
                    <text
                      x={CX}
                      y={CY + 5}
                      textAnchor="middle"
                      fill="rgba(148,163,184,0.75)"
                      style={{ fontSize: 11, fontFamily: 'Orbitron, sans-serif' }}
                    >
                      CORE
                    </text>

                    <AnimatePresence>
                      {captureFlash &&
                        captureFlash.map((c, idx) => {
                          const { x, y } = tokenXY(c.playerIndex, YARD, c.tokenIndex, boardInner);
                          return (
                            <motion.circle
                              key={`cap-${c.playerIndex}-${c.tokenIndex}-${idx}`}
                              cx={x}
                              cy={y}
                              r={18 * pawnScale}
                              fill="none"
                              stroke="#fb7185"
                              strokeWidth={2}
                              initial={{ opacity: 0.95, scale: 0.4 }}
                              animate={{ opacity: 0, scale: 2.2 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.85 }}
                            />
                          );
                        })}
                    </AnimatePresence>

                    {gameState.players.map((pl, pi) =>
                      pl.tokens.map((t, ti) => {
                        const tv = displayTokenValue(pi, ti);
                        const { x, y } = tokenXY(pi, tv, ti, boardInner);
                        const img = playerImageUrl(pl.image);
                        const highlight =
                          choicePulse &&
                          choicePulse.playerIndex === pi &&
                          choicePulse.options.includes(ti) &&
                          myPlayerIndex === pi;
                        return (
                          <motion.g
                            key={`${pl.userId}-${ti}`}
                            initial={{ scale: 1 }}
                            animate={{ scale: [1, 1.06, 1] }}
                            transition={{ duration: 0.2 }}
                          >
                            <LudoPawn
                              cx={x}
                              cy={y}
                              scale={pawnScale}
                              color={pl.color}
                              imageUrl={img}
                              highlight={highlight}
                              pawnId={`${pl.userId}-${ti}`}
                              onClick={highlight ? () => selectPiece(ti) : undefined}
                            />
                          </motion.g>
                        );
                      })
                    )}
                  </svg>
                </motion.div>
              </div>

              <div className="w-full lg:w-[268px] shrink-0 flex flex-col gap-2 order-2">
                <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-3 space-y-2">
                  <h3 className="font-['Orbitron'] text-[10px] tracking-widest text-slate-400">PLAYERS</h3>
                  <ul className="space-y-2">
                    {gameState.players.map((p, i) => {
                      const turn = gameState.phase === 'playing' && gameState.currentTurnIndex === i;
                      const doneCount = p.tokens.filter((tk) => tk === DONE).length;
                      return (
                        <li
                          key={p.userId}
                          className={`flex items-center gap-2 rounded-xl px-2 py-2 border ${
                            turn ? 'border-cyan-400/50 bg-cyan-500/10' : 'border-white/5 bg-black/20'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_8px_currentColor]" style={{ backgroundColor: p.color }} />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold truncate">{p.username}</div>
                            <div className="text-[10px] text-slate-500">
                              Docked {doneCount}/4 {!p.connected && '· offline'}
                            </div>
                          </div>
                          {turn && <span className="text-[9px] text-cyan-300 font-['Orbitron']">TURN</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 flex flex-col items-center gap-3">
                  <DiceCube spinning={diceSpinning} value={diceValue} size={Math.min(76, boardInner * 0.16)} />
                  {gameState.phase === 'lobby' && isHost && (
                    <button
                      type="button"
                      onClick={startGame}
                      disabled={gameState.players.length < 2}
                      className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 py-2.5 text-xs font-bold disabled:opacity-40"
                    >
                      Start game
                    </button>
                  )}
                  {gameState.phase === 'playing' && isMyTurn && !gameState.awaitingChoice && !animating && (
                    <button
                      type="button"
                      onClick={roll}
                      disabled={rollPending}
                      className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 py-2.5 text-xs font-bold text-slate-900 disabled:opacity-50"
                    >
                      {rollPending ? 'Rolling…' : 'Roll dice'}
                    </button>
                  )}
                  {gameState.phase === 'playing' && choicePulse && myPlayerIndex === choicePulse.playerIndex && (
                    <p className="text-[10px] text-center text-cyan-200/90 leading-relaxed">
                      Rolled <span className="font-['Orbitron'] text-fuchsia-300">{choicePulse.roll}</span> — tap a highlighted pawn.
                    </p>
                  )}
                  {gameState.phase === 'finished' && (
                    <div className="text-center space-y-2 w-full">
                      <p className="text-xs text-fuchsia-200">
                        Winner:{' '}
                        <span className="font-bold text-white">{gameState.players[gameState.winnerIndex]?.username}</span>
                      </p>
                      {isHost && (
                        <button
                          type="button"
                          onClick={rematch}
                          className="w-full rounded-xl border border-cyan-400/40 bg-cyan-500/15 py-2 text-xs font-bold text-cyan-200"
                        >
                          Rematch
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-slate-500 leading-relaxed px-1">
                  Stars &amp; corners are safe. Stack two of your pieces to block captures. Six opens the yard or grants another roll after a
                  legal move.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
