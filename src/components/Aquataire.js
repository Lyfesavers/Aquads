import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import {
  socket,
  reconnectSocket,
  aquataireNewGame,
  aquataireGetActive,
  aquataireAction,
  aquataireUndo,
  aquataireHint,
  aquataireAbandon,
  aquataireDailyStatus,
  aquataireLeaderboard,
} from '../services/api';
import './Aquataire.css';

/**
 * Aquataire — server-authoritative Klondike Solitaire for Aquads.
 *
 * Anti-cheat: the server owns the deck, the timer, scoring, and move validation.
 * The client only ever sees face-up cards; face-down stock and tableau cards arrive
 * as `{ faceUp: false }` (no rank/suit). Wins are recorded automatically when the
 * server detects the foundations are full.
 *
 * Layout: takes the entire viewport (100dvh) like a native game — no scrolling
 * outside the board. Cards auto-fit via ResizeObserver. Leaderboard becomes a
 * bottom-sheet on mobile.
 */

const SUIT_SYMBOL = { s: '♠', h: '♥', d: '♦', c: '♣' };
const SUIT_COLOR = { s: 'black', h: 'red', d: 'red', c: 'black' };
const RANK_LABEL = {
  1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K',
};
const FOUNDATION_ORDER = ['s', 'h', 'd', 'c'];
const MODES = [
  { id: 'klondike-d1', label: 'Klondike',        drawCount: 1, daily: false },
  { id: 'daily',       label: 'Daily',           drawCount: 1, daily: true  },
];
const DRAG_THRESHOLD = 5;

