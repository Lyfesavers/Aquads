import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { socket, reconnectSocket } from '../services/api';

/* Must match server/ludo.js — BR/TL starts aligned to cyan/purple corners. */
const START = [0, 39, 26, 13];
const YARD = -1;
const DONE = 200;
const SAFE_TRACK = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

/** Same order as server/ludo.js PLAYER_COLORS — used when a seat has no player yet (lobby / 2P). */
const PLAYER_COLOR_DEFAULTS = ['#ff2d6a', '#00e5ff', '#b8ff00', '#c44dff'];

const API_BASE = process.env.REACT_APP_API_URL || '';

function playerImageUrl(src) {
  if (!src) return null;
  if (src.startsWith('http') || src.startsWith('data:') || src.startsWith('blob:')) return src;
  if (src.startsWith('/')) return `${API_BASE}${src}`;
  return src;
}

const TOKEN_JITTER = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

/**
 * 15×15 cross board — outer track (52 cells) in clockwise order.
 * Independent layout for Sludo (Aquads); not copied from any branded board asset.
 */
const GRID = 15;

const TRACK_GRID_52 = [
  [14, 6],
  [13, 6],
  [12, 6],
  [11, 6],
  [10, 6],
  [9, 6],
  [8, 5],
  [8, 4],
  [8, 3],
  [8, 2],
  [8, 1],
  [8, 0],
  [7, 0],
  [6, 0],
  [6, 1],
  [6, 2],
  [6, 3],
  [6, 4],
  [6, 5],
  [5, 6],
  [4, 6],
  [3, 6],
  [2, 6],
  [1, 6],
  [0, 6],
  [0, 7],
  [0, 8],
  [1, 8],
  [2, 8],
  [3, 8],
  [4, 8],
  [5, 8],
  [6, 9],
  [6, 10],
  [6, 11],
  [6, 12],
  [6, 13],
  [6, 14],
  [7, 14],
  [8, 14],
  [8, 13],
  [8, 12],
  [8, 11],
  [8, 10],
  [8, 9],
  [9, 8],
  [10, 8],
  [11, 8],
  [12, 8],
  [13, 8],
  [14, 8],
  [14, 7],
];

/** Aligns server ring index 0 with the first seat’s entry square on this grid. */
const PATH_INDEX_OFFSET = 1;

function trackGridCell(serverTrackIndex) {
  return TRACK_GRID_52[(serverTrackIndex + PATH_INDEX_OFFSET) % 52];
}

/* Seat 0 BL, 1 BR, 2 TR, 3 TL — home stretch uses middle lane (row 7 / col 7); outer ring uses TRACK_GRID_52. */
const HOME_PATHS = [
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
];

const YARD_SLOTS = [
  [
    [11, 2],
    [11, 3],
    [12, 2],
    [12, 3],
  ],
  [
    [11, 11],
    [11, 12],
    [12, 11],
    [12, 12],
  ],
  [
    [2, 11],
    [2, 12],
    [3, 11],
    [3, 12],
  ],
  [
    [2, 2],
    [2, 3],
    [3, 2],
    [3, 3],
  ],
];

/** Center of the 2×2 pawn nest (SVG x = col + 0.5, y = row + 0.5). */
function yardNestCenter(pi) {
  const slots = YARD_SLOTS[pi] || [[7, 7]];
  let sx = 0;
  let sy = 0;
  for (const [r, c] of slots) {
    sx += c + 0.5;
    sy += r + 0.5;
  }
  const n = slots.length;
  return { cx: sx / n, cy: sy / n };
}

const YARD_DIAMOND_R = 1.38;

function yardOwner(r, c) {
  if (r < 6 && c < 6) return 3;
  if (r < 6 && c > 8) return 2;
  if (r > 8 && c > 8) return 1;
  if (r > 8 && c < 6) return 0;
  return -1;
}

function isCrossArm(r, c) {
  return (r >= 6 && r <= 8) || (c >= 6 && c <= 8);
}

