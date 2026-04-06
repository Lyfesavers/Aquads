'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const MAX_PLAYERS = 4;
const MIN_PLAYERS_TO_START = 2;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function cpuPlayerId(slot) {
  return `__ludo_cpu__${slot}`;
}

function cpuPlayerUsername(slot, totalCpus) {
  if (totalCpus === 1) return 'Computer';
  return `Computer ${slot + 1}`;
}

const cpuTurnTimers = new Map();

function clearCpuTurnTimer(code) {
  const t = cpuTurnTimers.get(code);
  if (t) clearTimeout(t);
  cpuTurnTimers.delete(code);
}

/** Lower bound of client path animation (Sludo.js: 80ms lead-in + 115/220ms per segment) plus slack so CPU does not act before moves finish. */
function estimateSludoPathAnimMs(path) {
  if (!path || path.length === 0) return 550;
  let ms = 100;
  for (const seg of path) {
    ms += seg && seg.kind === 'yardOut' ? 230 : 125;
  }
  return ms + 500;
}

const PLAYER_COLORS = ['#ff2d6a', '#00e5ff', '#b8ff00', '#c44dff'];

/* Seat 0 BL, 1 BR, 2 TR, 3 TL — indices 1 and 3 match BR/TL yards and colored arms. */
const START = [0, 39, 26, 13];

function gateSq(p) {
  return (START[p] - 1 + 52) % 52;
}

/* Starts + classic “star” safe cells */
const SAFE_TRACK = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

const YARD = -1;
const DONE = 200;

function isTrack(t) {
  return t >= 0 && t < 52;
}

function isHome(t) {
  return t >= 100 && t <= 104;
}

function homeStep(t) {
  return t - 100;
}

async function fetchProfileImage(userId) {
  try {
    const User = require('./models/User');
    const u = await User.findById(userId).select('image').lean();
    return u?.image || null;
  } catch {
    return null;
  }
}

const rooms = new Map();
const socketToRoom = new Map();

async function recordSludoWin(room, winnerIndex, io) {
  const w = room.players[winnerIndex];
  if (!w || w.isCpu) return;
  const mongoose = require('mongoose');
  const uid = w.userId;
  if (!uid || !mongoose.Types.ObjectId.isValid(String(uid))) return;
  try {
    const LeaderboardEntry = require('./models/LeaderboardEntry');
    await LeaderboardEntry.create({
      game: 'sludo',
      userId: new mongoose.Types.ObjectId(String(uid)),
      username: String(w.username || 'Player').replace(/\s+/g, ' ').slice(0, 24),
      result: 'Win',
      you: 1,
      ai: 0,
      grid: room.vsCpu ? 'vs-cpu' : 'pvp',
      difficulty: 'Easy',
    });
    io.emit('leaderboardUpdated', { game: 'sludo' });
  } catch (e) {
    console.error('Sludo leaderboard record failed:', e);
  }
}

function verifySocketUser(socket) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = String(decoded.userId || decoded._id || '');
    if (!userId) return null;
    const username = String(decoded.username || 'Player').replace(/\s+/g, ' ').slice(0, 24);
    return { userId, username };
  } catch {
    return null;
  }
}

function genRoomCode() {
  let code;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += CODE_CHARS[crypto.randomInt(0, CODE_CHARS.length)];
    }
  } while (rooms.has(code));
  return code;
}

function randomDie() {
  return crypto.randomInt(1, 7);
}

function getTrackOccupants(room) {
  const map = new Map();
  room.players.forEach((pl, pi) => {
    pl.tokens.forEach((t, ti) => {
      if (isTrack(t)) {
        const k = t;
        if (!map.has(k)) map.set(k, []);
        map.get(k).push({ playerIndex: pi, tokenIndex: ti });
      }
    });
  });
  return map;
}

