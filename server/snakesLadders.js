'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const MAX_PLAYERS = 4;
const MIN_PLAYERS_TO_START = 2;
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const PLAYER_COLORS = ['#E52521', '#049CD8', '#43B047', '#FBD000'];

/* Friendlier Aquads board: more climbs, gentler slides, still punishing near the end */
const LADDER_MAP = new Map([
  [1, 22], [4, 16], [8, 30], [13, 36], [18, 41], [23, 46], [27, 50], [32, 55], [37, 60], [42, 65],
  [47, 70], [52, 75], [59, 82], [66, 88], [73, 94], [11, 28], [20, 39], [34, 53], [45, 63], [56, 74],
  [68, 85], [77, 93], [80, 100],
]);
const SNAKE_MAP = new Map([
  [97, 88], [93, 82], [89, 76], [85, 71], [79, 65], [74, 60], [69, 54], [63, 48], [57, 43], [51, 38],
  [44, 31], [39, 26], [31, 19], [25, 12],
]);

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

function fullPathFromWalk(land) {
  const slides = [];
  let p = land;
  let guard = 0;
  while (guard++ < 24) {
    const up = LADDER_MAP.get(p);
    const down = SNAKE_MAP.get(p);
    if (up) {
      slides.push({ type: 'ladder', from: p, to: up });
      p = up;
    } else if (down) {
      slides.push({ type: 'snake', from: p, to: down });
      p = down;
    } else break;
  }
  return { final: p, slides };
}

function walkSteps(start, roll) {
  const path = [start];
  for (let k = 1; k <= roll; k++) {
    path.push(start + k);
  }
  return path;
}

function computeRollResult(start, roll) {
  /* From the gate: any roll 1–6 enters the track on that square (fairer, faster games) */
  if (start === 0) {
    const land = roll;
    const walk = walkSteps(0, roll);
    const { final, slides } = fullPathFromWalk(land);
    const path = [...walk];
    for (const s of slides) {
      path.push(s.to);
    }
    return {
      moved: true,
      roll,
      path,
      slides,
      finalPos: final,
      extraTurn: roll === 6,
      gameOver: final === 100,
    };
  }

  const target = start + roll;
  if (target > 100) {
    return {
      moved: false,
      roll,
      path: [start],
      slides: [],
      finalPos: start,
      extraTurn: false,
      gameOver: false,
    };
  }

  const walk = walkSteps(start, roll);
  const land = target;
  const { final, slides } = fullPathFromWalk(land);
  let path = [...walk];
  for (const s of slides) {
    path.push(s.to);
  }

  return {
    moved: true,
    roll,
    path,
    slides,
    finalPos: final,
    extraTurn: roll === 6,
    gameOver: final === 100,
  };
}

function publicState(room) {
  return {
    code: room.code,
    phase: room.phase,
    hostId: room.hostId,
    players: room.players.map((p) => ({
      userId: p.userId,
      username: p.username,
      color: p.color,
      position: p.position,
      connected: p.connected,
      image: p.image || null,
    })),
    currentTurnIndex: room.currentTurnIndex,
    winnerIndex: room.winnerIndex,
  };
}

function roomChannel(code) {
  return `snl_${code}`;
}

function removePlayerFromRoom(room, userId) {
  const idx = room.players.findIndex((p) => p.userId === userId);
  if (idx === -1) return;
  room.players.splice(idx, 1);
  if (room.hostId === userId && room.players.length > 0) {
    room.hostId = room.players[0].userId;
  }
  if (room.phase === 'playing') {
    if (room.players.length < MIN_PLAYERS_TO_START) {
      room.phase = 'lobby';
      room.winnerIndex = null;
      room.players.forEach((p) => {
        p.position = 0;
      });
      room.currentTurnIndex = 0;
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
      rooms.delete(code);
    }
  }
}

setInterval(pruneRooms, 5 * 60 * 1000);

function leaveRoomSocket(socket, io) {
  const code = socketToRoom.get(socket.id);
  if (!code) return;
  const room = rooms.get(code);
  socketToRoom.delete(socket.id);
  socket.leave(roomChannel(code));
  if (!room) return;

  const user = verifySocketUser(socket);
  const userId = user?.userId;
  const p =
    room.players.find((pl) => pl.socketId === socket.id) ||
    (userId ? room.players.find((pl) => pl.userId === userId) : null);
  if (!p) {
    if (room.players.length === 0) rooms.delete(code);
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
    rooms.delete(code);
    return;
  }

  io.to(roomChannel(code)).emit('snl:state', publicState(room));
}