function isCenter(r, c) {
  return r >= 6 && r <= 8 && c >= 6 && c <= 8;
}

/** Token position; track/home use cell indices + jitter — tokenVB adds 0.5 for center. Yard/DONE are already in viewBox coords. */
function tokenCell(pi, t, ti) {
  const [jx, jy] = TOKEN_JITTER[ti] || [0, 0];
  if (t === YARD) {
    const slot = YARD_SLOTS[pi]?.[ti] || [7, 7];
    return { r: slot[0] + 0.5 + jy * 0.1, c: slot[1] + 0.5 + jx * 0.1 };
  }
  if (t >= DONE) {
    const ang = (pi / 4) * Math.PI * 2 + ti * 0.55;
    return { r: 7.5 + Math.sin(ang) * 0.42, c: 7.5 + Math.cos(ang) * 0.42 };
  }
  if (t >= 100 && t <= 104) {
    const cell = HOME_PATHS[pi]?.[t - 100] || [7, 7];
    return { r: cell[0] + jy * 0.1, c: cell[1] + jx * 0.1 };
  }
  const [tr, tc] = trackGridCell(t);
  return { r: tr + jy * 0.14, c: tc + jx * 0.14 };
}

function tokenVB(pi, t, ti) {
  const p = tokenCell(pi, t, ti);
  if (t === YARD || t >= DONE) return { x: p.c, y: p.r };
  return { x: p.c + 0.5, y: p.r + 0.5 };
}

function nextTrackDir(serverI) {
  const [r0, c0] = trackGridCell(serverI);
  const [r1, c1] = trackGridCell((serverI + 1) % 52);
  return { dc: c1 - c0, dr: r1 - r0 };
}