function canEnterStart(room, playerIndex, startPos) {
  const occ = getTrackOccupants(room).get(startPos) || [];
  const opponents = occ.filter((o) => o.playerIndex !== playerIndex);
  if (opponents.length >= 2) return false;
  if (opponents.length === 1) {
    const o = opponents[0];
    const stack = occ.filter((x) => x.playerIndex === o.playerIndex).length;
    if (stack >= 2) return false;
  }
  return true;
}

function applyCapture(room, trackPos, moverPlayerIndex) {
  const occ = getTrackOccupants(room).get(trackPos) || [];
  const opponents = occ.filter((o) => o.playerIndex !== moverPlayerIndex);
  if (opponents.length !== 1) return [];
  const target = opponents[0];
  const sameColorStack = occ.filter((o) => o.playerIndex === target.playerIndex).length;
  if (sameColorStack >= 2) return [];
  if (SAFE_TRACK.has(trackPos)) return [];
  room.players[target.playerIndex].tokens[target.tokenIndex] = YARD;
  return [{ playerIndex: target.playerIndex, tokenIndex: target.tokenIndex }];
}

function tryMoveToken(room, playerIndex, tokenIndex, roll) {
  const pl = room.players[playerIndex];
  const t = pl.tokens[tokenIndex];
  const path = [];
  const captures = [];

  if (t === DONE) return null;

  if (t === YARD) {
    if (roll !== 6) return null;
    const startPos = START[playerIndex];
    if (!canEnterStart(room, playerIndex, startPos)) return null;
    const clone = room.players.map((p) => ({ ...p, tokens: [...p.tokens] }));
    clone[playerIndex].tokens[tokenIndex] = startPos;
    const caps = applyCapture(
      { players: clone },
      startPos,
      playerIndex
    );
    path.push({ kind: 'yardOut', toTrack: startPos });
    return { newTokens: clone[playerIndex].tokens, path, captures: caps, clonePlayers: clone };
  }

  if (isHome(t)) {
    let h = homeStep(t);
    let r = roll;
    let sim = room.players.map((p) => ({ ...p, tokens: [...p.tokens] }));
    const my = sim[playerIndex].tokens;
    while (r > 0) {
      if (h === 4) {
        if (r !== 1) return null;
        my[tokenIndex] = DONE;
        path.push({ kind: 'finish' });
        r -= 1;
        break;
      }
      h += 1;
      my[tokenIndex] = 100 + h;
      path.push({ kind: 'home', step: h });
      r -= 1;
    }
    if (r > 0) return null;
    return { newTokens: my, path, captures: [], clonePlayers: sim };
  }

  if (!isTrack(t)) return null;

  let pos = t;
  let r = roll;
  const sim = room.players.map((p) => ({ ...p, tokens: [...p.tokens] }));
  const myTokens = sim[playerIndex].tokens;
  const g = gateSq(playerIndex);

  while (r > 0) {
    if (pos === g) {
      let nh = -1;
      let first = true;
      while (r > 0) {
        if (first) {
          nh = 0;
          myTokens[tokenIndex] = 100;
          path.push({ kind: 'enterHome', step: 0 });
          first = false;
        } else {
          if (nh === 4) {
            if (r !== 1) return null;
            myTokens[tokenIndex] = DONE;
            path.push({ kind: 'finish' });
            r -= 1;
            break;
          }
          nh += 1;
          myTokens[tokenIndex] = 100 + nh;
          path.push({ kind: 'home', step: nh });
        }
        r -= 1;
      }
      break;
    }
    pos = (pos + 1) % 52;
    myTokens[tokenIndex] = pos;
    path.push({ kind: 'track', pos });
    r -= 1;
  }

  const land = myTokens[tokenIndex];
  if (isTrack(land)) {
    const occ = new Map();
    sim.forEach((p, pi) => {
      p.tokens.forEach((tok, ti) => {
        if (isTrack(tok)) {
          if (!occ.has(tok)) occ.set(tok, []);
          occ.get(tok).push({ playerIndex: pi, tokenIndex: ti });
        }
      });
    });
    const atLand = occ.get(land) || [];
    const opponents = atLand.filter((o) => o.playerIndex !== playerIndex);
    if (opponents.length === 1) {
      const target = opponents[0];
      const stack = atLand.filter((x) => x.playerIndex === target.playerIndex).length;
      if (stack >= 2) return null;
      if (SAFE_TRACK.has(land)) {
        /* stack with opponent on safe — illegal in classic for single capture; here: cannot land on occupied safe if opponent? */
        /* Allow stacking on safe with opponent? Classic: safe protects from capture — can two colors share? Usually no. */
        if (atLand.some((o) => o.playerIndex !== playerIndex)) return null;
      } else {
        sim[target.playerIndex].tokens[target.tokenIndex] = YARD;
        captures.push({ playerIndex: target.playerIndex, tokenIndex: target.tokenIndex });
      }
    } else if (opponents.length >= 2) {
      return null;
    }
  }

  return { newTokens: myTokens, path, captures, clonePlayers: sim };
}

