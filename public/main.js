/* Minuit au Manoir — logique du navigateur : écrans, réseau, déplacements, énigmes. */
(() => {
  'use strict';
  const S = window.SHARED, C = window.Character, Room = window.Room;
  const $ = (sel) => document.querySelector(sel);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } },
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const socket = io();
  const DIRS = ['down', 'right', 'up', 'left'];

  const app = {
    screen: 'home',
    mode: null,
    pendingCode: '',
    slot: null,
    code: null,
    st: null,
    offset: 0,
    look: S.sanitizeLook(store.get('mam-look', S.defaultLook())),
    name: store.get('mam-name', ''),
    previewDir: 0,
    customReturn: null,
    muted: store.get('mam-muted', false),
  };

  const game = {
    me: null,
    other: null,
    keys: new Set(),
    lastSent: 0,
    lastPayload: '',
    near: null,
    modal: null,
    secrets: {},
    dials: [0, 0, 0],
    selRelic: null,
    lastBoth: null,
    expr: [{}, {}],
    fx: { puffs: [], bursts: [], flash: 0 },
    solution: null,
  };

  // ---------- écrans ----------
  function show(name) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + name));
    app.screen = name;
    window.scrollTo({ top: 0 });
  }
  const partnerSlot = () => (app.slot === 0 ? 1 : 0);
  const nameOf = (slot) => (app.st && app.st.players[slot] ? app.st.players[slot].name : 'ta partenaire');
  const partnerName = () => nameOf(partnerSlot());
  const serverNow = () => Date.now() + app.offset;
  const remainingMs = () => {
    const st = app.st;
    if (!st) return 0;
    if (st.phase === 'playing') return Math.max(0, st.endsAt - serverNow());
    if (st.phase === 'ended') return st.remainingAtEnd || 0;
    return st.duration;
  };
  const fmt = (ms) => {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  // ---------- sons (synthétisés, aucun fichier) ----------
  let actx = null;
  function unlockAudio() {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
    } catch { actx = null; }
  }
  function tone(freq, dur, type = 'sine', vol = 0.12, when = 0) {
    if (!actx || app.muted) return;
    const t = actx.currentTime + when;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(actx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  const sfx = {
    start: () => { tone(196, 0.9, 'sine', 0.1); tone(294, 0.9, 'sine', 0.06, 0.15); },
    good: () => [660, 880, 1320].forEach((f, i) => tone(f, 0.4, 'triangle', 0.1, i * 0.09)),
    bad: () => { tone(160, 0.4, 'sawtooth', 0.06); tone(110, 0.5, 'sawtooth', 0.05, 0.08); },
    tick: () => tone(1250, 0.06, 'square', 0.03),
    door: () => [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.6, 'triangle', 0.09, i * 0.12)),
    win: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.5, 'triangle', 0.1, i * 0.14)),
    midnight: () => { for (let i = 0; i < 12; i++) { tone(147, 1.4, 'sine', 0.16, i * 0.42); tone(294, 0.9, 'sine', 0.05, i * 0.42); } },
  };

  // ---------- toasts ----------
  function toast(text, kind = 'info', ms = 2800) {
    const box = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.textContent = text;
    box.appendChild(el);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => el.classList.add('out'), ms);
    setTimeout(() => el.remove(), ms + 450);
  }

  // ---------- accueil ----------
  const homeError = (msg) => { $('#home-error').textContent = msg || ''; };
  const urlCode = (new URLSearchParams(location.search).get('code') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  if (urlCode) {
    $('#join-code').value = urlCode;
    $('.home-actions').classList.add('invited');
    homeError('');
    $('#home-error').insertAdjacentHTML('beforebegin', '<p class="hint">Ta pote t’invite dans son salon : clique sur « Rejoindre une partie ».</p>');
  }
  $('#join-code').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); });
  $('#btn-create').onclick = () => {
    unlockAudio();
    app.mode = 'create';
    homeError('');
    openCustom(null);
  };
  $('#join-form').onsubmit = (e) => {
    e.preventDefault();
    unlockAudio();
    const code = $('#join-code').value;
    if (code.length !== 4) return homeError('Le code du salon fait 4 lettres.');
    app.mode = 'join';
    app.pendingCode = code;
    homeError('');
    openCustom(null);
  };

  // ---------- personnalisation ----------
  function openCustom(returnTo) {
    app.customReturn = returnTo;
    $('#name').value = app.name || '';
    $('#preview-name').textContent = app.name || 'Chasseuse';
    $('#custom-error').textContent = '';
    $('#btn-custom-ok').textContent = returnTo ? 'Enregistrer' : app.mode === 'join' ? 'Rejoindre le salon' : 'Créer le salon';
    refreshOptions();
    show('custom');
    setTimeout(() => { if (!app.name) $('#name').focus(); }, 50);
  }

  function buildOptions() {
    document.querySelectorAll('.opt-group').forEach((group) => {
      const key = group.dataset.key;
      const box = group.querySelector('.opts');
      box.innerHTML = '';
      S.LOOKS[key].forEach((opt) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'opt';
        b.dataset.id = opt.id;
        b.title = opt.label;
        b.setAttribute('aria-label', opt.label);
        if (key === 'skin') {
          b.classList.add('swatch');
          b.style.setProperty('--sw', opt.color);
        } else {
          b.innerHTML = `<canvas width="72" height="72"></canvas><span>${esc(opt.label)}</span>`;
        }
        b.onclick = () => {
          app.look[key] = opt.id;
          refreshOptions();
        };
        box.appendChild(b);
      });
    });
  }

  function refreshOptions() {
    document.querySelectorAll('.opt-group').forEach((group) => {
      const key = group.dataset.key;
      group.querySelectorAll('.opt').forEach((b) => {
        const sel = app.look[key] === b.dataset.id;
        b.classList.toggle('sel', sel);
        b.setAttribute('aria-pressed', sel ? 'true' : 'false');
        const cv = b.querySelector('canvas');
        if (!cv) return;
        const ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, 72, 72);
        const look = { ...app.look, [key]: b.dataset.id };
        if (key === 'hair') C.drawCharacter(ctx, { x: 36, y: 36 + 88 * 1.15, scale: 1.15, look, t: 0 });
        else if (key === 'outfit') C.drawCharacter(ctx, { x: 36, y: 68, scale: 0.55, look, t: 0 });
        else {
          ctx.save();
          ctx.translate(30, 30);
          ctx.scale(1.9, 1.9);
          C.drawAccessory(ctx, b.dataset.id, 0, b.dataset.id === 'baguette' ? 10 : -4, performance.now() / 1000);
          ctx.restore();
        }
      });
    });
  }

  $('#name').addEventListener('input', (e) => {
    $('#preview-name').textContent = S.sanitizeName(e.target.value);
    $('#custom-error').textContent = '';
  });
  $('#turn-left').onclick = () => { app.previewDir = (app.previewDir + 3) % 4; };
  $('#turn-right').onclick = () => { app.previewDir = (app.previewDir + 1) % 4; };
  $('#btn-custom-back').onclick = () => {
    if (app.customReturn) show(app.customReturn);
    else show('home');
  };
  $('#btn-custom-ok').onclick = () => {
    const raw = $('#name').value.trim();
    if (!raw) {
      $('#custom-error').textContent = 'Choisis un prénom pour ta chasseuse.';
      $('#name').focus();
      return;
    }
    app.name = S.sanitizeName(raw);
    store.set('mam-name', app.name);
    store.set('mam-look', app.look);
    if (app.slot !== null && app.code) {
      socket.emit('look', { name: app.name, look: app.look });
      show(app.customReturn || 'lobby');
      return;
    }
    $('#btn-custom-ok').disabled = true;
    if (app.mode === 'join') socket.emit('join', { code: app.pendingCode, name: app.name, look: app.look });
    else socket.emit('create', { name: app.name, look: app.look });
    setTimeout(() => { $('#btn-custom-ok').disabled = false; }, 1500);
  };

  const previewCtx = $('#preview').getContext('2d');
  let previewWalk = 0;
  function drawPreview(t, dt) {
    const ctx = previewCtx;
    const w = 320, h = 400;
    const bgG = ctx.createLinearGradient(0, 0, 0, h);
    bgG.addColorStop(0, '#24123a');
    bgG.addColorStop(1, '#0f0818');
    ctx.fillStyle = bgG;
    ctx.fillRect(0, 0, w, h);
    const beam = ctx.createRadialGradient(160, 60, 10, 160, 200, 260);
    beam.addColorStop(0, 'rgba(140,190,255,0.35)');
    beam.addColorStop(1, 'rgba(140,190,255,0)');
    ctx.fillStyle = beam;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(212,168,73,0.18)';
    ctx.beginPath();
    ctx.ellipse(160, 362, 110, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    previewWalk += dt * 7;
    const look = app.look;
    const walking = Math.floor(t / 3) % 2 === 1;
    const lp = C.drawCharacter(ctx, {
      x: 160, y: 360, scale: 2.55, look, dir: DIRS[app.previewDir], moving: walking, walk: previewWalk, t,
      expression: walking ? 'happy' : 'neutral', blink: t % 3.4 < 0.13,
    });
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const col = { lanterne: '150,230,255', baguette: '255,215,120', pendule: '200,140,255' }[lp.kind];
    const g = ctx.createRadialGradient(lp.x, lp.y, 0, lp.x, lp.y, 120);
    g.addColorStop(0, `rgba(${col},0.35)`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // ---------- vestibule ----------
  function renderLobby(st) {
    $('#lobby-code').textContent = st.code;
    document.querySelectorAll('.pcard').forEach((card) => {
      const slot = Number(card.dataset.slot);
      const p = st.players[slot];
      const role = slot === 0
        ? 'Voit le miroir et les gravures · allume les bougies'
        : 'Voit le portrait · ouvre le coffret et fouille l’horloge';
      if (!card.querySelector('canvas')) card.innerHTML = '<canvas width="180" height="230"></canvas><div class="pinfo"></div>';
      card.querySelector('.pinfo').innerHTML = p
        ? `<h3 style="color:${S.COLORS[slot]}">${esc(p.name)}${slot === app.slot ? ' (toi)' : ''}</h3>
           <p class="role">${role}</p>
           <span class="badge ${p.ready ? 'ready' : 'wait'}">${p.ready ? 'Prête !' : 'Se prépare…'}</span>`
        : `<h3>En attente…</h3><p class="role">Envoie le code <b>${esc(st.code)}</b> à ta pote.</p><span class="badge wait">Place libre</span>`;
    });
    const me = st.players[app.slot];
    const other = st.players[partnerSlot()];
    const btn = $('#btn-ready');
    btn.textContent = me && me.ready ? 'Finalement, pas encore' : 'Je suis prête !';
    btn.classList.toggle('is-ready', !!(me && me.ready));
    $('#lobby-status').textContent = !other
      ? 'La partie commencera quand ta pote vous aura rejointes et que vous serez prêtes toutes les deux.'
      : me && me.ready && !other.ready
        ? `On attend que ${other.name} soit prête…`
        : !me || !me.ready
          ? 'Clique sur « Je suis prête ! » quand tu veux commencer.'
          : '';
  }

  function drawLobby(t) {
    const st = app.st;
    if (!st) return;
    document.querySelectorAll('.pcard canvas').forEach((cv) => {
      const slot = Number(cv.closest('.pcard').dataset.slot);
      const p = st.players[slot];
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, 180, 230);
      const g = ctx.createRadialGradient(90, 80, 10, 90, 120, 140);
      g.addColorStop(0, 'rgba(140,190,255,0.25)');
      g.addColorStop(1, 'rgba(140,190,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 180, 230);
      if (p) {
        C.drawCharacter(ctx, {
          x: 90, y: 214, scale: 1.6, look: p.look, dir: 'down', moving: p.ready, walk: t * 7, t: t + slot,
          expression: p.ready ? 'happy' : 'neutral', blink: (t + slot * 1.3) % 3.5 < 0.13, ring: S.COLORS[slot],
        });
      } else {
        ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 2);
        ctx.fillStyle = '#cfd8ff';
        ctx.beginPath();
        ctx.ellipse(90, 120, 36, 70, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#1a0d22';
        ctx.font = 'bold 48px Georgia';
        ctx.textAlign = 'center';
        ctx.fillText('?', 90, 136);
      }
    });
  }

  $('#btn-ready').onclick = () => {
    unlockAudio();
    const me = app.st && app.st.players[app.slot];
    socket.emit('ready', !(me && me.ready));
  };
  $('#btn-edit').onclick = () => openCustom('lobby');
  $('#btn-copy').onclick = async () => {
    const link = `${location.origin}/?code=${app.code}`;
    try {
      await navigator.clipboard.writeText(link);
      $('#copy-msg').textContent = 'Lien copié ! Envoie-le à ta pote.';
    } catch {
      $('#copy-msg').textContent = link;
    }
  };

  // ---------- réseau ----------
  socket.on('connect', () => {
    if (app.code && app.slot !== null) {
      socket.emit('join', { code: app.code, name: app.name, look: app.look });
    }
  });
  socket.on('disconnect', () => {
    if (app.code) toast('Connexion perdue avec le manoir… on réessaie.', 'bad', 3500);
  });
  socket.on('joined', ({ code, slot }) => {
    app.code = code;
    app.slot = slot;
    $('#btn-custom-ok').disabled = false;
    history.replaceState(null, '', '?code=' + code);
    if (app.screen !== 'custom' || !app.customReturn) show('lobby');
  });
  socket.on('fail', ({ message }) => {
    $('#btn-custom-ok').disabled = false;
    app.code = null;
    app.slot = null;
    show('home');
    homeError(message);
  });
  socket.on('state', (st) => {
    app.offset = st.now - Date.now();
    const prev = app.st;
    app.st = st;
    onState(prev, st);
  });
  socket.on('moved', (d) => {
    if (!game.other || d.slot === app.slot) return;
    game.other.tx = d.x;
    game.other.ty = d.y;
    game.other.dir = d.dir;
    game.other.moving = d.moving;
  });
  socket.on('secret', (d) => {
    game.secrets[d.target] = d;
    if (d.target === 'mirror') openMirror(d);
    else if (d.target === 'portrait') openPortrait(d);
    else if (d.target === 'hints' && game.modal === 'mantel') renderMantel();
  });
  socket.on('evt', handleEvt);
  socket.on('chat', addChat);

  function onState(prev, st) {
    const o = st.players[partnerSlot()], m = st.players[app.slot];
    if (st.phase !== 'lobby') {
      if (o && game.other) game.other.exited = o.exited;
      if (m && game.me) game.me.exited = m.exited;
    }
    if (st.phase === 'playing') {
      if (!prev || prev.phase !== 'playing') enterGame(st);
      renderHud();
      refreshModal();
      $('#end').classList.add('hidden');
    } else if (st.phase === 'ended') {
      if (app.screen !== 'custom') show('game');
      closeModal();
      renderHud();
      showEnd(st);
    } else {
      if (prev && prev.phase !== 'lobby') {
        closeModal();
        $('#end').classList.add('hidden');
      }
      if (app.screen !== 'custom') show('lobby');
      renderLobby(st);
    }
  }

  function enterGame(st) {
    show('game');
    const mp = st.players[app.slot], op = st.players[partnerSlot()];
    game.me = { x: mp.x, y: mp.y, dir: 'up', moving: false, walk: 0, exited: false };
    game.other = { x: op.x, y: op.y, tx: op.x, ty: op.y, dir: 'up', moving: false, walk: 0, exited: false, look: op.look, name: op.name };
    game.secrets = {};
    game.dials = [0, 0, 0];
    game.selRelic = null;
    game.solution = null;
    game.expr = [{}, {}];
    game.fx = { puffs: [], bursts: [], flash: 0 };
    game.keys.clear();
    closeModal();
    $('#end').classList.add('hidden');
    $('#chat-log').innerHTML = $('#chat-log').innerHTML || '<p class="empty">Le salon est silencieux… Parlez-vous ici, en vocal ou au téléphone !</p>';
    renderRoles();
  }

  function renderRoles() {
    const me = app.slot, pn = esc(partnerName());
    const sees = me === 0 ? 'le miroir et les gravures de la cheminée' : 'le portrait de Lord Ombrelune';
    const acts = me === 0 ? 'les quatre bougies' : 'le coffret et l’horloge';
    $('#roles').innerHTML = `<h3>Ton rôle</h3>
      <p><span class="dot" style="background:${S.COLORS[me]};color:${S.COLORS[me]}"></span>Ta couleur : <b>${S.COLOR_NAMES[me]}</b>. Ce qui scintille dans ta couleur t’attend.</p>
      <p>👁 Tu vois : ${sees}.</p>
      <p>✋ Tu agis sur : ${acts}.</p>
      <p><span class="dot" style="background:${S.COLORS[partnerSlot()]};color:${S.COLORS[partnerSlot()]}"></span>Le reste appartient à <b>${pn}</b>. La cheminée et la porte se font à deux.</p>`;
  }

  // ---------- événements de jeu ----------
  function setExpr(slot, type, secs = 2.5) {
    game.expr[slot] = { type, until: performance.now() / 1000 + secs };
  }
  function burstAt(x, y, color) {
    game.fx.bursts.push({ x, y, t0: performance.now() / 1000, color });
    game.fx.bursts = game.fx.bursts.slice(-6);
  }

  function handleEvt(e) {
    const now = performance.now() / 1000;
    const who = e.by != null ? nameOf(e.by) : '';
    switch (e.type) {
      case 'start':
        sfx.start();
        toast('La porte claque derrière vous… Trouvez les trois reliques avant minuit !', 'info', 4500);
        break;
      case 'relic': {
        const r = S.relic(e.relic);
        sfx.good();
        toast(`✦ ${r.short} trouvée par ${who} !`, 'good', 3500);
        setExpr(0, 'happy');
        setExpr(1, 'happy');
        game.fx.flash = 1;
        const at = { cle: Room.VIS.coffret, bague: { x: 480, y: 330 }, medaillon: Room.VIS.clock }[e.relic];
        burstAt(at.x, at.y, S.COLORS[e.by]);
        if (game.modal === 'coffret' && e.relic === 'cle') closeModal();
        break;
      }
      case 'coffretWrong':
        sfx.bad();
        setExpr(e.by, 'scared');
        toast(e.by === app.slot ? 'Le coffret claque : ce n’est pas la bonne combinaison.' : `${who} s’est trompée de combinaison sur le coffret !`, 'bad');
        if (game.modal === 'coffret') shakeModal();
        break;
      case 'candleLit':
        sfx.tick();
        burstAt(S.CANDLE_SPOTS[e.i].x, S.CANDLE_SPOTS[e.i].y - 84, S.COLORS[0]);
        break;
      case 'candlesOut':
        sfx.bad();
        setExpr(0, 'scared');
        setExpr(1, 'scared');
        S.CANDLE_SPOTS.forEach((c, i) => game.fx.puffs.push({ i, t0: now }));
        game.fx.puffs = game.fx.puffs.slice(-8);
        toast(`Un souffle glacé éteint toutes les bougies ! La bougie ${S.CANDLES[e.i].label} n’était pas la bonne.`, 'bad', 3500);
        break;
      case 'clockEmpty':
        sfx.tick();
        toast(e.by === app.slot ? 'Rien ici… que de la poussière et des toiles d’araignée.' : `${who} fouille l’horloge… rien pour l’instant.`);
        break;
      case 'placed':
        sfx.tick();
        break;
      case 'mantelWrong':
        sfx.bad();
        setExpr(0, 'scared');
        setExpr(1, 'scared');
        if (game.modal === 'mantel') shakeModal();
        toast('Les reliques tremblent et retombent ! Elles n’étaient pas à la bonne place.', 'bad', 3800);
        break;
      case 'needBoth':
        toast(`Il faut être toutes les deux devant la cheminée.`, 'bad');
        break;
      case 'doorOpen':
        sfx.door();
        setExpr(0, 'happy', 4);
        setExpr(1, 'happy', 4);
        game.fx.flash = 1.4;
        burstAt(Room.VIS.door.x, Room.VIS.door.y, S.COLORS[0]);
        burstAt(Room.VIS.fireplace.x, Room.VIS.fireplace.y, S.COLORS[1]);
        closeModal();
        toast('La porte du manoir s’ouvre ! Sortez vite, toutes les deux !', 'good', 4500);
        break;
      case 'exited':
        // la deuxième à sortir termine la partie : pas de « attends-la »
        if (app.st && app.st.players[e.slot === 0 ? 1 : 0] && app.st.players[e.slot === 0 ? 1 : 0].exited) break;
        toast(e.slot === app.slot ? `Tu es dehors ! Attends ${partnerName()}…` : `${nameOf(e.slot)} est sortie ! Rejoins-la !`, 'good', 3500);
        break;
      case 'end':
        game.solution = e.solution || null;
        if (e.result === 'won') sfx.win();
        else sfx.midnight();
        break;
      case 'partnerLeft':
        toast(`${e.name} a quitté le manoir.`, 'bad', 4500);
        break;
    }
  }

  // ---------- interactions ----------
  function getInteractables() {
    const pr = app.st.progress;
    const hasLoose = pr.inventory.some((r) => !pr.mantel.includes(r));
    const L = [
      { id: 'mirror', spot: S.SPOTS.mirror, owner: S.ROLES.mirror, glow: !pr.coffret },
      { id: 'coffret', spot: S.SPOTS.coffret, owner: S.ROLES.coffret, glow: !pr.coffret },
      { id: 'portrait', spot: S.SPOTS.portrait, owner: S.ROLES.portrait, glow: !pr.candlesDone },
      { id: 'clock', spot: S.SPOTS.clock, owner: S.ROLES.clock, glow: !pr.medaillon },
      { id: 'fireplace', spot: S.SPOTS.fireplace, owner: -1, glow: !pr.doorOpen && (hasLoose || app.slot === S.ROLES.hints) },
      { id: 'door', spot: S.SPOTS.door, owner: -1, glow: pr.doorOpen },
    ];
    S.CANDLE_SPOTS.forEach((c, i) => {
      L.push({ id: 'candle', i, spot: c, owner: S.ROLES.candle, glow: !pr.candlesDone && !pr.candles.includes(i) });
    });
    return L;
  }

  function labelFor(it) {
    const pr = app.st.progress;
    const mine = it.owner === -1 || it.owner === app.slot;
    const pn = partnerName();
    switch (it.id) {
      case 'mirror': return mine ? 'Regarder dans le miroir' : `Miroir : seule ${pn} y voit clair`;
      case 'coffret': return pr.coffret ? 'Coffret ouvert' : mine ? 'Tourner les symboles du coffret' : `Coffret : ${pn} seule peut l’ouvrir`;
      case 'portrait': return mine ? 'Observer le portrait' : `Portrait : il ne se confie qu’à ${pn}`;
      case 'candle': {
        const c = S.CANDLES[it.i];
        if (pr.candlesDone || pr.candles.includes(it.i)) return `Bougie ${c.label} allumée`;
        return mine ? `Allumer la bougie ${c.label}` : `Bougie ${c.label} : ${pn} l’allume`;
      }
      case 'clock': return pr.medaillon ? 'Horloge fouillée' : mine ? 'Fouiller l’horloge' : `Horloge : ${pn} peut la fouiller`;
      case 'fireplace': return pr.doorOpen ? 'Les reliques brillent' : 'Cheminée : poser les reliques';
      case 'door': return pr.doorOpen ? 'Sortir du manoir !' : 'Porte scellée';
    }
    return '';
  }

  function findNear() {
    if (!game.me || game.me.exited) return null;
    let best = null, bd = Infinity;
    for (const it of getInteractables()) {
      const radius = it.id === 'fireplace' ? S.INTERACT_RADIUS + 30 : S.INTERACT_RADIUS;
      const d = S.dist(game.me, it.spot);
      if (d < radius && d < bd) {
        bd = d;
        best = it;
      }
    }
    return best;
  }

  function interact() {
    const it = game.near;
    if (!it || !app.st || app.st.phase !== 'playing') return;
    unlockAudio();
    const pr = app.st.progress;
    const mine = it.owner === -1 || it.owner === app.slot;
    const pn = partnerName();
    switch (it.id) {
      case 'mirror':
        if (!mine) return toast(`Le miroir reste embué pour toi… Seule ${pn} peut y lire quelque chose.`);
        socket.emit('inspect', 'mirror');
        break;
      case 'coffret':
        if (pr.coffret) return toast('Le coffret est ouvert. Il ne contient plus que du velours.');
        if (!mine) return toast(`Un sort verrouille le coffret : seule ${pn} peut tourner ses symboles. Décris-lui ce que tu vois !`);
        openCoffret();
        break;
      case 'portrait':
        if (!mine) return toast(`Lord Ombrelune te fixe sans un mot… il ne se confie qu’à ${pn}.`);
        socket.emit('inspect', 'portrait');
        break;
      case 'candle':
        if (pr.candlesDone) return toast('Les quatre bougies brûlent fièrement.');
        if (!mine) return toast(`La mèche refuse ta flamme. C’est ${pn} qui peut allumer les bougies : guide-la !`);
        if (pr.candles.includes(it.i)) return toast('Cette bougie brûle déjà.');
        socket.emit('candle', it.i);
        break;
      case 'clock':
        if (pr.medaillon) return toast('L’horloge est vide… à part son tic-tac.');
        if (!mine) return toast(`Le balancier se fige quand tu approches. C’est ${pn} qui doit fouiller l’horloge.`);
        openClock();
        break;
      case 'fireplace':
        if (pr.doorOpen) return toast('Les trois reliques brillent sur la cheminée. Filez vers la porte !');
        openMantel();
        if (app.slot === S.ROLES.hints) socket.emit('inspect', 'hints');
        break;
      case 'door':
        if (pr.doorOpen) socket.emit('exit');
        else toast(`La porte est scellée. Son sceau compte ${pr.inventory.length}/3 reliques… qui doivent reposer sur la cheminée.`);
        break;
    }
  }

  // ---------- fenêtres d'énigmes ----------
  const modalEl = $('#modal');
  const modalBody = modalEl.querySelector('.modal-body');
  function openModal(type, html) {
    game.modal = type;
    modalEl.dataset.type = type;
    modalBody.innerHTML = html;
    modalEl.classList.remove('hidden');
    game.keys.clear();
  }
  function closeModal() {
    game.modal = null;
    modalEl.classList.add('hidden');
    modalBody.innerHTML = '';
  }
  function shakeModal() {
    const card = modalEl.querySelector('.modal-card');
    card.classList.remove('shake');
    void card.offsetWidth;
    card.classList.add('shake');
  }
  modalEl.querySelector('.modal-close').onclick = closeModal;
  modalEl.addEventListener('mousedown', (e) => { if (e.target === modalEl) closeModal(); });
  const icon = (id) => Room.relicIcon(id, 64);
  const symHTML = (i) => `<span>${S.SYMBOLS[i].glyph}</span><small>${esc(S.SYMBOLS[i].label)}</small>`;

  function openMirror(d) {
    openModal('mirror', `<h2>Le miroir des âmes</h2>
      <div class="mirror-glass">${d.symbols.map((s, k) => `<div class="mirror-sym" style="--d:${k * 0.45}s">${symHTML(s)}</div>`).join('')}</div>
      <p>Trois symboles se dessinent dans la buée, de gauche à droite.<br>Dicte-les à <b>${esc(partnerName())}</b> : elle seule peut les entrer sur le coffret.</p>`);
  }

  function openPortrait(d) {
    const names = d.order.map((i) => S.CANDLES[i].label).join(', puis ');
    openModal('portrait', `<h2>Le portrait de Lord Ombrelune</h2>
      <div class="painting"><div class="painting-inner">
        <div class="painted-candles">${d.order.map((ci, k) => `<div class="pc"><div class="pc-flame"></div><div class="pc-wax" style="--wax:${S.CANDLES[ci].wax}"></div><small>${k + 1}</small></div>`).join('')}</div>
        <p class="painting-caption">« Allumez-les dans l’ordre où je les ai peintes. »</p>
      </div></div>
      <p>Dans le tableau, les bougies s’allument dans cet ordre : <b>${esc(names)}</b>.<br>Guide <b>${esc(partnerName())}</b> : elle seule peut allumer les vraies bougies du salon.</p>`);
  }

  function coffretHTML() {
    return `<h2>Le coffret aux symboles</h2>
      <p>Tourne les trois molettes pour former la combinaison que <b>${esc(partnerName())}</b> lit dans le miroir.</p>
      <div class="dials">${[0, 1, 2].map((k) => `<div class="dial">
          <button class="btn small" data-action="dial" data-k="${k}" data-d="-1" aria-label="Symbole précédent">▲</button>
          <div class="dial-face">${symHTML(game.dials[k])}</div>
          <button class="btn small" data-action="dial" data-k="${k}" data-d="1" aria-label="Symbole suivant">▼</button>
        </div>`).join('')}</div>
      <button class="btn primary" data-action="coffret-open">Tourner la clé du coffret</button>`;
  }
  function openCoffret() { openModal('coffret', coffretHTML()); }

  function clockHTML() {
    const pr = app.st.progress;
    const foundAt = pr.medaillon ? pr.clockSearched[pr.clockSearched.length - 1] : -1;
    return `<h2>L’horloge de grand-père</h2>
      <p>Trois cachettes possibles derrière la vitre. Fouille-les !</p>
      <div class="compartments">${S.CLOCK_COMPARTMENTS.map((name, k) => {
        if (k === foundAt) return `<button class="compartment" disabled><img src="${icon('medaillon')}" alt=""><span>Le médaillon !</span></button>`;
        if (pr.clockSearched.includes(k)) return `<button class="compartment" disabled><span class="web">🕸</span><span>Vide…</span></button>`;
        return `<button class="compartment" data-action="clock" data-k="${k}" ${pr.medaillon ? 'disabled' : ''}>Fouiller<br>${esc(name)}</button>`;
      }).join('')}</div>
      ${pr.medaillon ? `<p>Le médaillon rejoint vos reliques. Direction la cheminée !</p>` : ''}`;
  }
  function openClock() { openModal('clock', clockHTML()); }

  function bothNear() {
    if (!game.me || !game.other) return false;
    const r = S.TEAM_RADIUS;
    return !game.me.exited && !game.other.exited && S.dist(game.me, S.SPOTS.fireplace) <= r
      && S.dist({ x: game.other.tx, y: game.other.ty }, S.SPOTS.fireplace) <= r;
  }

  function mantelHTML() {
    const pr = app.st.progress;
    const hints = game.secrets.hints && game.secrets.hints.mantel;
    const seer = app.slot === S.ROLES.hints;
    const both = bothNear();
    const pn = esc(partnerName());
    return `<h2>La cheminée aux trois niches</h2>
      <p class="status ${both ? 'ok' : 'warn'}">${both ? 'Vous êtes toutes les deux devant la cheminée.' : `Il faut être toutes les deux devant la cheminée : appelle ${pn} !`}</p>
      <div class="niches">${[0, 1, 2].map((k) => {
        const placed = pr.mantel[k];
        const engr = seer
          ? hints ? `<span class="engraving"><img src="${icon(hints[k])}" alt=""><small>Gravure : ${esc(S.relic(hints[k]).short)}</small></span>`
                  : '<span class="engraving blank"><small>Tu déchiffres…</small></span>'
          : '<span class="engraving blank"><small>Gravure illisible pour toi</small></span>';
        return `<button class="niche" data-action="niche" data-k="${k}">
          <span class="niche-pos">${S.NICHES[k]}</span>${engr}
          ${placed ? `<img class="placed" src="${icon(placed)}" alt="${esc(S.relic(placed).short)}">` : ''}
        </button>`;
      }).join('')}</div>
      <div class="relic-bar">${S.RELICS.map((r) => {
        const has = pr.inventory.includes(r.id), used = pr.mantel.includes(r.id);
        return `<button class="relic-pick ${game.selRelic === r.id ? 'sel' : ''}" data-action="pick" data-relic="${r.id}" ${!has || used ? 'disabled' : ''}>
          <img src="${icon(r.id)}" alt=""><span>${esc(r.short)}</span><small>${!has ? 'pas encore trouvée' : used ? 'posée' : 'à poser'}</small></button>`;
      }).join('')}</div>
      <p class="hint">${seer ? `Toi seule vois les gravures : dis à ${pn} où va chaque relique.` : `Les gravures sont invisibles pour toi : ${pn} sait où va chaque relique.`}
      Choisis une relique, puis une niche. Clique sur une niche occupée pour reprendre sa relique.</p>`;
  }
  function openMantel() {
    game.lastBoth = bothNear();
    openModal('mantel', mantelHTML());
  }
  function renderMantel() { if (game.modal === 'mantel') modalBody.innerHTML = mantelHTML(); }

  function refreshModal() {
    if (game.modal === 'mantel') renderMantel();
    else if (game.modal === 'clock') modalBody.innerHTML = clockHTML();
    else if (game.modal === 'coffret' && app.st.progress.coffret) closeModal();
  }

  modalBody.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    if (!b || b.disabled) return;
    const k = Number(b.dataset.k);
    switch (b.dataset.action) {
      case 'dial':
        game.dials[k] = (game.dials[k] + Number(b.dataset.d) + S.SYMBOLS.length) % S.SYMBOLS.length;
        sfx.tick();
        modalBody.innerHTML = coffretHTML();
        break;
      case 'coffret-open':
        socket.emit('coffret', game.dials.slice());
        break;
      case 'clock':
        socket.emit('clock', k);
        break;
      case 'pick':
        game.selRelic = game.selRelic === b.dataset.relic ? null : b.dataset.relic;
        renderMantel();
        break;
      case 'niche': {
        const pr = app.st.progress;
        if (pr.mantel[k]) socket.emit('place', { niche: k, relic: null });
        else if (game.selRelic) {
          socket.emit('place', { niche: k, relic: game.selRelic });
          game.selRelic = null;
        } else toast('Choisis d’abord une relique, en bas de la fenêtre.');
        break;
      }
    }
  });

  // ---------- HUD ----------
  function renderHud() {
    const pr = app.st && app.st.progress;
    if (!pr) return;
    const steps = [
      ['Le miroir et le coffret', pr.coffret],
      ['Le portrait et les bougies', pr.candlesDone],
      ['Fouiller l’horloge', pr.medaillon],
      ['Les reliques sur la cheminée', pr.doorOpen],
      ['Sortir toutes les deux', app.st.result === 'won'],
    ];
    const firstOpen = steps.findIndex((s) => !s[1]);
    $('#objectives').innerHTML = `<h3>Carnet de chasse</h3><ul>${steps
      .map(([label, done], k) => `<li class="${done ? 'done' : k === firstOpen || (k < 3 && !done) ? 'current' : ''}">${label}</li>`)
      .join('')}</ul>`;
    $('#inventory').innerHTML = S.RELICS.map((r) => {
      const has = pr.inventory.includes(r.id), placed = pr.mantel.includes(r.id);
      return `<div class="slot ${has ? 'has' : ''} ${placed ? 'placed' : ''}" title="${esc(r.short)}${has ? '' : ' (à trouver)'}"><img src="${icon(r.id)}" alt="${esc(r.short)}"></div>`;
    }).join('');
  }

  let lastTimerText = '';
  function updateTimer() {
    const ms = remainingMs();
    const text = fmt(ms);
    if (text !== lastTimerText) {
      $('#timer-value').textContent = text;
      lastTimerText = text;
    }
    $('#timer').classList.toggle('urgent', app.st && app.st.phase === 'playing' && ms < 60000);
  }

  $('#btn-sound').onclick = () => {
    app.muted = !app.muted;
    store.set('mam-muted', app.muted);
    $('#btn-sound').textContent = app.muted ? '🔇' : '🔊';
  };
  $('#btn-sound').textContent = app.muted ? '🔇' : '🔊';

  // ---------- fin de partie ----------
  function showEnd(st) {
    const won = st.result === 'won';
    const end = $('#end');
    end.classList.remove('hidden');
    end.classList.toggle('lost', !won);
    $('#end-title').textContent = won ? 'Libres !' : 'Minuit a sonné…';
    $('#end-text').textContent = won
      ? `Vous avez franchi la porte avec ${fmt(st.remainingAtEnd)} d’avance. Le manoir vous salue… jusqu’à la prochaine nuit.`
      : 'Les douze coups résonnent et la porte se scelle. Le manoir vous garde prisonnières… à moins de retenter votre chance ensemble.';
    const sol = game.solution;
    $('#end-solution').textContent = !won && sol
      ? `La solution : miroir ${sol.symbols.map((i) => S.SYMBOLS[i].glyph).join(' ')} · bougies ${sol.candleOrder.map((i) => S.CANDLES[i].label).join(', ')} · cheminée ${sol.mantel.map((r) => S.relic(r).short).join(' / ')}.`
      : '';
    const me = st.players[app.slot], other = st.players[partnerSlot()];
    const btn = $('#btn-replay');
    btn.textContent = me && me.ready ? 'Finalement, pas encore' : 'Rejouer ensemble';
    btn.classList.toggle('is-ready', !!(me && me.ready));
    btn.disabled = !other;
    $('#end-status').textContent = !other
      ? 'Ta partenaire a quitté le manoir.'
      : me && me.ready
        ? `On attend ${other.name}…`
        : other.ready
          ? `${other.name} veut rejouer !`
          : 'La nouvelle partie démarre quand vous êtes prêtes toutes les deux.';
  }
  $('#btn-replay').onclick = () => {
    unlockAudio();
    const me = app.st && app.st.players[app.slot];
    socket.emit('ready', !(me && me.ready));
  };
  $('#btn-end-edit').onclick = () => openCustom('game');

  const endCtx = $('#end-canvas').getContext('2d');
  function drawEnd(t) {
    const st = app.st;
    if (!st) return;
    const ctx = endCtx;
    ctx.clearRect(0, 0, 360, 190);
    const won = st.result === 'won';
    [0, 1].forEach((slot) => {
      const p = st.players[slot];
      if (!p) return;
      C.drawCharacter(ctx, {
        x: 120 + slot * 120, y: 178, scale: 1.25, look: p.look, dir: 'down',
        moving: won, walk: t * 8 + slot * 2, t: t + slot,
        expression: won ? 'happy' : 'scared', blink: (t + slot) % 3.2 < 0.12, ring: S.COLORS[slot],
      });
    });
  }

  // ---------- chat ----------
  function addChat({ slot, name, text }) {
    const log = $('#chat-log');
    const empty = log.querySelector('.empty');
    if (empty) empty.remove();
    const p = document.createElement('p');
    p.className = 'msg';
    p.style.margin = '2px 0';
    const b = document.createElement('b');
    b.style.color = S.COLORS[slot];
    b.textContent = name;
    p.appendChild(b);
    p.appendChild(document.createTextNode(text));
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
    if (slot !== app.slot) sfx.tick();
  }
  $('#chat-form').onsubmit = (e) => {
    e.preventDefault();
    const input = $('#chat-input');
    const text = input.value.trim();
    if (text) socket.emit('chat', text);
    input.value = '';
    input.blur();
  };

  // ---------- clavier ----------
  const MOVE = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  };
  const typing = (e) => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
  window.addEventListener('keydown', (e) => {
    if (typing(e)) {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    if (app.screen !== 'game') return;
    if (e.key === 'Escape') {
      closeModal();
      return;
    }
    if (MOVE[e.code]) {
      game.keys.add(MOVE[e.code]);
      e.preventDefault();
    } else if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (!game.modal && !e.repeat) interact();
    } else if (e.code === 'KeyT') {
      e.preventDefault();
      $('#chat-input').focus();
    }
  });
  window.addEventListener('keyup', (e) => { if (MOVE[e.code]) game.keys.delete(MOVE[e.code]); });
  window.addEventListener('blur', () => game.keys.clear());

  // ---------- boucle ----------
  function update(dt) {
    const st = app.st;
    if (!st || st.phase !== 'playing' || !game.me) return;
    const me = game.me;
    let dx = 0, dy = 0;
    if (!game.modal && !me.exited) {
      if (game.keys.has('left')) dx -= 1;
      if (game.keys.has('right')) dx += 1;
      if (game.keys.has('up')) dy -= 1;
      if (game.keys.has('down')) dy += 1;
    }
    const moving = dx !== 0 || dy !== 0;
    if (moving) {
      const len = Math.hypot(dx, dy);
      const step = S.PLAYER_SPEED * dt;
      const nx = me.x + (dx / len) * step, ny = me.y + (dy / len) * step;
      if (S.canStand(nx, me.y)) me.x = nx;
      if (S.canStand(me.x, ny)) me.y = ny;
      me.dir = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
      me.walk += dt * 9;
    }
    me.moving = moving;
    const now = performance.now();
    const payload = `${Math.round(me.x)},${Math.round(me.y)},${me.dir},${me.moving}`;
    if ((payload !== game.lastPayload && now - game.lastSent > 50) || now - game.lastSent > 1000) {
      socket.emit('move', { x: me.x, y: me.y, dir: me.dir, moving: me.moving });
      game.lastSent = now;
      game.lastPayload = payload;
    }
    const o = game.other;
    if (o) {
      const k = Math.min(1, dt * 12);
      o.x += (o.tx - o.x) * k;
      o.y += (o.ty - o.y) * k;
      if (o.moving) o.walk += dt * 9;
    }
    game.near = findNear();
    if (game.modal === 'mantel') {
      const b = bothNear();
      if (b !== game.lastBoth) {
        game.lastBoth = b;
        renderMantel();
      }
    }
    game.fx.flash = Math.max(0, game.fx.flash - dt * 1.5);
  }

  const gameCtx = $('#game').getContext('2d');
  function drawGame(t) {
    const st = app.st;
    if (!st || !st.progress || !game.me) return;
    const rem = remainingMs();
    const players = [];
    const addP = (slot, p, src) => {
      const ex = game.expr[slot];
      let expression = ex.type && ex.until > t ? ex.type : rem < 30000 && st.phase === 'playing' ? 'scared' : 'neutral';
      if (st.phase === 'ended') expression = st.result === 'won' ? 'happy' : 'scared';
      players.push({
        slot, x: src.x, y: src.y, dir: src.dir, moving: src.moving, walk: src.walk,
        look: p.look, name: p.name, exited: src.exited, expression, blink: (t + slot * 1.37) % 3.6 < 0.13,
      });
    };
    const mp = st.players[app.slot], op = st.players[partnerSlot()];
    if (mp) addP(app.slot, mp, game.me);
    if (op && game.other) addP(partnerSlot(), op, game.other);
    const interactables = getInteractables();
    Room.render(gameCtx, {
      t, mySlot: app.slot, progress: st.progress, remainingMs: rem, duration: st.duration, phase: st.phase,
      players, interactables, near: st.phase === 'playing' ? game.near : null,
      nearLabel: game.near ? labelFor(game.near) : '', fx: game.fx,
    });
  }

  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    const t = now / 1000;
    try {
      if (app.screen === 'custom') drawPreview(t, dt);
      else if (app.screen === 'lobby') drawLobby(t);
      else if (app.screen === 'game') {
        update(dt);
        drawGame(t);
        updateTimer();
        if (!$('#end').classList.contains('hidden')) drawEnd(t);
      }
    } catch (err) {
      console.error(err);
    }
    requestAnimationFrame(frame);
  }

  buildOptions();
  requestAnimationFrame(frame);

  // Outil de test (console) : téléporter sa chasseuse, ex. __manoir.tp('mirror')
  window.__manoir = {
    app, game,
    tp(target) {
      const spot = typeof target === 'string' ? S.SPOTS[target] : target;
      if (!spot || !game.me) return;
      game.me.x = spot.x;
      game.me.y = spot.y + 12;
    },
  };
})();
