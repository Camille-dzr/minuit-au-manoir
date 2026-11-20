'use strict';
/*
 * Minuit au Manoir — serveur de jeu.
 * Le serveur est l'arbitre : il garde les solutions secrètes, valide chaque action,
 * tient le chrono et annonce la fin de partie aux deux joueuses.
 */
const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const S = require('./public/shared.js');

const PORT = Number(process.env.PORT) || 3000;
const DURATION = Number(process.env.GAME_DURATION_MS) || S.GAME_DURATION_MS;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

const app = express();
app.disable('x-powered-by');
app.use(express.static(path.join(__dirname, 'public')));
app.get('/sante', (req, res) => res.json({ ok: true, salons: rooms.size }));

const server = http.createServer(app);
const io = new Server(server);
const rooms = new Map();

// ---------- utilitaires ----------
function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeCode() {
  let code;
  do {
    code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function newPuzzle() {
  return {
    symbols: shuffle([0, 1, 2, 3, 4, 5]).slice(0, 3),
    candleOrder: shuffle([0, 1, 2, 3]),
    mantel: shuffle(['cle', 'bague', 'medaillon']),
    clockSlot: Math.floor(Math.random() * 3),
  };
}

function newProgress() {
  return {
    coffret: false,
    candles: [],
    candlesDone: false,
    clockSearched: [],
    medaillon: false,
    inventory: [],
    mantel: [null, null, null],
    doorOpen: false,
  };
}

function publicState(room) {
  const pr = room.progress;
  return {
    code: room.code,
    phase: room.phase,
    result: room.result,
    endsAt: room.endsAt,
    remainingAtEnd: room.remainingAtEnd,
    duration: DURATION,
    now: Date.now(),
    players: room.players.map(
      (p) =>
        p && {
          slot: p.slot,
          name: p.name,
          look: p.look,
          ready: p.ready,
          x: p.x,
          y: p.y,
          dir: p.dir,
          exited: p.exited,
        }
    ),
    progress: pr && {
      coffret: pr.coffret,
      candles: pr.candles,
      candlesDone: pr.candlesDone,
      clockSearched: pr.clockSearched,
      medaillon: pr.medaillon,
      inventory: pr.inventory,
      mantel: pr.mantel,
      doorOpen: pr.doorOpen,
    },
  };
}

const broadcast = (room) => io.to(room.code).emit('state', publicState(room));
const announce = (room, type, data = {}) => io.to(room.code).emit('evt', { type, ...data });
const near = (p, spot, radius = S.INTERACT_RADIUS + 20) => S.dist(p, spot) <= radius;

function bothNearFireplace(room) {
  return room.players.every((p) => p && !p.exited && near(p, S.SPOTS.fireplace, S.TEAM_RADIUS + 10));
}

function giveRelic(room, relic, by) {
  room.progress.inventory.push(relic);
  announce(room, 'relic', { relic, by });
  broadcast(room);
}

function startGame(room) {
  clearTimeout(room.timer);
  room.phase = 'playing';
  room.result = null;
  room.remainingAtEnd = null;
  room.puzzle = newPuzzle();
  room.progress = newProgress();
  room.endsAt = Date.now() + DURATION;
  room.players.forEach((p) => {
    p.ready = false;
    p.exited = false;
    p.x = S.START[p.slot].x;
    p.y = S.START[p.slot].y;
    p.dir = 'up';
    p.moving = false;
  });
  room.timer = setTimeout(() => endGame(room, 'lost'), DURATION);
  announce(room, 'start');
  broadcast(room);
}

function endGame(room, result) {
  if (room.phase !== 'playing') return;
  clearTimeout(room.timer);
  room.phase = 'ended';
  room.result = result;
  room.remainingAtEnd = Math.max(0, room.endsAt - Date.now());
  room.players.forEach((p) => p && (p.ready = false));
  announce(room, 'end', { result, solution: result === 'lost' ? room.puzzle : undefined });
  broadcast(room);
}

// ---------- connexions ----------
io.on('connection', (socket) => {
  let room = null;
  let me = null;

  const playing = () => room && room.phase === 'playing' && me && !me.exited;

  function attach(target, slot, data) {
    me = {
      id: socket.id,
      slot,
      name: S.sanitizeName(data && data.name),
      look: S.sanitizeLook(data && data.look),
      ready: false,
      x: S.START[slot].x,
      y: S.START[slot].y,
      dir: 'down',
      moving: false,
      exited: false,
      lastChat: 0,
    };
    target.players[slot] = me;
    room = target;
    socket.join(target.code);
    socket.emit('joined', { code: target.code, slot });
    broadcast(target);
  }

  function leave() {
    if (!room || !me) return;
    const r = room;
    socket.leave(r.code);
    r.players[me.slot] = null;
    const name = me.name;
    room = null;
    me = null;
    if (r.players.every((p) => !p)) {
      clearTimeout(r.timer);
      rooms.delete(r.code);
      return;
    }
    if (r.phase === 'playing') {
      clearTimeout(r.timer);
      r.phase = 'lobby';
      r.progress = null;
      r.puzzle = null;
      r.endsAt = null;
    }
    r.players.forEach((p) => p && (p.ready = false));
    announce(r, 'partnerLeft', { name });
    broadcast(r);
  }

  socket.on('create', (data) => {
    if (room) leave();
    const r = { code: makeCode(), players: [null, null], phase: 'lobby', result: null, endsAt: null, timer: null };
    rooms.set(r.code, r);
    attach(r, 0, data);
  });

  socket.on('join', (data) => {
    if (room) leave();
    const code = String((data && data.code) || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    const r = rooms.get(code);
    if (!r) return socket.emit('fail', { message: 'Aucun salon ne porte ce code… Vérifie les 4 lettres avec ta pote.' });
    const slot = !r.players[0] ? 0 : !r.players[1] ? 1 : -1;
    if (slot < 0) return socket.emit('fail', { message: 'Ce salon est déjà complet : deux chasseuses y sont enfermées.' });
    attach(r, slot, data);
  });

  socket.on('leave', leave);

  socket.on('look', (data) => {
    if (!room || room.phase === 'playing') return;
    me.name = S.sanitizeName(data && data.name);
    me.look = S.sanitizeLook(data && data.look);
    broadcast(room);
  });

  socket.on('ready', (value) => {
    if (!room || room.phase === 'playing') return;
    me.ready = !!value;
    if (room.players.every((p) => p && p.ready)) startGame(room);
    else broadcast(room);
  });

  socket.on('move', (d) => {
    if (!playing() || !d) return;
    const x = Number(d.x), y = Number(d.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    me.x = Math.min(S.FLOOR.maxX, Math.max(S.FLOOR.minX, x));
    me.y = Math.min(S.FLOOR.maxY, Math.max(S.FLOOR.minY, y));
    me.dir = ['up', 'down', 'left', 'right'].includes(d.dir) ? d.dir : 'down';
    me.moving = !!d.moving;
    socket.to(room.code).emit('moved', { slot: me.slot, x: me.x, y: me.y, dir: me.dir, moving: me.moving });
  });

  // Indices secrets : envoyés seulement à la joueuse qui a le droit de les voir.
  socket.on('inspect', (target) => {
    if (!playing()) return;
    const P = room.puzzle;
    if (target === 'mirror' && me.slot === S.ROLES.mirror && near(me, S.SPOTS.mirror)) {
      socket.emit('secret', { target, symbols: P.symbols });
    } else if (target === 'portrait' && me.slot === S.ROLES.portrait && near(me, S.SPOTS.portrait)) {
      socket.emit('secret', { target, order: P.candleOrder });
    } else if (target === 'hints' && me.slot === S.ROLES.hints && near(me, S.SPOTS.fireplace, S.TEAM_RADIUS + 10)) {
      socket.emit('secret', { target, mantel: P.mantel });
    }
  });

  // Énigme 1 : le coffret
  socket.on('coffret', (code) => {
    if (!playing() || me.slot !== S.ROLES.coffret || room.progress.coffret) return;
    if (!near(me, S.SPOTS.coffret)) return;
    const ok = Array.isArray(code) && code.length === 3 && code.every((v, i) => Number(v) === room.puzzle.symbols[i]);
    if (ok) {
      room.progress.coffret = true;
      giveRelic(room, 'cle', me.slot);
    } else {
      announce(room, 'coffretWrong', { by: me.slot });
    }
  });

  // Énigme 2 : les bougies
  socket.on('candle', (value) => {
    if (!playing() || me.slot !== S.ROLES.candle) return;
    const pr = room.progress;
    const i = Number(value);
    if (pr.candlesDone || !(i >= 0 && i < 4) || pr.candles.includes(i)) return;
    if (!near(me, S.CANDLE_SPOTS[i])) return;
    if (i === room.puzzle.candleOrder[pr.candles.length]) {
      pr.candles.push(i);
      if (pr.candles.length === 4) {
        pr.candlesDone = true;
        giveRelic(room, 'bague', me.slot);
      } else {
        announce(room, 'candleLit', { i, by: me.slot });
        broadcast(room);
      }
    } else {
      pr.candles = [];
      announce(room, 'candlesOut', { i, by: me.slot });
      broadcast(room);
    }
  });

  // Énigme 3a : fouiller l'horloge
  socket.on('clock', (value) => {
    if (!playing() || me.slot !== S.ROLES.clock) return;
    const pr = room.progress;
    const i = Number(value);
    if (pr.medaillon || !(i >= 0 && i < 3) || pr.clockSearched.includes(i)) return;
    if (!near(me, S.SPOTS.clock)) return;
    pr.clockSearched.push(i);
    if (i === room.puzzle.clockSlot) {
      pr.medaillon = true;
      giveRelic(room, 'medaillon', me.slot);
    } else {
      announce(room, 'clockEmpty', { i, by: me.slot });
      broadcast(room);
    }
  });

  // Énigme 3b : poser les reliques sur la cheminée (toutes les deux devant)
  socket.on('place', (data) => {
    if (!playing() || !data) return;
    const pr = room.progress;
    if (pr.doorOpen) return;
    const niche = Number(data.niche);
    if (!(niche >= 0 && niche < 3)) return;
    if (!bothNearFireplace(room)) return socket.emit('evt', { type: 'needBoth' });

    if (data.relic === null) {
      if (pr.mantel[niche]) {
        pr.mantel[niche] = null;
        broadcast(room);
      }
      return;
    }
    const relic = String(data.relic);
    if (!pr.inventory.includes(relic) || pr.mantel.includes(relic) || pr.mantel[niche]) return;
    pr.mantel[niche] = relic;

    if (pr.mantel.every(Boolean)) {
      if (pr.mantel.every((r, k) => r === room.puzzle.mantel[k])) {
        pr.doorOpen = true;
        announce(room, 'doorOpen', { by: me.slot });
      } else {
        pr.mantel = [null, null, null];
        announce(room, 'mantelWrong', { by: me.slot });
      }
    } else {
      announce(room, 'placed', { niche, relic, by: me.slot });
    }
    broadcast(room);
  });

  // Fin : sortir par la porte
  socket.on('exit', () => {
    if (!playing() || !room.progress.doorOpen || !near(me, S.SPOTS.door)) return;
    me.exited = true;
    announce(room, 'exited', { slot: me.slot });
    if (room.players.every((p) => p && p.exited)) endGame(room, 'won');
    else broadcast(room);
  });

  socket.on('chat', (text) => {
    if (!room || !me) return;
    const clean = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    const now = Date.now();
    if (!clean || now - me.lastChat < 350) return;
    me.lastChat = now;
    io.to(room.code).emit('chat', { slot: me.slot, name: me.name, text: clean });
  });

  socket.on('disconnect', leave);
});

function start(port = PORT) {
  return new Promise((resolve) => {
    server.listen(port, () => resolve(server.address().port));
  });
}

if (require.main === module) {
  start().then((port) => {
    console.log(`🕯️  Minuit au Manoir est ouvert sur http://localhost:${port}`);
  });
}

module.exports = { start, server, io, rooms };