const fmtTime = (sec) => {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${String(ss).padStart(2, '0')}`;
};

// ----- pure-client validators (mirror server; only used for click auto-move + drop highlight) -----

const isRedSuit = (suit) => suit === 'h' || suit === 'd';
const colorOf = (card) => (isRedSuit(card.suit) ? 'red' : 'black');
const canStackOnTableau = (card, target) => {
  if (!target) return card.rank === 13;
  if (!target.faceUp) return false;
  return colorOf(card) !== colorOf(target) && card.rank === target.rank - 1;
};
const canPlaceOnFoundation = (card, pile) => {
  if (!pile || pile.length === 0) return card.rank === 1;
  const t = pile[pile.length - 1];
  return card.suit === t.suit && card.rank === t.rank + 1;
};
const isValidTableauRun = (cards) => {
  for (const c of cards) if (!c.faceUp) return false;
  for (let i = 0; i < cards.length - 1; i++) {
    if (colorOf(cards[i]) === colorOf(cards[i + 1])) return false;
    if (cards[i].rank !== cards[i + 1].rank + 1) return false;
  }
  return true;
};

// ----- sound engine (Web Audio synth) -----

class SfxEngine {
  constructor() { this.ctx = null; this.enabled = true; this._noiseBuf = null; }
  setEnabled(on) { this.enabled = !!on; }
  ensure() {
    if (this.ctx) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) this.ctx = new Ctx();
    } catch (_) { this.ctx = null; }
  }
  // Lazily build a 1-second white-noise buffer the cardlike shuffle/flip
  // sounds reuse. Filtered noise sounds way more like cards than oscillators.
  _noise() {
    if (!this.ctx) return null;
    if (this._noiseBuf) return this._noiseBuf;
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, sr, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this._noiseBuf = buf;
    return buf;
  }
  blip(freq, dur = 0.06, type = 'triangle', vol = 0.08) {
    if (!this.enabled) return;
    this.ensure();
    if (!this.ctx) return;
    try {
      const t0 = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur);
    } catch (_) {}
  }
  // Short bandpass-filtered noise burst — emulates one card flick.
  _noiseClick(when, dur = 0.035, centerHz = 2200, q = 1.2, vol = 0.18) {
    if (!this.enabled) return;
    this.ensure();
    if (!this.ctx) return;
    const buf = this._noise();
    if (!buf) return;
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = false;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = centerHz;
      filter.Q.value = q;
      const gain = this.ctx.createGain();
      const t0 = when;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      const startOffset = Math.random() * (buf.duration - dur - 0.01);
      src.connect(filter).connect(gain).connect(this.ctx.destination);
      src.start(t0, Math.max(0, startOffset), dur + 0.02);
      src.stop(t0 + dur + 0.05);
    } catch (_) {}
  }
  flip()   { this.blip(680, 0.05, 'square',  0.05); }
  place()  { this.blip(440, 0.06, 'triangle', 0.08); }
  pickup() { this.blip(560, 0.04, 'sine',    0.06); }
  draw()   { this.blip(300, 0.05, 'square',  0.06); setTimeout(() => this.blip(380, 0.04, 'square', 0.05), 40); }
  found()  { this.blip(880, 0.08, 'triangle', 0.10); setTimeout(() => this.blip(1175, 0.08, 'triangle', 0.09), 60); }
  err()    { this.blip(140, 0.10, 'sawtooth', 0.06); }
  // Iconic riffle-shuffle "brrrrt": ~30 short filtered-noise clicks ramping
  // up and tapering off, followed by a soft "thwap" as the deck squares up.
  shuffle() {
    if (!this.enabled) return;
    this.ensure();
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const totalDur = 0.55;
    const count = 30;
    for (let i = 0; i < count; i++) {
      const p = i / (count - 1);
      // accelerate slightly then slow down (riffle envelope)
      const time = t0 + p * totalDur + (Math.random() * 0.006 - 0.003);
      const env = Math.sin(p * Math.PI);
      const vol = 0.08 + env * 0.16;
      const center = 1800 + Math.random() * 1600;
      this._noiseClick(time, 0.02 + Math.random() * 0.02, center, 1.1, vol);
    }
    // squaring-up tap at the end
    this._noiseClick(t0 + totalDur + 0.02, 0.06, 600, 0.8, 0.18);
    this.blip(180, 0.08, 'sine', 0.08);
  }
  // Cards cascading down: rapid stream of mid-pitched flips fanning down.
  cascade() {
    if (!this.enabled) return;
    this.ensure();
    if (!this.ctx) return;
    const count = 26;
    for (let i = 0; i < count; i++) {
      const p = i / (count - 1);
      const delay = p * 900;
      const freq = 900 - p * 450 + (Math.random() * 80 - 40);
      const vol = 0.06 + (1 - p) * 0.05;
      setTimeout(() => this.blip(freq, 0.06, 'square', vol), delay);
    }
  }
  win() {
    this.shuffle();
    setTimeout(() => this.cascade(), 580);
    const notes = [523, 659, 784, 1047, 1319, 1568];
    notes.forEach((f, i) => setTimeout(() => this.blip(f, 0.18, 'triangle', 0.10), 620 + i * 90));
  }
}

// ----- subcomponents -----

function FaceCard({ card, hint, dim, onPointerDown, onDoubleClick, sourceDesc, top, draggable, dataIdx }) {
  const color = SUIT_COLOR[card.suit];
  const sym = SUIT_SYMBOL[card.suit];
  const rk = RANK_LABEL[card.rank];
  return (
    <div
      className={`aqt-card ${color}${hint ? ' hint-glow' : ''}${dim ? ' dim' : ''}`}
      style={{ top, zIndex: (dataIdx ?? 0) + 1 }}
      onPointerDown={draggable ? (e) => onPointerDown(e, sourceDesc) : undefined}
      onDoubleClick={onDoubleClick}
    >
      <div className="corner top">{rk}<span style={{ marginLeft: 2 }}>{sym}</span></div>
      <div className="center">{sym}</div>
      <div className="corner bottom">{rk}<span style={{ marginLeft: 2 }}>{sym}</span></div>
    </div>
  );
}

function FaceDownCard({ top, dataIdx }) {
  return (
    <div
      className="aqt-card facedown unflipped"
      style={{ top, zIndex: (dataIdx ?? 0) + 1 }}
    />
  );
}

function EmptySlot({ symbol }) {
  return <div className="aqt-pile-empty">{symbol || ''}</div>;
}

function LeaderboardPanel({
  leaderboard, lbMode, setLbMode, lbSort, setLbSort, currentUser,
}) {
  return (
    <>
      <div className="aqt-lb-tabs">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`aqt-lb-tab${lbMode === m.id ? ' active' : ''}`}
            onClick={() => setLbMode(m.id)}
          >{m.label}</button>
        ))}
      </div>
      <div className="aqt-lb-tabs">
        <button
          className={`aqt-lb-tab${lbSort === 'score' ? ' active' : ''}`}
          onClick={() => setLbSort('score')}
        >Top Score</button>
        <button
          className={`aqt-lb-tab${lbSort === 'time' ? ' active' : ''}`}
          onClick={() => setLbSort('time')}
        >Best Time</button>
      </div>
      {leaderboard.length === 0 ? (
        <div className="aqt-lb-empty">No wins yet — be the first.</div>
      ) : (
        <ul className="aqt-lb-list">
          {leaderboard.map((row, i) => {
            const isYou = currentUser && (
              String(row.userId) === String(currentUser.userId || currentUser._id || '')
              || row.username === currentUser.username
            );
            return (
              <li key={`${row.userId || i}-${i}`} className={`aqt-lb-row${isYou ? ' you' : ''}`}>
                <span className="aqt-lb-rank">{i + 1}</span>
                <span className="aqt-lb-name">{row.username}</span>
                <span className="aqt-lb-meta">{row.score} pts</span>
                <span className="aqt-lb-meta">{fmtTime(row.timeSec)}</span>
                <span className="aqt-lb-meta">
                  {row.moves != null ? `${row.moves} moves` : '—'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

// ----- main component -----

const Aquataire = ({ currentUser, onLogin, onCreateAccount }) => {
  const sfx = useRef(new SfxEngine()).current;
  const boardRef = useRef(null);
  const ghostLayerRef = useRef(null);
  // True while a POST /action (or undo) is on the wire. Prevents a second
  // request from racing the first — the server is the source of truth and
  // back-to-back fires (e.g. an over-eager double-click) used to land a stale
  // action that visually rolled the board back to a prior state.
  const inFlightRef = useRef(false);
  // Last auto-move {key,t} so a second click on the same source within ~400ms
  // is ignored (defends against react double-fire and rapid double-click).
  const lastAutoMoveRef = useRef({ key: '', t: 0 });

  const [gameId, setGameId] = useState(null);
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [mode, setMode] = useState('klondike-d1');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [hintMove, setHintMove] = useState(null);
  const [soundOn, setSoundOn] = useState(true);
  const [showWinModal, setShowWinModal] = useState(false);
  const [showLbSheet, setShowLbSheet] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dailyStatus, setDailyStatus] = useState(null);

  const [lbMode, setLbMode] = useState('klondike-d1');
  const [lbSort, setLbSort] = useState('score');
  const [leaderboard, setLeaderboard] = useState([]);

  // drag refs (do not trigger re-renders on every mousemove)
  const dragRef = useRef({
    active: false, starting: false,
    startX: 0, startY: 0,
    sourceDesc: null, cards: null,
    ghost: null, cardW: 78, cardH: 108,
    pointerId: null, sourceEl: null, dropTargetEl: null,
  });

  // ------ effects ------

  useEffect(() => { sfx.setEnabled(soundOn); }, [soundOn, sfx]);

  // lock body scroll while this page is mounted (so nothing behind us scrolls)
  useEffect(() => {
    const prev = {
      overflow: document.body.style.overflow,
      htmlOverflow: document.documentElement.style.overflow,
    };
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev.overflow;
      document.documentElement.style.overflow = prev.htmlOverflow;
    };
  }, []);

  // bootstrap: try resuming an active game; otherwise show "press a mode"
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!currentUser?.token) {
        setBootstrapping(false);
        return;
      }
      try { reconnectSocket(); } catch (_) {}
      try {
        const r = await aquataireGetActive();
        if (cancelled) return;
        if (r && r.gameId) {
          setGameId(r.gameId);
          setState(r.state);
          if (r.state.isDaily) setMode('daily');
          else setMode('klondike-d1');
          if (r.state.elapsedMs) setElapsedSec(Math.floor(r.state.elapsedMs / 1000));
        }
      } catch (_) {}
      try {
        const ds = await aquataireDailyStatus();
        if (!cancelled) setDailyStatus(ds);
      } catch (_) {}
      if (!cancelled) setBootstrapping(false);
    })();
    return () => { cancelled = true; };
  }, [currentUser?.token]);

  // local timer
  useEffect(() => {
    if (!state || state.status !== 'active') return undefined;
    const id = setInterval(() => setElapsedSec((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [state?.status]);

  // win modal
  useEffect(() => {
    if (state && state.won) {
      setShowWinModal(true);
      sfx.win();
    }
  }, [state?.won, sfx]);

  // leaderboard fetch
  const refetchLeaderboard = useCallback(async () => {
    try {
      const r = await aquataireLeaderboard({ mode: lbMode, sort: lbSort, limit: 25 });
      setLeaderboard(r.rows || []);
    } catch (_) {
      setLeaderboard([]);
    }
  }, [lbMode, lbSort]);

  useEffect(() => { refetchLeaderboard(); }, [refetchLeaderboard]);

  // socket: live leaderboard updates
  useEffect(() => {
    if (!socket) return undefined;
    const handler = (data) => {
      if (data && data.game === 'aquataire') refetchLeaderboard();
    };
    socket.on('leaderboardUpdated', handler);
    return () => { socket.off('leaderboardUpdated', handler); };
  }, [refetchLeaderboard]);

  // ----- ResizeObserver for auto-sized cards -----
  useEffect(() => {
    const board = boardRef.current;
    if (!board || !state) return undefined;

    const compute = () => {
      const rect = board.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w <= 0 || h <= 0) return;
      // padding inside .aqt-board (12px each side or 8px on mobile); use 24px to be safe.
      const padX = w < 600 ? 16 : 24;
      const padY = w < 600 ? 16 : 24;
      const innerW = w - padX;
      const innerH = h - padY;

      // gaps between piles
      const isSmall = w < 600;
      const gap = isSmall ? 5 : 6;

      // 7 columns
      const cardW_byWidth = (innerW - 6 * gap) / 7;

      // height: top row + gap + tableau row.
      // tableau row needs to allow ~6 face-up offsets visible in the tallest column.
      // We'll budget 1 card height + 7 face-up offsets.
      // face-up offset = 0.24 * card height = 0.24 * (cardW * 1.4) = 0.336 * cardW.
      // top row height = cardW * 1.4. Plus 12px gap.
      // total ≈ cardW * 1.4 + 12 + cardW * 1.4 + 7 * 0.336 * cardW
      //        = cardW * (1.4 + 1.4 + 2.352) + 12
      //        = cardW * 5.152 + 12
      const cardW_byHeight = (innerH - 12) / 5.15;

      const minSize = isSmall ? 36 : 50;
      const maxSize = 110;
      const cardW = Math.max(minSize, Math.min(cardW_byWidth, cardW_byHeight, maxSize));
      const cardH = cardW * 1.4;

      board.style.setProperty('--card-w', `${cardW}px`);
      board.style.setProperty('--card-h', `${cardH}px`);
      board.style.setProperty('--card-gap', `${gap}px`);
      board.style.setProperty('--face-down-offset', `${cardH * 0.13}px`);
      // face-up-offset is computed from card-h in CSS

      dragRef.current.cardW = cardW;
      dragRef.current.cardH = cardH;
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(board);
    window.addEventListener('orientationchange', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', compute);
    };
  }, [state]);

  // fullscreen API
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);
  const toggleFullscreen = useCallback(() => {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen && document.exitFullscreen();
      } else {
        const el = document.documentElement;
        if (el.requestFullscreen) el.requestFullscreen();
      }
    } catch (_) {}
  }, []);

  const showError = useCallback((msg) => {
    setErrorMsg(String(msg || 'Something went wrong'));
    setTimeout(() => setErrorMsg(''), 2400);
  }, []);

  // ------ actions ------

  const refreshFromServer = useCallback((res) => {
    if (!res) return;
    if (res.gameId) setGameId(res.gameId);
    if (res.state) {
      setState(res.state);
      if (typeof res.state.elapsedMs === 'number') {
        setElapsedSec(Math.floor(res.state.elapsedMs / 1000));
      }
    }
  }, []);

  const startNewGame = useCallback(async (modeId) => {
    if (!currentUser?.token) { onLogin && onLogin(); return; }
    const m = MODES.find((x) => x.id === modeId) || MODES[0];
    setLoading(true);
    setHintMove(null);
    setShowWinModal(false);
    try {
      const r = await aquataireNewGame({ drawCount: m.drawCount, daily: m.daily });
      refreshFromServer(r);
      sfx.shuffle();
      setMode(m.id);
      setLbMode(m.id);
      try { const ds = await aquataireDailyStatus(); setDailyStatus(ds); } catch (_) {}
    } catch (e) {
      if (e.status === 409) showError("Already finished today's Daily Challenge.");
      else showError(e.message || 'Failed to start game');
    } finally { setLoading(false); }
  }, [currentUser?.token, onLogin, refreshFromServer, sfx, showError]);

  const sendAction = useCallback(async (action, sfxKey = 'place') => {
    if (!gameId) return;
    // Drop the request entirely if one is already in flight. The server only
    // commits one move at a time anyway, and queuing a second click would just
    // race with whatever it produced.
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setHintMove(null);
    try {
      const r = await aquataireAction(gameId, action);
      refreshFromServer(r);
      if (r && r.won) sfx.win();
      else if (sfxKey && sfx[sfxKey]) sfx[sfxKey]();
    } catch (e) {
      sfx.err();
      showError(e.message || 'Illegal move');
      // Keep the board live: do NOT refetch on error. The previous "refetch
      // on error" path could read a stale snapshot mid-write and visually
      // roll the game back to a prior move. The server sometimes returns its
      // current authoritative state in the error body — use that if present.
      if (e && e.data && e.data.state) {
        refreshFromServer({ gameId: e.data.gameId || gameId, state: e.data.state });
      }
      // Otherwise we simply leave the existing UI state alone; the user can
      // continue playing from exactly where they were.
    } finally {
      inFlightRef.current = false;
    }
  }, [gameId, refreshFromServer, sfx, showError]);

  const undo = useCallback(async () => {
    if (!gameId) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const r = await aquataireUndo(gameId);
      refreshFromServer(r);
      sfx.flip();
    } catch (e) {
      showError(e.message || 'Nothing to undo');
      // Keep board live; if the server returned its current state in the
      // error body, rehydrate from that instead of a separate fetch.
      if (e && e.data && e.data.state) {
        refreshFromServer({ gameId: e.data.gameId || gameId, state: e.data.state });
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [gameId, refreshFromServer, sfx, showError]);

  const requestHint = useCallback(async () => {
    if (!gameId) return;
    try {
      const r = await aquataireHint(gameId);
      if (r && r.hint) {
        setHintMove(r.hint);
        setTimeout(() => setHintMove(null), 3500);
      } else {
        showError('No hint available — try drawing.');
      }
    } catch (e) { showError(e.message || 'Hint failed'); }
  }, [gameId, showError]);

  const abandon = useCallback(async () => {
    if (!gameId) return;
    if (!window.confirm('End this game? Your progress will be lost.')) return;
    try {
      await aquataireAbandon(gameId);
      setGameId(null);
      setState(null);
      setElapsedSec(0);
    } catch (e) { showError(e.message || 'Abandon failed'); }
  }, [gameId, showError]);

  const stockClick = useCallback(() => {
    if (!state) return;
    if (state.stockCount > 0) sendAction({ type: 'draw' }, 'draw');
    else if (state.wasteCount > 0) sendAction({ type: 'recycle' }, 'flip');
  }, [state, sendAction]);

  const autoMoveFromSource = useCallback((sourceDesc) => {
    if (!state) return;
    // Dedupe rapid double-fires on the same source (browser double-click,
    // pointerup+click both reaching us, etc.). 400ms is well below human
    // re-click threshold for "another move" but blocks the duplicate burst.
    const key = JSON.stringify(sourceDesc);
    const now = Date.now();
    if (lastAutoMoveRef.current.key === key && now - lastAutoMoveRef.current.t < 400) return;
    lastAutoMoveRef.current = { key, t: now };

    let card = null;
    if (sourceDesc.kind === 'waste') {
      const top = state.wasteTop[state.wasteTop.length - 1];
      if (top && top.faceUp) card = top;
    } else if (sourceDesc.kind === 'tableau') {
      const col = state.tableau[sourceDesc.col];
      const c = col[sourceDesc.idx];
      if (c && c.faceUp) card = c;
    } else if (sourceDesc.kind === 'foundation') {
      const pile = state.foundation[sourceDesc.suit];
      if (pile && pile.length) card = pile[pile.length - 1];
    }
    if (!card) return;

    // Pin the exact card id we think we're moving so the server can reject
    // stale duplicate requests instead of moving an unintended card.
    const fromWithId = { ...sourceDesc, cardId: card.id };

    let isTopmost = true;
    if (sourceDesc.kind === 'tableau') {
      const col = state.tableau[sourceDesc.col];
      isTopmost = sourceDesc.idx === col.length - 1;
    }
    if (isTopmost && canPlaceOnFoundation(card, state.foundation[card.suit])) {
      sendAction({ type: 'play', from: fromWithId, to: { kind: 'foundation', suit: card.suit } }, 'found');
      return;
    }
    let movingValid = true;
    if (sourceDesc.kind === 'tableau') {
      const col = state.tableau[sourceDesc.col];
      movingValid = isValidTableauRun(col.slice(sourceDesc.idx));
    }
    if (!movingValid) return;
    for (let to = 0; to < state.tableau.length; to++) {
      if (sourceDesc.kind === 'tableau' && sourceDesc.col === to) continue;
      const target = state.tableau[to][state.tableau[to].length - 1] || null;
      if (canStackOnTableau(card, target)) {
        sendAction({ type: 'play', from: fromWithId, to: { kind: 'tableau', col: to } }, 'place');
        return;
      }
    }
  }, [state, sendAction]);

  // ------ drag system ------

  const cleanupDrag = useCallback(() => {
    const d = dragRef.current;
    if (d.ghost && d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost);
    if (d.dropTargetEl) d.dropTargetEl.classList.remove('drop-ok', 'drop-bad');
    d.active = false; d.starting = false; d.sourceDesc = null;
    d.cards = null; d.ghost = null; d.dropTargetEl = null;
    if (d.sourceEl) {
      try {
        if (d.pointerId != null && d.sourceEl.releasePointerCapture) {
          d.sourceEl.releasePointerCapture(d.pointerId);
        }
      } catch (_) {}
      d.sourceEl = null;
    }
    d.pointerId = null;
  }, []);

  const buildGhost = useCallback((cards) => {
    if (!ghostLayerRef.current) return null;
    const wrap = document.createElement('div');
    wrap.className = 'aqt-ghost';
    const w = dragRef.current.cardW;
    const h = dragRef.current.cardH;
    const offset = h * 0.24;
    wrap.style.width = `${w}px`;
    wrap.style.height = `${h + (cards.length - 1) * offset}px`;
    cards.forEach((card, i) => {
      const div = document.createElement('div');
      div.className = `aqt-card ${SUIT_COLOR[card.suit]} dragging`;
      div.style.position = 'absolute';
      div.style.top = `${i * offset}px`;
      div.style.left = '0';
      div.style.width = `${w}px`;
      div.style.height = `${h}px`;
      div.innerHTML = `
        <div class="corner top">${RANK_LABEL[card.rank]} <span>${SUIT_SYMBOL[card.suit]}</span></div>
        <div class="center">${SUIT_SYMBOL[card.suit]}</div>
        <div class="corner bottom">${RANK_LABEL[card.rank]} <span>${SUIT_SYMBOL[card.suit]}</span></div>
      `;
      wrap.appendChild(div);
    });
    ghostLayerRef.current.appendChild(wrap);
    return wrap;
  }, []);

  const updateGhost = useCallback((x, y) => {
    const d = dragRef.current;
    if (!d.ghost) return;
    const layer = ghostLayerRef.current;
    if (!layer) return;
    const lr = layer.getBoundingClientRect();
    const w = d.cardW;
    const h = d.cardH;
    d.ghost.style.transform = `translate(${x - lr.left - w / 2}px, ${y - lr.top - h / 2}px)`;
  }, []);

  const findDropTarget = useCallback((x, y) => {
    let el = document.elementFromPoint(x, y);
    while (el && el !== document.body) {
      if (el.dataset && el.dataset.droppable === 'true') return el;
      el = el.parentElement;
    }
    return null;
  }, []);

  const dropTargetWouldAccept = useCallback((dropEl) => {
    if (!dropEl || !state) return false;
    const d = dragRef.current;
    if (!d.cards || d.cards.length === 0) return false;
    const head = d.cards[0];
    const kind = dropEl.dataset.kind;
    if (kind === 'tableau') {
      const col = Number(dropEl.dataset.col);
      const target = state.tableau[col][state.tableau[col].length - 1] || null;
      if (d.sourceDesc.kind === 'tableau' && d.sourceDesc.col === col) return false;
      return canStackOnTableau(head, target);
    }
    if (kind === 'foundation') {
      if (d.cards.length !== 1) return false;
      const suit = dropEl.dataset.suit;
      if (suit && suit !== head.suit) return false;
      return canPlaceOnFoundation(head, state.foundation[head.suit]);
    }
    return false;
  }, [state]);

  const onCardPointerDown = useCallback((e, sourceDesc) => {
    if (!state || state.status !== 'active') return;
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    const d = dragRef.current;
    d.starting = true;
    d.active = false;
    d.startX = e.clientX;
    d.startY = e.clientY;
    d.sourceDesc = sourceDesc;
    d.sourceEl = e.currentTarget;
    d.pointerId = e.pointerId;

    let cards = null;
    if (sourceDesc.kind === 'waste') {
      const t = state.wasteTop[state.wasteTop.length - 1];
      if (t && t.faceUp) cards = [t];
    } else if (sourceDesc.kind === 'tableau') {
      const col = state.tableau[sourceDesc.col];
      const run = col.slice(sourceDesc.idx).filter((c) => c.faceUp);
      if (run.length === col.length - sourceDesc.idx) cards = run;
    } else if (sourceDesc.kind === 'foundation') {
      const pile = state.foundation[sourceDesc.suit];
      if (pile && pile.length) cards = [pile[pile.length - 1]];
    }
    if (!cards || cards.length === 0) { d.starting = false; return; }
    d.cards = cards;

    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  }, [state]);

  const onBoardPointerMove = useCallback((e) => {
    const d = dragRef.current;
    if (!d.starting && !d.active) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.active) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      d.active = true;
      d.ghost = buildGhost(d.cards);
      sfx.pickup();
    }
    updateGhost(e.clientX, e.clientY);
    const target = findDropTarget(e.clientX, e.clientY);
    if (d.dropTargetEl && d.dropTargetEl !== target) {
      d.dropTargetEl.classList.remove('drop-ok', 'drop-bad');
    }
    d.dropTargetEl = target;
    if (target) {
      const ok = dropTargetWouldAccept(target);
      target.classList.remove('drop-ok', 'drop-bad');
      target.classList.add(ok ? 'drop-ok' : 'drop-bad');
    }
  }, [buildGhost, updateGhost, findDropTarget, dropTargetWouldAccept, sfx]);

  const onBoardPointerUp = useCallback((e) => {
    const d = dragRef.current;
    if (!d.starting && !d.active) return;
    if (!d.active) {
      const src = d.sourceDesc;
      cleanupDrag();
      if (src) autoMoveFromSource(src);
      return;
    }
    const target = findDropTarget(e.clientX, e.clientY);
    const sourceDesc = d.sourceDesc;
    const cards = d.cards;
    cleanupDrag();
    if (!target || !sourceDesc) return;
    const head = cards && cards[0];
    // Pin the card identity so the server can reject this request if the
    // source pile changed under us (stale duplicate from a held drag, etc.).
    const fromWithId = head ? { ...sourceDesc, cardId: head.id } : sourceDesc;
    const kind = target.dataset.kind;
    if (kind === 'tableau') {
      const col = Number(target.dataset.col);
      sendAction({ type: 'play', from: fromWithId, to: { kind: 'tableau', col } }, 'place');
    } else if (kind === 'foundation') {
      const suit = (target.dataset.suit) || (head && head.suit);
      sendAction({ type: 'play', from: fromWithId, to: { kind: 'foundation', suit } }, 'found');
    }
  }, [autoMoveFromSource, cleanupDrag, findDropTarget, sendAction]);

  // ------ rendering helpers ------

  // Compute per-card vertical offset for tableau columns. Squeezes spacing
  // when a column grows tall enough to overflow the available height — same
  // behaviour as Microsoft / FreeCell-style solitaire apps.
  const computeOffsets = useCallback((col) => {
    const cardH = dragRef.current.cardH || 100;
    const upStep = cardH * 0.24;
    const downStep = cardH * 0.13;
    const offs = [0];
    for (let i = 0; i < col.length - 1; i++) {
      offs.push(offs[i] + (col[i].faceUp ? upStep : downStep));
    }
    // Squeeze if needed
    const board = boardRef.current;
    const tableauRow = board && board.querySelector('.aqt-tableaurow');
    const pileH = tableauRow ? tableauRow.getBoundingClientRect().height : cardH * 5;
    const total = offs[offs.length - 1] + cardH;
    if (total > pileH && offs.length > 1) {
      const scale = Math.max(0.1, (pileH - cardH) / (total - cardH));
      for (let i = 1; i < offs.length; i++) offs[i] *= scale;
    }
    return offs;
  }, []);

  const isHinted = useCallback((sourceDesc) => {
    if (!hintMove) return false;
    if (hintMove.from && hintMove.from.kind === sourceDesc.kind) {
      if (sourceDesc.kind === 'tableau') {
        return hintMove.from.col === sourceDesc.col && hintMove.from.idx === sourceDesc.idx;
      }
      if (sourceDesc.kind === 'foundation') return hintMove.from.suit === sourceDesc.suit;
      if (sourceDesc.kind === 'waste') return true;
    }
    return false;
  }, [hintMove]);

  // ---- login gate ----
  if (!currentUser?.token) {
    return (
      <div className={`aqt-root${isFullscreen ? ' fullscreen' : ''}`}>
        <Helmet>
          <title>Aquataire — Aquads</title>
          <meta name="theme-color" content="#050b1c" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="description" content="Aquataire — Klondike Solitaire on Aquads with anti-cheat scoring and a global leaderboard." />
        </Helmet>
        <div className="aqt-login-gate">
          <div className="aqt-card-panel">
            <h2 className="aqt-title" style={{ marginBottom: 8, fontSize: 28 }}>Aquataire</h2>
            <p style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.5 }}>
              Klondike Solitaire with a real leaderboard. The server deals the cards and tracks the timer,
              so every score is earned. Sign in to play.
            </p>
            <div className="aqt-modal-actions" style={{ marginTop: 18 }}>
              <button className="aqt-btn primary" onClick={onLogin}>Log in</button>
              <button className="aqt-btn" onClick={onCreateAccount}>Create account</button>
              <Link to="/games" className="aqt-iconbtn" title="Back to games">←</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const dailyDone = dailyStatus && dailyStatus.played && dailyStatus.status === 'won';

  return (
    <div className={`aqt-root${isFullscreen ? ' fullscreen' : ''}`}>
      <Helmet>
        <title>Aquataire — Aquads</title>
        <meta name="theme-color" content="#050b1c" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="description" content="Aquataire — server-validated Klondike Solitaire on Aquads with daily challenge and live leaderboard." />
      </Helmet>

      {/* bubble background */}
      <div className="aqt-bubbles" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, i) => {
          const size = 18 + ((i * 13) % 60);
          const left = (i * 11) % 100;
          const dur = 14 + ((i * 3) % 18);
          const delay = (i * 1.8) % 12;
          return (
            <span
              key={i}
              className="aqt-bubble"
              style={{
                left: `${left}%`,
                width: size, height: size,
                animationDuration: `${dur}s`,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>

      {/* top bar */}
      <header className="aqt-topbar">
        <div className="aqt-topbar-left">
          <Link to="/games" className="aqt-iconbtn" title="Back to Game Hub" aria-label="Back to Game Hub">←</Link>
          <span className="aqt-title">Aquataire</span>
        </div>
        <div className="aqt-stats-inline">
          <span><span className="lbl">Time</span><span className="val">{fmtTime(elapsedSec)}</span></span>
          <span><span className="lbl">Score</span><span className="val">{state?.score ?? 0}</span></span>
          <span><span className="lbl">Moves</span><span className="val">{state?.moves ?? 0}</span></span>
        </div>
        <div className="aqt-topbar-right">
          <button
            className={`aqt-iconbtn${soundOn ? '' : ' off'}`}
            onClick={() => setSoundOn((v) => !v)}
            title={soundOn ? 'Mute sounds' : 'Enable sounds'}
            aria-label="toggle sound"
          >
            {soundOn ? '🔊' : '🔈'}
          </button>
          <button
            className="aqt-iconbtn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            aria-label="toggle fullscreen"
          >
            {isFullscreen ? '⤓' : '⛶'}
          </button>
        </div>
      </header>

      {/* mode tabs */}
      <nav className="aqt-modetabs">
        {MODES.map((m) => {
          const isActive = mode === m.id;
          const disabled = loading || (m.daily && dailyDone);
          return (
            <button
              key={m.id}
              className={`aqt-modebtn${isActive ? ' active' : ''}`}
              onClick={() => startNewGame(m.id)}
              disabled={disabled}
              title={m.daily && dailyDone ? "Today's Daily already won" : ''}
            >
              {m.label}{m.daily && dailyDone ? ' ✓' : ''}
            </button>
          );
        })}
      </nav>

      {/* main game area */}
      <main className="aqt-game">
        <div
          ref={boardRef}
          className="aqt-board"
          onPointerMove={onBoardPointerMove}
          onPointerUp={onBoardPointerUp}
          onPointerCancel={cleanupDrag}
        >
          {bootstrapping || !state ? (
            <div className="aqt-empty-state">
              <h3>{bootstrapping ? 'Loading…' : 'Ready when you are'}</h3>
              {!bootstrapping && (
                <>
                  <p>Pick a mode above to deal a new hand.</p>
                  <button className="aqt-btn primary" onClick={() => startNewGame(mode)}>
                    🃏 Deal Klondike
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              {/* top row: stock | waste | foundations */}
              <div className="aqt-toprow">
                {/* stock */}
                <div
                  className="aqt-pile"
                  onClick={stockClick}
                  style={{ cursor: 'pointer' }}
                  title={state.stockCount > 0 ? 'Draw' : 'Recycle waste'}
                >
                  {state.stockCount > 0 ? (
                    <FaceDownCard top={0} dataIdx={0} />
                  ) : (
                    <EmptySlot symbol={state.wasteCount > 0 ? '↻' : ''} />
                  )}
                </div>

                {/* waste — show up to 3 fanned */}
                <div className="aqt-pile">
                  {state.wasteTop.length === 0 ? (
                    <EmptySlot symbol="" />
                  ) : (
                    state.wasteTop.map((card, i, arr) => {
                      const isTop = i === arr.length - 1;
                      if (!card.faceUp) return null;
                      const sourceDesc = { kind: 'waste' };
                      const fanStep = (dragRef.current.cardW || 70) * 0.18;
                      return (
                        <div
                          key={card.id}
                          style={{ position: 'absolute', left: `${i * fanStep}px`, top: 0, zIndex: i }}
                        >
                          <FaceCard
                            card={card}
                            sourceDesc={sourceDesc}
                            hint={isTop && isHinted(sourceDesc)}
                            top={0}
                            dataIdx={i}
                            draggable={isTop}
                            onPointerDown={onCardPointerDown}
                            onDoubleClick={isTop ? () => autoMoveFromSource(sourceDesc) : undefined}
                          />
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="aqt-foundations">
                  {FOUNDATION_ORDER.map((suit) => {
                    const pile = state.foundation[suit];
                    const top = pile.length ? pile[pile.length - 1] : null;
                    const sourceDesc = { kind: 'foundation', suit };
                    return (
                      <div
                        key={suit}
                        className="aqt-pile"
                        data-droppable="true"
                        data-kind="foundation"
                        data-suit={suit}
                      >
                        {top ? (
                          <FaceCard
                            card={top}
                            sourceDesc={sourceDesc}
                            hint={isHinted(sourceDesc)}
                            top={0}
                            dataIdx={pile.length}
                            draggable={true}
                            onPointerDown={onCardPointerDown}
                            onDoubleClick={() => autoMoveFromSource(sourceDesc)}
                          />
                        ) : (
                          <EmptySlot symbol={SUIT_SYMBOL[suit]} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* tableau */}
              <div className="aqt-tableaurow">
                {state.tableau.map((col, ci) => {
                  const offsets = computeOffsets(col);
                  return (
                    <div
                      key={ci}
                      className="aqt-pile tableau"
                      data-droppable="true"
                      data-kind="tableau"
                      data-col={ci}
                    >
                      {col.length === 0 && <EmptySlot symbol="K" />}
                      {col.map((card, idx) => {
                        const top = offsets[idx];
                        if (!card.faceUp) {
                          return (
                            <FaceDownCard
                              key={`d-${ci}-${idx}`}
                              top={top}
                              dataIdx={idx}
                            />
                          );
                        }
                        const sourceDesc = { kind: 'tableau', col: ci, idx };
                        return (
                          <FaceCard
                            key={`u-${ci}-${idx}`}
                            card={card}
                            sourceDesc={sourceDesc}
                            hint={isHinted(sourceDesc)}
                            top={top}
                            dataIdx={idx}
                            draggable={true}
                            onPointerDown={onCardPointerDown}
                            onDoubleClick={() => autoMoveFromSource(sourceDesc)}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              <div ref={ghostLayerRef} className="aqt-ghost-layer" />
            </>
          )}
        </div>

        {/* desktop side panel */}
        <aside className="aqt-side">
          <div className="aqt-card-panel flex">
            <h3>
              <span>Leaderboard</span>
            </h3>
            <LeaderboardPanel
              leaderboard={leaderboard}
              lbMode={lbMode} setLbMode={setLbMode}
              lbSort={lbSort} setLbSort={setLbSort}
              currentUser={currentUser}
            />
          </div>
          <div className="aqt-card-panel">
            <p className="aqt-help-text">
              The server deals every hand and validates every move — every leaderboard score is real.
              Drag a card onto a foundation or onto a column with the next-highest card of the opposite color.
              Tap any card to auto-move.
            </p>
          </div>
        </aside>
      </main>

      {/* bottom controls */}
      <footer className="aqt-controls">
        <button className="aqt-btn primary" onClick={() => startNewGame(mode)} disabled={loading}>
          <span className="ic">🃏</span><span className="lbl">New Game</span>
        </button>
        <button className="aqt-btn" onClick={undo} disabled={loading || !state}>
          <span className="ic">↶</span><span className="lbl">Undo</span>
        </button>
        <button className="aqt-btn" onClick={requestHint} disabled={loading || !state}>
          <span className="ic">💡</span><span className="lbl">Hint</span>
        </button>
        <button
          className="aqt-btn"
          onClick={() => sendAction({ type: 'autoComplete' }, 'win')}
          disabled={loading || !state || !state.canAutoComplete}
          title={state?.canAutoComplete ? 'Send all cards to foundations' : 'Available when all cards are face-up'}
        >
          <span className="ic">⚡</span><span className="lbl">Auto-Complete</span>
        </button>
        <button
          className="aqt-btn"
          onClick={() => setShowLbSheet(true)}
          title="Leaderboard"
        >
          <span className="ic">🏆</span><span className="lbl">Leaderboard</span>
        </button>
        <button className="aqt-btn danger" onClick={abandon} disabled={loading || !state}>
          <span className="ic">✕</span><span className="lbl">Abandon</span>
        </button>
      </footer>

      {/* error toast */}
      {errorMsg && <div className="aqt-toast">{errorMsg}</div>}

      {/* mobile leaderboard sheet (also reachable from desktop) */}
      {showLbSheet && (
        <>
          <div className="aqt-overlay" onClick={() => setShowLbSheet(false)} />
          <div className="aqt-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="aqt-sheet-grip" />
            <button
              className="aqt-sheet-close"
              onClick={() => setShowLbSheet(false)}
              aria-label="Close leaderboard"
            >✕</button>
            <h3 style={{ margin: '0 0 8px', fontSize: 14, letterSpacing: 1.5, textTransform: 'uppercase', color: '#93c5fd' }}>
              Leaderboard
            </h3>
            <LeaderboardPanel
              leaderboard={leaderboard}
              lbMode={lbMode} setLbMode={setLbMode}
              lbSort={lbSort} setLbSort={setLbSort}
              currentUser={currentUser}
            />
          </div>
        </>
      )}

      {/* win modal */}
      {showWinModal && state && (
        <div className="aqt-overlay" onClick={() => setShowWinModal(false)}>
          <div className="aqt-modal" onClick={(e) => e.stopPropagation()}>
            <h2>You won! 🎉</h2>
            <p>
              {state.isDaily
                ? `Daily Challenge ${state.dailyKey} — score submitted.`
                : 'Your score has been submitted to the leaderboard.'}
            </p>
            <div className="aqt-modal-stats">
              <div>
                <div className="label">Score</div>
                <div className="value">{state.score}</div>
              </div>
              <div>
                <div className="label">Time</div>
                <div className="value">{fmtTime(elapsedSec)}</div>
              </div>
              <div>
                <div className="label">Moves</div>
                <div className="value">{state.moves}</div>
              </div>
            </div>
            <div className="aqt-modal-actions">
              <button className="aqt-btn primary" onClick={() => { setShowWinModal(false); startNewGame(mode); }}>
                Play again
              </button>
              <button className="aqt-btn" onClick={() => { setShowWinModal(false); setShowLbSheet(true); }}>
                Leaderboard
              </button>
              <button className="aqt-btn" onClick={() => setShowWinModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Aquataire;