function StartMarker({ gridR, gridC, dc, dr, color }) {
  const cx = gridC + 0.5;
  const cy = gridR + 0.5;
  const hyp = Math.hypot(dc, dr) || 1;
  const nx = dc / hyp;
  const ny = dr / hyp;
  const ax = cx + nx * 0.28;
  const ay = cy + ny * 0.28;
  const bx = cx - nx * 0.2;
  const by = cy - ny * 0.2;
  const wx = -ny * 0.16;
  const wy = nx * 0.16;
  const points = `${ax},${ay} ${bx + wx},${by + wy} ${bx - wx},${by - wy}`;
  return (
    <polygon points={points} fill={color} fillOpacity={0.92} stroke="rgba(0,0,0,0.4)" strokeWidth={0.025} pointerEvents="none" />
  );
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

function SludoWinnerCelebration({ open, winnerName, winnerColor, winnerImageUrl, youWon, isHost, onRematch }) {
  const confetti = useMemo(
    () =>
      Array.from({ length: 56 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.55,
        duration: 2.4 + Math.random() * 1.4,
        hue: [330, 185, 88, 275][i % 4],
        w: 5 + Math.random() * 7,
        rot: Math.random() * 360,
      })),
    []
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sludo-winner-overlay"
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
        >
          <motion.div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            aria-hidden
          />
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
            {confetti.map((c) => (
              <motion.div
                key={c.id}
                className="absolute rounded-[2px] -top-3"
                style={{
                  left: `${c.x}%`,
                  width: c.w,
                  height: c.w * 1.35,
                  backgroundColor: `hsl(${c.hue} 82% 58%)`,
                  boxShadow: `0 0 14px hsl(${c.hue} 90% 52% / 0.45)`,
                }}
                initial={{ y: -24, rotate: c.rot, opacity: 0.92 }}
                animate={{
                  y: typeof window !== 'undefined' ? window.innerHeight + 48 : 820,
                  rotate: c.rot + 640,
                }}
                transition={{ duration: c.duration, delay: c.delay, repeat: Infinity, ease: 'linear', repeatDelay: 0 }}
              />
            ))}
          </div>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sludo-winner-title"
            className="relative w-full max-w-[min(22rem,100%)] rounded-3xl border border-white/20 bg-gradient-to-b from-slate-900/98 via-slate-950/98 to-black/95 px-7 py-9 text-center shadow-[0_0_60px_rgba(244,114,182,0.2),0_0_100px_rgba(34,211,238,0.12),inset_0_1px_0_rgba(255,255,255,0.08)]"
            initial={{ scale: 0.86, opacity: 0, y: 22 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          >
            <motion.div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-4xl shadow-[0_0_28px_rgba(255,255,255,0.12)]"
              style={{ boxShadow: `0 0 32px ${winnerColor}55` }}
              initial={{ rotate: -8, scale: 0.6 }}
              animate={{ rotate: [0, -6, 6, -4, 0], scale: 1 }}
              transition={{ duration: 0.55, delay: 0.12 }}
              aria-hidden
            >
              🏆
            </motion.div>
            <p className="font-['Orbitron'] text-[10px] tracking-[0.35em] text-cyan-300/90 mb-2">GAME OVER</p>
            <h2 id="sludo-winner-title" className="font-['Orbitron'] text-xl sm:text-2xl font-bold text-white tracking-tight mb-4">
              {winnerName}
            </h2>
            {winnerImageUrl ? (
              <div className="mx-auto mb-4 h-16 w-16 overflow-hidden rounded-full border-2 border-white/25 shadow-lg" style={{ borderColor: `${winnerColor}aa` }}>
                <img src={winnerImageUrl} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div
                className="mx-auto mb-4 h-3 w-28 rounded-full opacity-90"
                style={{
                  background: `linear-gradient(90deg, transparent, ${winnerColor}, transparent)`,
                  boxShadow: `0 0 20px ${winnerColor}66`,
                }}
                aria-hidden
              />
            )}
            <p className="text-sm text-fuchsia-200/95 mb-6">
              {youWon ? 'You cleared the core — stellar run!' : 'Wins the round — all four pawns docked.'}
            </p>
            {isHost ? (
              <button
                type="button"
                onClick={onRematch}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 py-3 text-sm font-bold text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.35)] hover:brightness-110 active:scale-[0.98] transition"
              >
                Run it back — rematch
              </button>
            ) : (
              <p className="text-xs text-slate-500">Host can start a rematch for everyone.</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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

/** Classic Ludo-style pawn in viewBox coordinates (~1 cell tall). */
function LudoPawn({ cx, cy, color, imageUrl, highlight, onClick, pawnId }) {
  const headR = 0.2;
  const clipId = `sludo-av-${pawnId}`;
  return (
    <g
      transform={`translate(${cx}, ${cy})`}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      {highlight && (
        <motion.circle
          r={headR * 2.5}
          fill="none"
          stroke="rgba(34,211,238,0.95)"
          strokeWidth={0.06}
          initial={{ opacity: 0.6 }}
          animate={{ opacity: [0.5, 1, 0.5], r: [headR * 2.2, headR * 2.75, headR * 2.2] }}
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
        strokeWidth={0.035}
        filter="url(#sludo-pawn-shadow)"
      />
      <circle cx={0} cy={-headR * 2.35} r={headR} fill={color} stroke="rgba(255,255,255,0.5)" strokeWidth={0.03} />
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
  const [vsCpuCount, setVsCpuCount] = useState(1);

  const animTimerRef = useRef(null);
  const turnDelayRef = useRef(null);
  const spinStartRef = useRef(0);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const myUserId = currentUser?.userId || currentUser?.id;

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

  // After token refresh or network reconnect, server drops socket.id — re-bind to the same room.
  useEffect(() => {
    if (!currentUser?.token) return undefined;

    const rejoinIfInRoom = () => {
      const gs = gameStateRef.current;
      if (!gs?.code) return;
      const code = String(gs.code)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 8);
      if (code.length !== 6) return;
      socket.emit('ludo:joinRoom', { code });
    };

    socket.on('connect', rejoinIfInRoom);
    socket.io.on('reconnect', rejoinIfInRoom);

    return () => {
      socket.off('connect', rejoinIfInRoom);
      socket.io.off('reconnect', rejoinIfInRoom);
    };
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

      const isCpuActor = payload.state?.players?.[payload.playerIndex]?.isCpu;
      const minSpin = isCpuActor ? 380 : 1000;
      const elapsed = Date.now() - spinStartRef.current;
      const wait = Math.max(0, minSpin - elapsed);
      if (isCpuActor) setDiceSpinning(true);
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

  const createVsCpuRoom = () => {
    setError('');
    setBanner('');
    const n = Math.min(3, Math.max(1, Number(vsCpuCount) || 1));
    socket.emit('ludo:createVsCpuRoom', { cpuCount: n });
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

  const players = gameState?.players || [];
  const seatColor = (pi) => players[pi]?.color || PLAYER_COLOR_DEFAULTS[pi % 4];

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

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="mt-4 rounded-2xl border border-violet-500/30 bg-slate-900/60 p-5 shadow-[0_0_32px_rgba(139,92,246,0.14)]"
            >
              <h2 className="font-['Orbitron'] text-xs tracking-widest text-violet-200 mb-2">VS COMPUTER</h2>
              <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                Fill the table with computer players — you take one corner, they take the rest. Same rules and server-fair dice.
              </p>
              <div className="mb-3">
                <p className="text-[10px] text-slate-500 mb-1.5 tracking-wide">CPU opponents</p>
                <div className="flex rounded-xl border border-white/10 overflow-hidden bg-black/30">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setVsCpuCount(n)}
                      className={`flex-1 py-2 text-xs font-bold transition ${
                        vsCpuCount === n
                          ? 'bg-violet-600/90 text-white'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">
                  {vsCpuCount === 1 ? '1v1' : vsCpuCount === 2 ? 'You + 2 CPUs (3 players)' : 'You + 3 CPUs (full 4)'}
                </p>
              </div>
              <button
                type="button"
                onClick={createVsCpuRoom}
                className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 py-3 text-sm font-bold text-white shadow-lg shadow-violet-900/35 hover:brightness-110"
              >
                Start vs {vsCpuCount} computer{vsCpuCount > 1 ? 's' : ''}
              </button>
            </motion.div>

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
              {gameState.vsCpu && (
                <span className="font-['Orbitron'] text-[9px] tracking-[0.2em] text-violet-200 border border-violet-500/40 rounded-lg px-2 py-1 bg-violet-500/15">
                  VS CPU
                </span>
              )}
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
                    width: boardInner + 16,
                    height: boardInner + 16,
                    maxWidth: '100%',
                    maxHeight: 'min(100%, calc(100dvh - 7rem))',
                    aspectRatio: '1 / 1',
                  }}
                >
                  <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 15 15"
                    className="block select-none"
                    aria-label="Sludo board"
                  >
                    <defs>
                      <filter id="sludo-pawn-shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="0.03" stdDeviation="0.04" floodOpacity="0.35" />
                      </filter>
                      <linearGradient id="sludo-pyramid-t" gradientUnits="userSpaceOnUse" x1="7.5" y1="6" x2="7.5" y2="7.5">
                        <stop offset="0%" stopColor={seatColor(2)} stopOpacity={0.95} />
                        <stop offset="45%" stopColor={seatColor(2)} stopOpacity={0.78} />
                        <stop offset="100%" stopColor={seatColor(2)} stopOpacity={0.42} />
                      </linearGradient>
                      <linearGradient id="sludo-pyramid-r" gradientUnits="userSpaceOnUse" x1="9" y1="7.5" x2="7.5" y2="7.5">
                        <stop offset="0%" stopColor={seatColor(1)} stopOpacity={0.95} />
                        <stop offset="45%" stopColor={seatColor(1)} stopOpacity={0.78} />
                        <stop offset="100%" stopColor={seatColor(1)} stopOpacity={0.42} />
                      </linearGradient>
                      <linearGradient id="sludo-pyramid-b" gradientUnits="userSpaceOnUse" x1="7.5" y1="9" x2="7.5" y2="7.5">
                        <stop offset="0%" stopColor={seatColor(0)} stopOpacity={0.95} />
                        <stop offset="45%" stopColor={seatColor(0)} stopOpacity={0.78} />
                        <stop offset="100%" stopColor={seatColor(0)} stopOpacity={0.42} />
                      </linearGradient>
                      <linearGradient id="sludo-pyramid-l" gradientUnits="userSpaceOnUse" x1="6" y1="7.5" x2="7.5" y2="7.5">
                        <stop offset="0%" stopColor={seatColor(3)} stopOpacity={0.95} />
                        <stop offset="45%" stopColor={seatColor(3)} stopOpacity={0.78} />
                        <stop offset="100%" stopColor={seatColor(3)} stopOpacity={0.42} />
                      </linearGradient>
                    </defs>

                    <rect
                      x="0"
                      y="0"
                      width="15"
                      height="15"
                      rx="0.28"
                      fill="#0a1610"
                      stroke="rgba(34,211,238,0.22)"
                      strokeWidth="0.07"
                    />

                    {Array.from({ length: GRID }, (_, r) =>
                      Array.from({ length: GRID }, (_, c) => {
                        if (isCenter(r, c)) return null;
                        const yo = yardOwner(r, c);
                        const cream = '#f4efe6';
                        const field = '#123d28';
                        if (yo >= 0) {
                          const col = seatColor(yo);
                          return (
                            <rect
                              key={`bg-${r}-${c}`}
                              x={c}
                              y={r}
                              width={1}
                              height={1}
                              fill={col}
                              fillOpacity={0.52}
                            />
                          );
                        }
                        if (isCrossArm(r, c)) {
                          return <rect key={`bg-${r}-${c}`} x={c} y={r} width={1} height={1} fill={cream} />;
                        }
                        return <rect key={`bg-${r}-${c}`} x={c} y={r} width={1} height={1} fill={field} />;
                      })
                    )}

                    {[0, 1, 2, 3].map((pi) =>
                      (HOME_PATHS[pi] || []).map(([hr, hc], i) => (
                        <rect
                          key={`home-${pi}-${i}`}
                          x={hc}
                          y={hr}
                          width={1}
                          height={1}
                          fill={seatColor(pi)}
                          fillOpacity={0.34}
                        />
                      ))
                    )}

                    {Array.from({ length: GRID + 1 }, (_, i) => (
                      <React.Fragment key={`grid-${i}`}>
                        <line x1={i} y1={0} x2={i} y2={15} stroke="rgba(0,0,0,0.42)" strokeWidth={0.035} />
                        <line x1={0} y1={i} x2={15} y2={i} stroke="rgba(0,0,0,0.42)" strokeWidth={0.035} />
                      </React.Fragment>
                    ))}

                    <path
                      d="M 6 6 L 9 6 L 7.5 7.5 Z"
                      fill="url(#sludo-pyramid-t)"
                      stroke="rgba(255,255,255,0.16)"
                      strokeWidth={0.035}
                      strokeLinejoin="round"
                    />
                    <path
                      d="M 9 6 L 9 9 L 7.5 7.5 Z"
                      fill="url(#sludo-pyramid-r)"
                      stroke="rgba(255,255,255,0.16)"
                      strokeWidth={0.035}
                      strokeLinejoin="round"
                    />
                    <path
                      d="M 9 9 L 6 9 L 7.5 7.5 Z"
                      fill="url(#sludo-pyramid-b)"
                      stroke="rgba(255,255,255,0.16)"
                      strokeWidth={0.035}
                      strokeLinejoin="round"
                    />
                    <path
                      d="M 6 9 L 6 6 L 7.5 7.5 Z"
                      fill="url(#sludo-pyramid-l)"
                      stroke="rgba(255,255,255,0.16)"
                      strokeWidth={0.035}
                      strokeLinejoin="round"
                    />

                    {[3, 2, 1, 0].map((seat) => {
                      const { cx, cy } = yardNestCenter(seat);
                      const R = YARD_DIAMOND_R;
                      return (
                        <polygon
                          key={`nest-dia-${seat}`}
                          points={`${cx},${cy - R} ${cx + R},${cy} ${cx},${cy + R} ${cx - R},${cy}`}
                          fill="rgba(255,255,255,0.12)"
                          stroke={seatColor(seat)}
                          strokeOpacity={0.6}
                          strokeWidth={0.055}
                          pointerEvents="none"
                        />
                      );
                    })}

                    {YARD_SLOTS.flatMap((corner, pi) =>
                      corner.map(([yr, yc], idx) => (
                        <circle
                          key={`yd-${pi}-${idx}`}
                          cx={yc + 0.5}
                          cy={yr + 0.5}
                          r={0.19}
                          fill="rgba(255,255,255,0.18)"
                          stroke="rgba(0,0,0,0.28)"
                          strokeWidth={0.02}
                          pointerEvents="none"
                        />
                      ))
                    )}

                    {[...SAFE_TRACK].map((ti) => {
                      const [tr, tc] = trackGridCell(ti);
                      return (
                        <text
                          key={`safe-${ti}`}
                          x={tc + 0.5}
                          y={tr + 0.62}
                          textAnchor="middle"
                          fill="#ca8a04"
                          fontSize={0.52}
                          fontFamily="system-ui,sans-serif"
                          pointerEvents="none"
                          aria-hidden
                        >
                          ★
                        </text>
                      );
                    })}

                    {[0, 1, 2, 3].map((p) => {
                      const [sr, sc] = trackGridCell(START[p]);
                      const { dc, dr } = nextTrackDir(START[p]);
                      return (
                        <StartMarker
                          key={`st-${p}`}
                          gridR={sr}
                          gridC={sc}
                          dc={dc}
                          dr={dr}
                          color={seatColor(p)}
                        />
                      );
                    })}

                    <text
                      x={7.5}
                      y={7.62}
                      textAnchor="middle"
                      fill="rgba(148,163,184,0.5)"
                      fontSize={0.36}
                      fontFamily="Orbitron, sans-serif"
                      pointerEvents="none"
                    >
                      CORE
                    </text>

                    <AnimatePresence>
                      {captureFlash &&
                        captureFlash.map((c, idx) => {
                          const { x, y } = tokenVB(c.playerIndex, YARD, c.tokenIndex);
                          return (
                            <motion.circle
                              key={`cap-${c.playerIndex}-${c.tokenIndex}-${idx}`}
                              cx={x}
                              cy={y}
                              r={0.38}
                              fill="none"
                              stroke="#fb7185"
                              strokeWidth={0.06}
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
                        const { x, y } = tokenVB(pi, tv, ti);
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
                            <div className="text-xs font-semibold truncate">{p.isCpu ? '🤖 ' : ''}{p.username}</div>
                            <div className="text-[10px] text-slate-500">
                              Docked {doneCount}/4
                              {p.isCpu ? ' · AI' : ''}
                              {!p.connected && !p.isCpu ? ' · offline' : ''}
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
                  {gameState.phase === 'playing' &&
                    gameState.players[gameState.currentTurnIndex]?.isCpu &&
                    !animating && (
                      <p className="text-[10px] text-center text-violet-200/90 leading-relaxed">Computer is rolling…</p>
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

            <SludoWinnerCelebration
              open={gameState.phase === 'finished' && gameState.winnerIndex != null}
              winnerName={gameState.players[gameState.winnerIndex]?.username ?? 'Winner'}
              winnerColor={gameState.players[gameState.winnerIndex]?.color ?? '#e2e8f0'}
              winnerImageUrl={playerImageUrl(gameState.players[gameState.winnerIndex]?.image)}
              youWon={myPlayerIndex >= 0 && myPlayerIndex === gameState.winnerIndex}
              isHost={isHost}
              onRematch={rematch}
            />
          </div>
        )}
      </div>
    </div>
  );
}