function legalMovesFor(room, playerIndex, roll) {
  const moves = [];
  const pl = room.players[playerIndex];
  for (let i = 0; i < 4; i++) {
    const res = tryMoveToken(room, playerIndex, i, roll);
    if (res) moves.push({ tokenIndex: i, path: res.path, captures: res.captures });
  }
  return moves;
}

function allTokensDone(pl) {
  return pl.tokens.every((t) => t === DONE);
}

function advanceLudoTurn(room, rolledSix) {
  if (rolledSix) return;
  room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
}

/** Lower = closer to winning (CPU move heuristic). */
function tokenGoalDistance(room, playerIndex, tokenIndex) {
  const t = room.players[playerIndex].tokens[tokenIndex];
  if (t === DONE) return 0;
  if (t === YARD) return 130;
  if (isHome(t)) {
    const h = homeStep(t);
    return Math.max(0, 6 - h);
  }
  if (!isTrack(t)) return 130;
  const g = gateSq(playerIndex);
  let pos = t;
  for (let d = 0; d < 60; d++) {
    if (pos === g) return d + 7;
    pos = (pos + 1) % 52;
  }
  return 100;
}

function sumTokenDistances(room, playerIndex) {
  let s = 0;
  for (let ti = 0; ti < 4; ti++) s += tokenGoalDistance(room, playerIndex, ti);
  return s;
}

function sumOpponentDistances(room, cpuPlayerIndex) {
  let s = 0;
  room.players.forEach((_, opi) => {
    if (opi === cpuPlayerIndex) return;
    s += sumTokenDistances(room, opi);
  });
  return s;
}

function pickHardCpuMove(room, cpuPlayerIndex, roll, legal) {
  let best = legal[0];
  let bestScore = -Infinity;
  for (const move of legal) {
    const res = tryMoveToken(room, cpuPlayerIndex, move.tokenIndex, roll);
    if (!res) continue;
    const sim = { players: res.clonePlayers };
    if (allTokensDone(sim.players[cpuPlayerIndex])) return move;

    let s = 0;
    for (const cap of move.captures) {
      s += 420;
      s += tokenGoalDistance(room, cap.playerIndex, cap.tokenIndex) * 0.4;
    }
    if (res.newTokens[move.tokenIndex] === DONE) s += 950;
    for (const seg of move.path) {
      if (seg.kind === 'yardOut') s += 100;
      if (seg.kind === 'enterHome') s += 140;
      if (seg.kind === 'home') s += 22 + seg.step * 20;
      if (seg.kind === 'finish') s += 220;
    }
    const myBefore = sumTokenDistances(room, cpuPlayerIndex);
    const myAfter = sumTokenDistances(sim, cpuPlayerIndex);
    s += (myBefore - myAfter) * 14;
    const oppBefore = sumOpponentDistances(room, cpuPlayerIndex);
    const oppAfter = sumOpponentDistances(sim, cpuPlayerIndex);
    s += (oppAfter - oppBefore) * 10;

    if (s > bestScore || (s === bestScore && crypto.randomInt(0, 2) === 0)) {
      bestScore = s;
      best = move;
    }
  }
  return best;
}