function attachSnakesLadders(socket, io) {
  socket.on('snl:createRoom', async () => {
    const user = verifySocketUser(socket);
    if (!user) {
      socket.emit('snl:error', { message: 'Login required to play.' });
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
          position: 0,
          socketId: socket.id,
          connected: true,
          image,
        },
      ],
      phase: 'lobby',
      currentTurnIndex: 0,
      winnerIndex: null,
      createdAt: Date.now(),
      processingRoll: false,
    };
    rooms.set(code, room);
    socket.join(roomChannel(code));
    socketToRoom.set(socket.id, code);
    socket.emit('snl:joined', { state: publicState(room) });
    io.to(roomChannel(code)).emit('snl:state', publicState(room));
  });

  socket.on('snl:joinRoom', async (payload) => {
    const user = verifySocketUser(socket);
    if (!user) {
      socket.emit('snl:error', { message: 'Login required to play.' });
      return;
    }
    const code = String(payload?.code || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8);
    if (code.length !== 6) {
      socket.emit('snl:error', { message: 'Enter a 6-character room code.' });
      return;
    }

    const room = rooms.get(code);
    if (!room) {
      socket.emit('snl:error', { message: 'Room not found.' });
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
      socket.emit('snl:joined', { state: publicState(room) });
      io.to(roomChannel(code)).emit('snl:state', publicState(room));
      return;
    }

    if (room.players.length >= MAX_PLAYERS) {
      socket.emit('snl:error', { message: 'This room is full (4 players).' });
      return;
    }

    if (room.phase !== 'lobby') {
      socket.emit('snl:error', { message: 'Game already started — wait for the next round or create a room.' });
      return;
    }

    leaveRoomSocket(socket, io);
    const image = await fetchProfileImage(user.userId);
    room.players.push({
      userId: user.userId,
      username: user.username,
      color: PLAYER_COLORS[room.players.length % PLAYER_COLORS.length],
      position: 0,
      socketId: socket.id,
      connected: true,
      image,
    });
    socket.join(roomChannel(code));
    socketToRoom.set(socket.id, code);
    socket.emit('snl:joined', { state: publicState(room) });
    io.to(roomChannel(code)).emit('snl:state', publicState(room));
  });

  socket.on('snl:leaveRoom', () => {
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
      rooms.delete(code);
    } else {
      io.to(roomChannel(code)).emit('snl:state', publicState(room));
    }
    socket.emit('snl:left');
  });

  socket.on('snl:startGame', () => {
    const user = verifySocketUser(socket);
    if (!user) {
      socket.emit('snl:error', { message: 'Login required.' });
      return;
    }
    const code = socketToRoom.get(socket.id);
    const room = code ? rooms.get(code) : null;
    if (!room || room.hostId !== user.userId) {
      socket.emit('snl:error', { message: 'Only the host can start the game.' });
      return;
    }
    if (room.players.length < MIN_PLAYERS_TO_START) {
      socket.emit('snl:error', { message: `Need at least ${MIN_PLAYERS_TO_START} players to start.` });
      return;
    }
    if (!room.players.every((p) => p.connected)) {
      socket.emit('snl:error', { message: 'All players must be connected.' });
      return;
    }
    room.phase = 'playing';
    room.currentTurnIndex = 0;
    room.winnerIndex = null;
    room.players.forEach((p) => {
      p.position = 0;
    });
    room.processingRoll = false;
    io.to(roomChannel(room.code)).emit('snl:state', publicState(room));
  });

  socket.on('snl:roll', () => {
    const user = verifySocketUser(socket);
    if (!user) {
      socket.emit('snl:error', { message: 'Login required.' });
      return;
    }
    const code = socketToRoom.get(socket.id);
    const room = code ? rooms.get(code) : null;
    if (!room || room.phase !== 'playing') {
      socket.emit('snl:error', { message: 'No active game.' });
      return;
    }
    if (room.processingRoll) {
      socket.emit('snl:error', { message: 'Wait for the current move to finish.' });
      return;
    }

    const turnIdx = room.currentTurnIndex;
    const current = room.players[turnIdx];
    if (!current || current.userId !== user.userId) {
      socket.emit('snl:error', { message: 'Not your turn.' });
      return;
    }

    room.processingRoll = true;
    const roll = randomDie();
    const result = computeRollResult(current.position, roll);

    if (result.moved) {
      current.position = result.finalPos;
    }

    if (result.gameOver) {
      room.phase = 'finished';
      room.winnerIndex = turnIdx;
    } else if (!result.extraTurn) {
      room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
    }

    const eventPayload = {
      playerIndex: turnIdx,
      username: current.username,
      roll: result.roll,
      path: result.path,
      slides: result.slides,
      finalPos: result.finalPos,
      moved: result.moved,
      extraTurn: result.extraTurn,
      gameOver: result.gameOver,
      state: publicState(room),
    };

    io.to(roomChannel(room.code)).emit('snl:turnResult', eventPayload);
    room.processingRoll = false;
  });

  socket.on('snl:rematch', () => {
    const user = verifySocketUser(socket);
    if (!user) {
      socket.emit('snl:error', { message: 'Login required.' });
      return;
    }
    const code = socketToRoom.get(socket.id);
    const room = code ? rooms.get(code) : null;
    if (!room || room.hostId !== user.userId) {
      socket.emit('snl:error', { message: 'Only the host can run it back.' });
      return;
    }
    if (room.phase !== 'finished') {
      socket.emit('snl:error', { message: 'Finish a game before rematch.' });
      return;
    }
    room.phase = 'lobby';
    room.winnerIndex = null;
    room.currentTurnIndex = 0;
    room.processingRoll = false;
    room.players.forEach((p) => {
      p.position = 0;
    });
    room.players = room.players.filter((p) => p.connected);
    if (room.players.length === 0) {
      rooms.delete(room.code);
      socket.emit('snl:left');
      return;
    }
    room.hostId = room.players[0].userId;
    room.players.forEach((p, i) => {
      p.color = PLAYER_COLORS[i % PLAYER_COLORS.length];
    });
    io.to(roomChannel(room.code)).emit('snl:state', publicState(room));
  });

  socket.on('disconnect', () => {
    leaveRoomSocket(socket, io);
  });
}

module.exports = { attachSnakesLadders };
