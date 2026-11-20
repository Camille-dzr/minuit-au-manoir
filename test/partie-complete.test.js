'use strict';
/* Joue une partie entière avec deux clientes simulées : victoire, puis défaite au chrono. */
process.env.GAME_DURATION_MS = '6000';

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { io: connect } = require('socket.io-client');
const S = require('../public/shared.js');
const { start, server, io } = require('../server.js');

let url;
const sockets = [];

before(async () => {
  const port = await start(0);
  url = `http://localhost:${port}`;
});
after(() => {
  sockets.forEach((s) => s.close());
  io.close();
  server.close();
});

function client() {
  const s = connect(url, { transports: ['websocket'], forceNew: true });
  sockets.push(s);
  return s;
}
function waitFor(socket, event, pred = () => true, ms = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Délai dépassé en attendant « ${event} »`)), ms);
    const handler = (data) => {
      if (!pred(data)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(data);
    };
    socket.on(event, handler);
  });
}
const moveTo = (s, spot) => s.emit('move', { x: spot.x, y: spot.y + 10, dir: 'up', moving: false });
const tick = () => new Promise((r) => setTimeout(r, 40));

async function setupRoom() {
  const a = client(), b = client();
  const joinedA = waitFor(a, 'joined');
  a.emit('create', { name: 'Iris', look: { hair: 'carre', outfit: 'redingote', accessory: 'baguette', skin: 'ebene' } });
  const { code, slot } = await joinedA;
  assert.strictEqual(slot, 0);
  assert.match(code, /^[A-Z]{4}$/);
  const joinedB = waitFor(b, 'joined');
  b.emit('join', { code: code.toLowerCase(), name: 'Nova', look: { hair: 'tresses' } });
  assert.strictEqual((await joinedB).slot, 1);
  const started = waitFor(a, 'state', (st) => st.phase === 'playing');
  a.emit('ready', true);
  b.emit('ready', true);
  const st = await started;
  assert.strictEqual(st.players[1].look.hair, 'tresses');
  return { a, b, code };
}

test('une partie complète se termine par une victoire', async () => {
  const { a, b } = await setupRoom();

  // La joueuse B ne peut PAS lire le miroir : aucun secret ne lui est envoyé.
  moveTo(b, S.SPOTS.mirror);
  let leaked = false;
  b.once('secret', () => (leaked = true));
  b.emit('inspect', 'mirror');
  await tick();
  assert.strictEqual(leaked, false, 'le miroir ne doit rien révéler à la joueuse 2');

  // Énigme 1 : A lit le miroir, B se trompe puis entre le bon code
  moveTo(a, S.SPOTS.mirror);
  await tick();
  const mirror = waitFor(a, 'secret', (d) => d.target === 'mirror');
  a.emit('inspect', 'mirror');
  const { symbols } = await mirror;
  moveTo(b, S.SPOTS.coffret);
  await tick();
  const wrong = waitFor(a, 'evt', (e) => e.type === 'coffretWrong');
  b.emit('coffret', [(symbols[0] + 1) % 6, symbols[1], symbols[2]]);
  await wrong;
  const key = waitFor(a, 'evt', (e) => e.type === 'relic' && e.relic === 'cle');
  b.emit('coffret', symbols);
  await key;

  // Énigme 2 : B lit le portrait, A allume les bougies (une erreur d'abord)
  moveTo(b, S.SPOTS.portrait);
  await tick();
  const portrait = waitFor(b, 'secret', (d) => d.target === 'portrait');
  b.emit('inspect', 'portrait');
  const { order } = await portrait;
  const wrongCandle = order[1];
  moveTo(a, S.CANDLE_SPOTS[wrongCandle]);
  await tick();
  const out = waitFor(b, 'evt', (e) => e.type === 'candlesOut');
  a.emit('candle', wrongCandle);
  await out;
  const ring = waitFor(b, 'evt', (e) => e.type === 'relic' && e.relic === 'bague');
  for (const i of order) {
    moveTo(a, S.CANDLE_SPOTS[i]);
    await tick();
    a.emit('candle', i);
    await tick();
  }
  await ring;

  // Énigme 3 : B fouille l'horloge, A voit les gravures, on pose ensemble
  moveTo(b, S.SPOTS.clock);
  await tick();
  const medal = waitFor(a, 'evt', (e) => e.type === 'relic' && e.relic === 'medaillon');
  for (const i of [0, 1, 2]) {
    b.emit('clock', i);
    await tick();
  }
  await medal;

  moveTo(a, S.SPOTS.fireplace);
  await tick();
  const hintsP = waitFor(a, 'secret', (d) => d.target === 'hints');
  a.emit('inspect', 'hints');
  const { mantel } = await hintsP;

  // B est encore loin : la pose est refusée
  const refused = waitFor(a, 'evt', (e) => e.type === 'needBoth');
  a.emit('place', { niche: 0, relic: mantel[0] });
  await refused;

  moveTo(b, S.SPOTS.fireplace);
  await tick();
  // Mauvais placement : les reliques retombent
  const bad = waitFor(a, 'evt', (e) => e.type === 'mantelWrong');
  a.emit('place', { niche: 0, relic: mantel[1] });
  await tick();
  b.emit('place', { niche: 1, relic: mantel[0] });
  await tick();
  a.emit('place', { niche: 2, relic: mantel[2] });
  await bad;

  const opened = waitFor(b, 'evt', (e) => e.type === 'doorOpen');
  a.emit('place', { niche: 0, relic: mantel[0] });
  await tick();
  b.emit('place', { niche: 1, relic: mantel[1] });
  await tick();
  a.emit('place', { niche: 2, relic: mantel[2] });
  await opened;

  // Sortie : il faut que les deux passent la porte
  moveTo(a, S.SPOTS.door);
  await tick();
  a.emit('exit');
  await waitFor(b, 'evt', (e) => e.type === 'exited' && e.slot === 0);
  const won = waitFor(a, 'state', (st) => st.phase === 'ended');
  moveTo(b, S.SPOTS.door);
  await tick();
  b.emit('exit');
  const end = await won;
  assert.strictEqual(end.result, 'won');
  assert.ok(end.remainingAtEnd > 0);

  // Rejouer ensemble relance une partie neuve
  const again = waitFor(a, 'state', (st) => st.phase === 'playing');
  a.emit('ready', true);
  b.emit('ready', true);
  const fresh = await again;
  assert.deepStrictEqual(fresh.progress.inventory, []);
  a.close();
  b.close();
});

test('minuit sonne : le manoir les enferme', async () => {
  const { a, b } = await setupRoom();
  const end = await waitFor(a, 'state', (st) => st.phase === 'ended', 9000);
  assert.strictEqual(end.result, 'lost');
  a.close();
  b.close();
});

test('un code inconnu est refusé poliment', async () => {
  const c = client();
  const fail = waitFor(c, 'fail');
  c.emit('join', { code: 'ZZZZ', name: 'Test' });
  const { message } = await fail;
  assert.match(message, /code/);
  c.close();
});