function publicState(room) {
  return {
    code: room.code,
    phase: room.phase,
    hostId: room.hostId,
    vsCpu: !!room.vsCpu,
    players: room.players.map((p) => ({
      userId: p.userId,
      username: p.username,
      color: p.color,
      tokens: [...p.tokens],
      connected: p.connected,
      image: p.image || null,
      isCpu: !!p.isCpu,
    })),
    currentTurnIndex: room.currentTurnIndex,
    winnerIndex: room.winnerIndex,
    pendingRoll: room.pendingRoll,
    awaitingChoice: room.awaitingChoice,
  };
}

function roomChannel(code) {
  return `ludo_${code}`;
}

function removePlayerFromRoom(room, userId) {
  const idx = room.players.findIndex((p) => p.userId === userId);
  if (idx === -1) return;
  room.players.splice(idx, 1);
  if (room.vsCpu && !room.players.some((p) => !p.isCpu)) {
    room.players.length = 0;
  }
  if (room.hostId === userId && room.players.length > 0) {
    const human = room.players.find((p) => !p.isCpu);
    room.hostId = human ? human.userId : room.players[0].userId;
  }
  if (room.phase === 'playing') {
    if (room.players.length < MIN_PLAYERS_TO_START) {
      room.phase = 'lobby';
      room.winnerIndex = null;
      room.players.forEach((p) => {
        p.tokens = [YARD, YARD, YARD, YARD];
      });
      room.currentTurnIndex = 0;
      room.pendingRoll = null;
      room.awaitingChoice = null;
    } else {
      if (room.currentTurnIndex >= room.players.length) {
        room.currentTurnIndex = 0;
      }
    }
  }
}

function pruneRooms() {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (room.players.length === 0 && now - room.createdAt > 60000) {
      clearCpuTurnTimer(code);
      rooms.delete(code);
    }
  }
}

setInterval(pruneRooms, 5 * 60 * 1000);

function buildOpenRoomsList() {
  const list = [];
  for (const room of rooms.values()) {
    if (room.vsCpu) continue;
    if (room.phase !== 'lobby') continue;
    if (room.players.length >= MAX_PLAYERS) continue;
    const host = room.players.find((pl) => pl.userId === room.hostId) || room.players[0];
    list.push({
      code: room.code,
      players: room.players.length,
      max: MAX_PLAYERS,
      host: host?.username || 'Host',
    });
  }
  list.sort((a, b) => {
    if (b.players !== a.players) return b.players - a.players;
    return a.code.localeCompare(b.code);
  });
  return list;
}

function notifyOpenRoomsChanged(io) {
  if (io) io.emit('ludo:openRoomsRefresh');
}

function leaveRoomSocket(socket, io) {
  const code = socketToRoom.get(socket.id);
  if (!code) return;
  const room = rooms.get(code);
  socketToRoom.delete(socket.id);
  socket.leave(roomChannel(code));
  if (!room) {
    notifyOpenRoomsChanged(io);
    return;
  }

  const user = verifySocketUser(socket);
  const userId = user?.userId;
  const p =
    room.players.find((pl) => pl.socketId === socket.id) ||
    (userId ? room.players.find((pl) => pl.userId === userId) : null);
  if (!p) {
    if (room.players.length === 0) {
      clearCpuTurnTimer(code);
      rooms.delete(code);
    }
    notifyOpenRoomsChanged(io);
    return;
  }

  const pid = p.userId;
  p.socketId = null;
  if (room.phase === 'lobby') {
    removePlayerFromRoom(room, pid);
  } else {
    p.connected = false;
  }

  if (room.players.length === 0) {
    clearCpuTurnTimer(code);
    rooms.delete(code);
    notifyOpenRoomsChanged(io);
    return;
  }

  io.to(roomChannel(code)).emit('ludo:state', publicState(room));
  notifyOpenRoomsChanged(io);
}

function attachLudo(socket, io) {
  socket.on('ludo:listOpenRooms', () => {
    const user = verifySocketUser(socket);
    if (!user) {
      socket.emit('ludo:error', { message: 'Login required to browse rooms.' });
      return;
    }
    socket.emit('ludo:openRooms', { rooms: buildOpenRoomsList() });
  });

  socket.on('ludo:createRoom', async () => {
    const user = verifySocketUser(socket);
    if (!user) {
      socket.emit('ludo:error', { message: 'Login required to play.' });
      return;
    }
    leaveRoomSocket(socket, io);

    const image = await fetchProfileImage(user.userId);
    const code = genRoomCode();
    const room = {
      code,
      hostId: user.userId,
      players: [
        {
          userId: user.userId,
          username: user.username,
          color: PLAYER_COLORS[0],
          tokens: [YARD, YARD, YARD, YARD],
          socketId: socket.id,
          connected: true,
          image,
        },
      ],
      phase: 'lobby',
      currentTurnIndex: 0,
      winnerIndex: null,
      createdAt: Date.now(),
      busy: false,
      pendingRoll: null,
      awaitingChoice: null,
    };
    rooms.set(code, room);
    socket.join(roomChannel(code));
    socketToRoom.set(socket.id, code);
    socket.emit('ludo:joined', { state: publicState(room) });
    io.to(roomChannel(code)).emit('ludo:state', publicState(room));
    notifyOpenRoomsChanged(io);
  });

  socket.on('ludo:createVsCpuRoom', async (payload) => {
    const user = verifySocketUser(socket);
    if (!user) {
      socket.emit('ludo:error', { message: 'Login required to play.' });
      return;
    }
    let cpuCount = Number(payload?.cpuCount);
    if (!Number.isInteger(cpuCount) || cpuCount < 1 || cpuCount > 3) {
      socket.emit('ludo:error', { message: 'Choose 1 to 3 CPU opponents.' });
      return;
    }
    leaveRoomSocket(socket, io);

    const image = await fetchProfileImage(user.userId);
    const code = genRoomCode();
    const players = [
      {
        userId: user.userId,
        username: user.username,
        color: PLAYER_COLORS[0],
        tokens: [YARD, YARD, YARD, YARD],
        socketId: socket.id,
        connected: true,
        image,
      },
    ];
    for (let i = 0; i < cpuCount; i++) {
      players.push({
        userId: cpuPlayerId(i),
        username: cpuPlayerUsername(i, cpuCount),
        color: PLAYER_COLORS[(1 + i) % PLAYER_COLORS.length],
        tokens: [YARD, YARD, YARD, YARD],
        socketId: null,
        connected: true,
        image: null,
        isCpu: true,
      });
    }
    const room = {
      code,
      hostId: user.userId,
      vsCpu: true,
      players,
      phase: 'lobby',
      currentTurnIndex: 0,
      winnerIndex: null,
      createdAt: Date.now(),
      busy: false,
      pendingRoll: null,
      awaitingChoice: null,
    };
    rooms.set(code, room);
    socket.join(roomChannel(code));
    socketToRoom.set(socket.id, code);
    socket.emit('ludo:joined', { state: publicState(room) });
    io.to(roomChannel(code)).emit('ludo:state', publicState(room));
    notifyOpenRoomsChanged(io);
  });

  socket.on('ludo:joinRoom', async (payload) => {
    const user = verifySocketUser(socket);
    if (!user) {
      socket.emit('ludo:error', { message: 'Login required to play.' });
      return;
    }
    const code = String(payload?.code || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8);
    if (code.length !== 6) {
      socket.emit('ludo:error', { message: 'Enter a 6-character room code.' });
      return;
    }

    const room = rooms.get(code);
    if (!room) {
      socket.emit('ludo:error', { message: 'Room not found.' });
      return;
    }

    const existing = room.players.find((p) => p.userId === user.userId);
    if (existing) {
      leaveRoomSocket(socket, io);
      existing.socketId = socket.id;
      existing.connected = true;
      existing.username = user.username;
      const img = await fetchProfileImage(user.userId);
      if (img) existing.image = img;
      socket.join(roomChannel(code));
      socketToRoom.set(socket.id, code);
      socket.emit('ludo:joined', { state: publicState(room) });
      io.to(roomChannel(code)).emit('ludo:state', publicState(room));
      notifyOpenRoomsChanged(io);
      return;
    }

    if (room.vsCpu) {
      socket.emit('ludo:error', { message: 'Cannot join — that match is vs computer.' });
      return;
    }

    if (room.players.length >= MAX_PLAYERS) {
      socket.emit('ludo:error', { message: 'This room is full (4 players).' });
      return;
    }

    if (room.phase !== 'lobby') {
      socket.emit('ludo:error', { message: 'Game already started — wait for the next round or create a room.' });
      return;
    }

    leaveRoomSocket(socket, io);
    const image = await fetchProfileImage(user.userId);
    room.players.push({
      userId: user.userId,
      username: user.username,
      color: PLAYER_COLORS[room.players.length % PLAYER_COLORS.length],
      tokens: [YARD, YARD, YARD, YARD],
      socketId: socket.id,
      connected: true,
      image,
    });
    socket.join(roomChannel(code));
    socketToRoom.set(socket.id, code);
    socket.emit('ludo:joined', { state: publicState(room) });
    io.to(roomChannel(code)).emit('ludo:state', publicState(room));
    notifyOpenRoomsChanged(io);
  });

  socket.on('ludo:leaveRoom', () => {
    const user = verifySocketUser(socket);
    const code = socketToRoom.get(socket.id);
    if (!code || !user) return;
    const room = rooms.get(code);
    if (!room) return;

    if (room.phase === 'lobby') {
      removePlayerFromRoom(room, user.userId);
    } else {
      const p = room.players.find((pl) => pl.userId === user.userId);
      if (p) {
        p.connected = false;
        p.socketId = null;
      }
    }

    socketToRoom.delete(socket.id);
    socket.leave(roomChannel(code));

    if (room.players.length === 0) {
      clearCpuTurnTimer(code);
      rooms.delete(code);
    } else {
      io.to(roomChannel(code)).emit('ludo:state', publicState(room));
    }
    socket.emit('ludo:left');
    notifyOpenRoomsChanged(io);
  });

  socket.on('ludo:startGame', () => {
    const user = verifySocketUser(socket);
    if (!user) {
      socket.emit('ludo:error', { message: 'Login required.' });
      return;
    }
    const code = socketToRoom.get(socket.id);
    const room = code ? rooms.get(code) : null;
    if (!room || room.hostId !== user.userId) {
      socket.emit('ludo:error', { message: 'Only the host can start the game.' });
      return;
    }
    if (room.players.length < MIN_PLAYERS_TO_START) {
      socket.emit('ludo:error', { message: `Need at least ${MIN_PLAYERS_TO_START} players to start.` });
      return;
    }
    if (!room.players.every((p) => p.connected)) {
      socket.emit('ludo:error', { message: 'All players must be connected.' });
      return;
    }
    room.phase = 'playing';
    room.currentTurnIndex = 0;
    room.winnerIndex = null;
    room.pendingRoll = null;
    room.awaitingChoice = null;
    room.busy = false;
    room.players.forEach((p) => {
      p.tokens = [YARD, YARD, YARD, YARD];
    });
    io.to(roomChannel(room.code)).emit('ludo:state', publicState(room));
    notifyOpenRoomsChanged(io);
    scheduleCpuTurnIfNeeded(room, io);
  });

  function emitPassTurn(room, turnIdx, roll, io) {
    const current = room.players[turnIdx];
    room.pendingRoll = null;
    room.awaitingChoice = null;
    advanceLudoTurn(room, roll === 6);
    room.busy = false;
    io.to(roomChannel(room.code)).emit('ludo:turnResult', {
      type: 'pass',
      playerIndex: turnIdx,
      username: current.username,
      roll,
      path: [],
      captures: [],
      tokenIndex: null,
      extraTurn: false,
      gameOver: false,
      state: publicState(room),
    });
    scheduleCpuTurnIfNeeded(room, io, estimateSludoPathAnimMs([]));
  }

  function emitMoveTurn(room, turnIdx, pick, roll, io) {
    const current = room.players[turnIdx];
    const moveFrom = current.tokens[pick.tokenIndex];
    room.busy = true;
    const res = tryMoveToken(room, turnIdx, pick.tokenIndex, roll);
    room.players = res.clonePlayers;
    room.players[turnIdx].tokens = res.newTokens;
    const won = allTokensDone(room.players[turnIdx]);
    if (won) {
      room.phase = 'finished';
      room.winnerIndex = turnIdx;
      void recordSludoWin(room, turnIdx, io);
    } else {
      advanceLudoTurn(room, roll === 6);
    }
    room.pendingRoll = null;
    room.awaitingChoice = null;
    room.busy = false;
    io.to(roomChannel(room.code)).emit('ludo:turnResult', {
      type: 'move',
      playerIndex: turnIdx,
      username: current.username,
      roll,
      path: pick.path,
      captures: pick.captures,
      tokenIndex: pick.tokenIndex,
      moveFrom,
      extraTurn: roll === 6 && !won,
      gameOver: won,
      state: publicState(room),
    });
    scheduleCpuTurnIfNeeded(room, io, estimateSludoPathAnimMs(pick.path));
  }

  function finalizeAfterRoll(room, turnIdx, roll, legal, io) {
    const current = room.players[turnIdx];
    const ch = roomChannel(room.code);
    if (legal.length === 0) {
      emitPassTurn(room, turnIdx, roll, io);
      return;
    }
    if (legal.length === 1) {
      emitMoveTurn(room, turnIdx, legal[0], roll, io);
      return;
    }
    if (current.isCpu) {
      const pick = pickHardCpuMove(room, turnIdx, roll, legal);
      emitMoveTurn(room, turnIdx, pick, roll, io);
      return;
    }
    room.pendingRoll = roll;
    room.awaitingChoice = { legal: legal.map((m) => m.tokenIndex) };
    room.busy = false;
    io.to(ch).emit('ludo:choosePiece', {
      playerIndex: turnIdx,
      username: current.username,
      roll,
      options: legal.map((m) => ({ tokenIndex: m.tokenIndex, pathLen: m.path.length })),
      state: publicState(room),
    });
  }

  function scheduleCpuTurnIfNeeded(room, io, minDelayMs = 0) {
    if (room.phase !== 'playing') return;
    clearCpuTurnTimer(room.code);
    const cur = room.players[room.currentTurnIndex];
    if (!cur?.isCpu) return;
    const delay = Math.max(520 + crypto.randomInt(0, 380), minDelayMs);
    const code = room.code;
    const tid = setTimeout(() => {
      cpuTurnTimers.delete(code);
      const r = rooms.get(code);
      if (!r || r.phase !== 'playing' || r.busy || r.awaitingChoice) return;
      if (!r.players[r.currentTurnIndex]?.isCpu) return;
      r.busy = true;
      const roll = randomDie();
      const turnIdx = r.currentTurnIndex;
      const legal = legalMovesFor(r, turnIdx, roll);
      finalizeAfterRoll(r, turnIdx, roll, legal, io);
    }, delay);
    cpuTurnTimers.set(code, tid);
  }

  socket.on('ludo:roll', () => {
    const user = verifySocketUser(socket);
    if (!user) {
      socket.emit('ludo:error', { message: 'Login required.' });
      return;
    }
    const code = socketToRoom.get(socket.id);
    const room = code ? rooms.get(code) : null;
    if (!room || room.phase !== 'playing') {
      socket.emit('ludo:error', { message: 'No active game.' });
      return;
    }
    if (room.busy) {
      socket.emit('ludo:error', { message: 'Wait for the current action to finish.' });
      return;
    }
    if (room.awaitingChoice) {
      socket.emit('ludo:error', { message: 'Choose which piece to move first.' });
      return;
    }

    const turnIdx = room.currentTurnIndex;
    const current = room.players[turnIdx];
    if (!current || current.userId !== user.userId) {
      socket.emit('ludo:error', { message: 'Not your turn.' });
      return;
    }

    room.busy = true;
    const roll = randomDie();
    const legal = legalMovesFor(room, turnIdx, roll);
    finalizeAfterRoll(room, turnIdx, roll, legal, io);
  });

  socket.on('ludo:selectPiece', (payload) => {
    const user = verifySocketUser(socket);
    if (!user) {
      socket.emit('ludo:error', { message: 'Login required.' });
      return;
    }
    const code = socketToRoom.get(socket.id);
    const room = code ? rooms.get(code) : null;
    if (!room || room.phase !== 'playing') {
      socket.emit('ludo:error', { message: 'No active game.' });
      return;
    }
    const turnIdx = room.currentTurnIndex;
    const current = room.players[turnIdx];
    if (!current || current.userId !== user.userId) {
      socket.emit('ludo:error', { message: 'Not your turn.' });
      return;
    }
    if (!room.awaitingChoice || room.pendingRoll == null) {
      socket.emit('ludo:error', { message: 'Roll the dice first.' });
      return;
    }

    const tokenIndex = Number(payload?.tokenIndex);
    if (!Number.isInteger(tokenIndex) || tokenIndex < 0 || tokenIndex > 3) {
      socket.emit('ludo:error', { message: 'Invalid piece.' });
      return;
    }
    if (!room.awaitingChoice.legal.includes(tokenIndex)) {
      socket.emit('ludo:error', { message: 'That piece cannot move with this roll.' });
      return;
    }

    const roll = room.pendingRoll;
    const legal = legalMovesFor(room, turnIdx, roll);
    const pick = legal.find((m) => m.tokenIndex === tokenIndex);
    if (!pick) {
      socket.emit('ludo:error', { message: 'Illegal move.' });
      return;
    }

    emitMoveTurn(room, turnIdx, pick, roll, io);
  });

  socket.on('ludo:rematch', () => {
    const user = verifySocketUser(socket);
    if (!user) {
      socket.emit('ludo:error', { message: 'Login required.' });
      return;
    }
    const code = socketToRoom.get(socket.id);
    const room = code ? rooms.get(code) : null;
    if (!room || room.hostId !== user.userId) {
      socket.emit('ludo:error', { message: 'Only the host can run it back.' });
      return;
    }
    if (room.phase !== 'finished') {
      socket.emit('ludo:error', { message: 'Finish a game before rematch.' });
      return;
    }
    clearCpuTurnTimer(room.code);
    room.phase = 'lobby';
    room.winnerIndex = null;
    room.currentTurnIndex = 0;
    room.pendingRoll = null;
    room.awaitingChoice = null;
    room.busy = false;
    room.players.forEach((p) => {
      p.tokens = [YARD, YARD, YARD, YARD];
    });
    room.players = room.players.filter((p) => p.connected);
    if (room.players.length === 0) {
      clearCpuTurnTimer(room.code);
      rooms.delete(room.code);
      socket.emit('ludo:left');
      notifyOpenRoomsChanged(io);
      return;
    }
    const humanHost = room.players.find((p) => !p.isCpu);
    room.hostId = humanHost ? humanHost.userId : room.players[0].userId;
    room.players.forEach((p, i) => {
      p.color = PLAYER_COLORS[i % PLAYER_COLORS.length];
    });
    io.to(roomChannel(room.code)).emit('ludo:state', publicState(room));
    notifyOpenRoomsChanged(io);
  });

  socket.on('disconnect', () => {
    leaveRoomSocket(socket, io);
  });
}

module.exports = { attachLudo };
