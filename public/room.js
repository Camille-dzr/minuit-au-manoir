/* Rendu du salon du manoir : décor, lumières, énigmes visibles, personnages. */
(function (root) {
  'use strict';
  const S = root.SHARED, C = root.Character;
  const W = S.W, H = S.H, TAU = Math.PI * 2;
  const { ell, rr } = C;

  let bg = null, shade = null, sh = null;
  const iconCache = {};

  const SCONCES = [258, 600, 822];
  const NICHE_X = [655, 700, 745];
  const BEAM = [[432, 200], [528, 200], [650, 612], [318, 612]];
  // Centres visuels des éléments interactifs (pour les scintillements et les bulles)
  const VIS = {
    mirror: { x: 200, y: 128, r: 46 },
    coffret: { x: 170, y: 404, r: 32 },
    portrait: { x: 335, y: 110, r: 50 },
    fireplace: { x: 700, y: 108, r: 52 },
    clock: { x: 880, y: 130, r: 44 },
    door: { x: 76, y: 160, r: 46 },
  };

  // ---------- reliques (icônes vectorielles) ----------
  function drawRelic(g, id, cx, cy, sz) {
    g.save();
    g.lineCap = 'round';
    if (id === 'cle') {
      g.translate(cx, cy);
      g.rotate(-Math.PI / 4);
      g.strokeStyle = '#e3e8f1';
      g.lineWidth = sz * 0.1;
      g.beginPath();
      g.arc(-sz * 0.24, 0, sz * 0.16, 0, TAU);
      g.stroke();
      g.beginPath();
      g.moveTo(-sz * 0.08, 0);
      g.lineTo(sz * 0.42, 0);
      g.moveTo(sz * 0.3, 0);
      g.lineTo(sz * 0.3, sz * 0.14);
      g.moveTo(sz * 0.4, 0);
      g.lineTo(sz * 0.4, sz * 0.18);
      g.stroke();
      g.fillStyle = '#9fd8ff';
      g.beginPath();
      g.arc(-sz * 0.24, 0, sz * 0.06, 0, TAU);
      g.fill();
    } else if (id === 'bague') {
      g.strokeStyle = '#e9c35a';
      g.lineWidth = sz * 0.1;
      g.beginPath();
      g.ellipse(cx, cy + sz * 0.12, sz * 0.27, sz * 0.21, 0, 0, TAU);
      g.stroke();
      g.fillStyle = '#c4123e';
      g.beginPath();
      g.moveTo(cx, cy - sz * 0.36);
      g.lineTo(cx + sz * 0.15, cy - sz * 0.17);
      g.lineTo(cx, cy - sz * 0.02);
      g.lineTo(cx - sz * 0.15, cy - sz * 0.17);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(255,220,230,0.8)';
      g.beginPath();
      g.arc(cx - sz * 0.04, cy - sz * 0.2, sz * 0.04, 0, TAU);
      g.fill();
    } else {
      g.strokeStyle = '#d6b04f';
      g.lineWidth = sz * 0.05;
      g.beginPath();
      g.moveTo(cx - sz * 0.22, cy - sz * 0.15);
      g.quadraticCurveTo(cx, cy - sz * 0.6, cx + sz * 0.22, cy - sz * 0.15);
      g.stroke();
      g.fillStyle = '#e2bb55';
      g.beginPath();
      g.ellipse(cx, cy + sz * 0.1, sz * 0.25, sz * 0.31, 0, 0, TAU);
      g.fill();
      g.strokeStyle = '#8f6a1f';
      g.lineWidth = sz * 0.04;
      g.stroke();
      g.fillStyle = '#7d3fc0';
      g.beginPath();
      g.ellipse(cx, cy + sz * 0.1, sz * 0.12, sz * 0.16, 0, 0, TAU);
      g.fill();
      g.fillStyle = 'rgba(240,220,255,0.8)';
      g.beginPath();
      g.arc(cx - sz * 0.04, cy + sz * 0.03, sz * 0.035, 0, TAU);
      g.fill();
    }
    g.restore();
  }

  function relicIcon(id, size = 64) {
    const key = id + size;
    if (!iconCache[key]) {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      drawRelic(c.getContext('2d'), id, size / 2, size / 2, size * 0.9);
      iconCache[key] = c.toDataURL();
    }
    return iconCache[key];
  }

  // ---------- décor statique ----------
  function drawStatic(g) {
    // mur
    const wg = g.createLinearGradient(0, 0, 0, S.WALL_Y);
    wg.addColorStop(0, '#1c0d24');
    wg.addColorStop(1, '#311838');
    g.fillStyle = wg;
    g.fillRect(0, 0, W, S.WALL_Y);
    g.fillStyle = 'rgba(150,90,170,0.12)';
    for (let y = 40, row = 0; y < 170; y += 32, row++) {
      for (let x = (row % 2) * 22; x < W; x += 44) {
        g.beginPath();
        g.moveTo(x, y - 9);
        g.quadraticCurveTo(x + 7, y, x, y + 9);
        g.quadraticCurveTo(x - 7, y, x, y - 9);
        g.fill();
        g.beginPath();
        g.arc(x, y - 12, 2, 0, TAU);
        g.fill();
      }
    }
    g.fillStyle = '#120812';
    g.fillRect(0, 0, W, 12);
    g.fillStyle = '#9a7834';
    g.fillRect(0, 12, W, 3);
    g.fillStyle = '#5a431c';
    g.fillRect(0, 15, W, 2);
    g.fillStyle = '#7a5c26';
    g.fillRect(0, 166, W, 5);
    g.fillStyle = '#2b170f';
    g.fillRect(0, 171, W, 72);
    for (let x = 8; x < W; x += 78) {
      g.strokeStyle = '#432719';
      g.lineWidth = 2;
      g.strokeRect(x, 181, 62, 50);
      g.strokeStyle = 'rgba(0,0,0,0.45)';
      g.strokeRect(x + 4, 185, 54, 42);
    }
    g.fillStyle = '#140a06';
    g.fillRect(0, 240, W, 8);

    // parquet sombre
    for (let y = 248, row = 0; y < H; y += 20, row++) {
      g.fillStyle = row % 2 ? '#3b2417' : '#331f12';
      g.fillRect(0, y, W, 20);
      g.fillStyle = 'rgba(0,0,0,0.38)';
      g.fillRect(0, y + 18.5, W, 1.5);
      const off = (row * 53) % 120;
      for (let x = off; x < W; x += 118 + (row % 3) * 22) g.fillRect(x, y, 1.6, 20);
      g.fillStyle = 'rgba(255,200,150,0.035)';
      g.fillRect(0, y + 3, W, 2);
    }
    const fg = g.createLinearGradient(0, 248, 0, H);
    fg.addColorStop(0, 'rgba(0,0,0,0.35)');
    fg.addColorStop(0.25, 'rgba(0,0,0,0)');
    fg.addColorStop(1, 'rgba(0,0,0,0.3)');
    g.fillStyle = fg;
    g.fillRect(0, 248, W, H - 248);

    drawRug(g);
    drawWindow(g);
    drawCurtain(g, -1);
    drawCurtain(g, 1);
    drawValance(g);
    drawMirrorFrame(g);
    drawPortrait1(g);
    drawFireplace(g);
    drawClockBody(g);
    drawDoorFrame(g);
    drawSconceHolders(g);
  }

  function drawRug(g) {
    g.save();
    g.translate(480, 476);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    ell(g, 4, 8, 240, 98);
    g.fill();
    g.fillStyle = '#a8823a';
    ell(g, 0, 0, 238, 96);
    g.fill();
    g.fillStyle = '#5c1426';
    ell(g, 0, 0, 230, 90);
    g.fill();
    g.strokeStyle = '#c49a45';
    g.lineWidth = 2;
    ell(g, 0, 0, 206, 78);
    g.stroke();
    g.fillStyle = '#741a32';
    ell(g, 0, 0, 196, 71);
    g.fill();
    g.fillStyle = '#c49a45';
    for (let k = 0; k < 30; k++) {
      const a = (k / 30) * TAU;
      const x = Math.cos(a) * 218, y = Math.sin(a) * 84;
      g.beginPath();
      g.moveTo(x, y - 4);
      g.lineTo(x + 4, y);
      g.lineTo(x, y + 4);
      g.lineTo(x - 4, y);
      g.fill();
    }
    g.fillStyle = '#4a0f1f';
    ell(g, 0, 0, 72, 28);
    g.fill();
    g.strokeStyle = '#c49a45';
    g.lineWidth = 1.5;
    ell(g, 0, 0, 72, 28);
    g.stroke();
    ell(g, 0, 0, 40, 15);
    g.stroke();
    g.restore();
  }

  function windowPath(g) {
    g.beginPath();
    g.moveTo(420, 198);
    g.lineTo(420, 96);
    g.arc(480, 96, 60, Math.PI, 0);
    g.lineTo(540, 198);
    g.closePath();
  }

  function drawWindow(g) {
    g.save();
    windowPath(g);
    g.strokeStyle = '#1a0d0a';
    g.lineWidth = 14;
    g.stroke();
    g.clip();
    const sky = g.createLinearGradient(0, 36, 0, 198);
    sky.addColorStop(0, '#0b1636');
    sky.addColorStop(1, '#22427a');
    g.fillStyle = sky;
    g.fillRect(410, 30, 140, 170);
    g.fillStyle = 'rgba(255,255,255,0.8)';
    for (const [sx, sy] of [[432, 60], [448, 140], [470, 52], [528, 150], [436, 176], [520, 60], [462, 120]]) {
      g.fillRect(sx, sy, 1.6, 1.6);
    }
    const mg = g.createRadialGradient(504, 88, 10, 504, 88, 60);
    mg.addColorStop(0, 'rgba(200,225,255,0.55)');
    mg.addColorStop(1, 'rgba(200,225,255,0)');
    g.fillStyle = mg;
    g.fillRect(410, 30, 140, 170);
    g.fillStyle = '#eef3ff';
    g.beginPath();
    g.arc(504, 88, 21, 0, TAU);
    g.fill();
    g.fillStyle = '#cfd9ee';
    for (const [cx, cy, r] of [[497, 82, 4], [510, 95, 3], [508, 78, 2]]) {
      g.beginPath();
      g.arc(cx, cy, r, 0, TAU);
      g.fill();
    }
    g.fillStyle = 'rgba(120,140,190,0.35)';
    ell(g, 470, 150, 40, 6);
    g.fill();
    ell(g, 515, 168, 30, 5);
    g.fill();
    g.restore();
    g.strokeStyle = '#140906';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(480, 36);
    g.lineTo(480, 198);
    g.moveTo(420, 128);
    g.lineTo(540, 128);
    g.stroke();
    g.strokeStyle = '#3a2214';
    g.lineWidth = 3;
    windowPath(g);
    g.stroke();
    g.fillStyle = '#4a2c18';
    g.fillRect(410, 196, 140, 9);
    g.fillStyle = '#9a7834';
    g.fillRect(410, 196, 140, 2);
  }

  function drawCurtain(g, side) {
    g.save();
    if (side > 0) {
      g.translate(W, 0);
      g.scale(-1, 1);
    }
    const grad = g.createLinearGradient(378, 0, 454, 0);
    grad.addColorStop(0, '#430a1a');
    grad.addColorStop(0.18, '#8e1b3a');
    grad.addColorStop(0.34, '#5a0e22');
    grad.addColorStop(0.52, '#a8294d');
    grad.addColorStop(0.68, '#650f27');
    grad.addColorStop(0.86, '#8e1b3a');
    grad.addColorStop(1, '#430a1a');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(380, 24);
    g.lineTo(454, 24);
    g.quadraticCurveTo(438, 108, 422, 150);
    g.quadraticCurveTo(436, 200, 448, 244);
    g.lineTo(376, 244);
    g.quadraticCurveTo(384, 140, 380, 24);
    g.fill();
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.beginPath();
    g.moveTo(376, 244);
    g.lineTo(448, 244);
    g.lineTo(446, 238);
    g.lineTo(378, 238);
    g.fill();
    g.fillStyle = '#d4a849';
    rr(g, 378, 145, 47, 7, 3);
    g.fill();
    g.strokeStyle = '#d4a849';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(423, 150);
    g.lineTo(424, 160);
    g.stroke();
    g.beginPath();
    g.arc(424, 162, 4, 0, TAU);
    g.fill();
    for (let k = -3; k <= 3; k++) {
      g.beginPath();
      g.moveTo(424 + k, 165);
      g.lineTo(424 + k * 1.6, 178);
      g.stroke();
    }
    g.restore();
  }

  function drawValance(g) {
    g.fillStyle = '#9a7834';
    g.fillRect(366, 16, 228, 4);
    g.fillStyle = '#7a1530';
    g.beginPath();
    g.moveTo(370, 20);
    g.lineTo(590, 20);
    g.lineTo(590, 38);
    const n = 6, w = 220 / n;
    for (let k = 0; k < n; k++) {
      const x0 = 590 - k * w;
      g.quadraticCurveTo(x0 - w / 2, 56, x0 - w, 38);
    }
    g.closePath();
    g.fill();
    g.strokeStyle = '#d4a849';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(590, 38);
    for (let k = 0; k < n; k++) {
      const x0 = 590 - k * w;
      g.quadraticCurveTo(x0 - w / 2, 56, x0 - w, 38);
    }
    g.stroke();
  }

  function goldGrad(g, x0, y0, x1, y1) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, '#f3d67f');
    gr.addColorStop(0.5, '#a67e30');
    gr.addColorStop(1, '#f0cf72');
    return gr;
  }

  function drawMirrorFrame(g) {
    g.save();
    g.translate(200, 128);
    g.fillStyle = 'rgba(0,0,0,0.45)';
    ell(g, 3, 5, 46, 71);
    g.fill();
    g.fillStyle = goldGrad(g, -44, -70, 44, 70);
    ell(g, 0, 0, 44, 70);
    g.fill();
    g.fillStyle = '#4a3512';
    ell(g, 0, 0, 37.5, 63.5);
    g.fill();
    g.fillStyle = '#ffe9a6';
    for (let k = 0; k < 22; k++) {
      const a = (k / 22) * TAU;
      g.beginPath();
      g.arc(Math.cos(a) * 41, Math.sin(a) * 67, 1.4, 0, TAU);
      g.fill();
    }
    g.fillStyle = goldGrad(g, -14, -90, 14, -66);
    g.beginPath();
    g.moveTo(-14, -66);
    g.quadraticCurveTo(-12, -86, 0, -88);
    g.quadraticCurveTo(12, -86, 14, -66);
    g.fill();
    g.strokeStyle = '#6d5222';
    g.lineWidth = 1;
    for (let k = -2; k <= 2; k++) {
      g.beginPath();
      g.moveTo(0, -68);
      g.lineTo(k * 5, -84);
      g.stroke();
    }
    g.restore();
  }

  function drawPortrait1(g) {
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fillRect(287, 58, 104, 112);
    g.fillStyle = goldGrad(g, 283, 54, 387, 166);
    g.fillRect(283, 54, 104, 112);
    g.fillStyle = '#5d4317';
    g.fillRect(291, 62, 88, 96);
    const pg = g.createLinearGradient(0, 64, 0, 156);
    pg.addColorStop(0, '#1d3329');
    pg.addColorStop(1, '#0e1a15');
    g.fillStyle = pg;
    g.fillRect(293, 64, 84, 92);
    // bougies peintes, floues (le secret ne se lit que de près)
    g.fillStyle = 'rgba(255,220,150,0.12)';
    for (const x of [302, 312, 358, 368]) g.fillRect(x, 120, 4, 14);
    // corps
    g.fillStyle = '#121014';
    g.beginPath();
    g.moveTo(300, 156);
    g.quadraticCurveTo(306, 124, 335, 122);
    g.quadraticCurveTo(364, 124, 370, 156);
    g.fill();
    g.fillStyle = '#f2ece0';
    g.beginPath();
    g.moveTo(327, 124);
    g.lineTo(335, 140);
    g.lineTo(343, 124);
    g.fill();
    g.fillStyle = '#8e1b3a';
    g.beginPath();
    g.moveTo(331, 126);
    g.lineTo(335, 136);
    g.lineTo(339, 126);
    g.fill();
    // visage
    g.fillStyle = '#d8c6ae';
    ell(g, 335, 104, 14.5, 18.5);
    g.fill();
    g.fillStyle = '#8a8a8a';
    ell(g, 321, 104, 3, 9);
    g.fill();
    ell(g, 349, 104, 3, 9);
    g.fill();
    g.fillStyle = '#4a4a4a';
    g.beginPath();
    g.moveTo(335, 112);
    g.quadraticCurveTo(326, 110, 323, 116);
    g.quadraticCurveTo(329, 113, 335, 115);
    g.quadraticCurveTo(341, 113, 347, 116);
    g.quadraticCurveTo(344, 110, 335, 112);
    g.fill();
    g.strokeStyle = '#555';
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(325, 95);
    g.lineTo(332, 96);
    g.moveTo(338, 96);
    g.lineTo(345, 95);
    g.stroke();
    // haut-de-forme
    g.fillStyle = '#0c0a0e';
    g.fillRect(317, 86, 36, 4);
    g.fillRect(322, 66, 26, 21);
    g.fillStyle = '#8e1b3a';
    g.fillRect(322, 81, 26, 3);
    // plaque
    g.fillStyle = '#c9a24a';
    g.fillRect(313, 159, 44, 6);
    g.fillStyle = '#3a2a10';
    g.font = '5px Georgia';
    g.textAlign = 'center';
    g.fillText('LORD OMBRELUNE', 335, 164);
  }

  function drawPortrait2(g) {
    g.save();
    g.fillStyle = goldGrad(g, 666, 18, 734, 86);
    ell(g, 700, 52, 33, 34);
    g.fill();
    g.fillStyle = '#2a1636';
    ell(g, 700, 52, 27, 28);
    g.fill();
    g.save();
    ell(g, 700, 52, 27, 28);
    g.clip();
    g.fillStyle = '#121016';
    g.beginPath();
    g.moveTo(678, 82);
    g.quadraticCurveTo(684, 66, 700, 66);
    g.quadraticCurveTo(716, 66, 722, 82);
    g.fill();
    g.fillStyle = '#9b93b0';
    ell(g, 700, 38, 15, 13);
    g.fill();
    ell(g, 700, 26, 8, 7);
    g.fill();
    g.fillStyle = '#e1d4c4';
    ell(g, 700, 54, 10, 13);
    g.fill();
    g.fillStyle = '#f6f2ea';
    for (let k = -3; k <= 3; k++) {
      g.beginPath();
      g.arc(700 + k * 3.5, 71 + Math.abs(k) * -0.6, 1.4, 0, TAU);
      g.fill();
    }
    g.fillStyle = '#a8214c';
    g.beginPath();
    g.arc(700, 61, 1.8, 0, Math.PI);
    g.fill();
    g.restore();
    g.restore();
  }

  function drawFireplace(g) {
    g.fillStyle = '#2a1831';
    g.fillRect(628, 17, 144, 230);
    g.strokeStyle = 'rgba(0,0,0,0.4)';
    g.lineWidth = 2;
    g.strokeRect(628, 17, 144, 230);
    drawPortrait2(g);
    for (const cx of NICHE_X) {
      g.fillStyle = '#120a16';
      g.beginPath();
      g.moveTo(cx - 13, 118);
      g.lineTo(cx - 13, 101);
      g.arc(cx, 101, 13, Math.PI, 0);
      g.lineTo(cx + 13, 118);
      g.closePath();
      g.fill();
      g.strokeStyle = '#a8823a';
      g.lineWidth = 1.5;
      g.stroke();
    }
    g.fillStyle = '#3e3446';
    rr(g, 608, 118, 184, 13, 2);
    g.fill();
    g.fillStyle = '#c49a45';
    g.fillRect(608, 118, 184, 2);
    g.fillStyle = 'rgba(0,0,0,0.4)';
    g.fillRect(616, 131, 168, 4);
    const sg = g.createLinearGradient(624, 0, 776, 0);
    sg.addColorStop(0, '#3e3446');
    sg.addColorStop(0.5, '#574b60');
    sg.addColorStop(1, '#3e3446');
    g.fillStyle = sg;
    g.fillRect(624, 131, 152, 115);
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    g.lineWidth = 1;
    for (let y = 146; y < 246; y += 16) {
      g.beginPath();
      g.moveTo(624, y);
      g.lineTo(654, y);
      g.moveTo(746, y);
      g.lineTo(776, y);
      g.stroke();
    }
    g.fillStyle = '#0b0608';
    g.beginPath();
    g.moveTo(652, 246);
    g.lineTo(652, 180);
    g.quadraticCurveTo(700, 148, 748, 180);
    g.lineTo(748, 246);
    g.closePath();
    g.fill();
    g.fillStyle = '#5a4d62';
    rr(g, 604, 242, 192, 22, 3);
    g.fill();
    g.fillStyle = '#7a6c84';
    g.fillRect(604, 242, 192, 2);
  }

  function drawClockBody(g) {
    const wood = '#4c2619', dark = '#2c140b';
    g.fillStyle = 'rgba(0,0,0,0.4)';
    g.fillRect(852, 40, 66, 224);
    g.fillStyle = dark;
    rr(g, 846, 226, 68, 38, 3);
    g.fill();
    g.fillStyle = wood;
    g.fillRect(856, 122, 48, 108);
    g.fillStyle = '#140a08';
    g.fillRect(866, 136, 28, 76);
    g.strokeStyle = '#b8923f';
    g.lineWidth = 2;
    g.strokeRect(866, 136, 28, 76);
    g.fillStyle = wood;
    rr(g, 846, 56, 68, 68, 4);
    g.fill();
    g.fillStyle = dark;
    g.beginPath();
    g.moveTo(840, 60);
    g.lineTo(880, 32);
    g.lineTo(920, 60);
    g.closePath();
    g.fill();
    g.fillStyle = '#c9a24a';
    g.beginPath();
    g.arc(880, 30, 4.5, 0, TAU);
    g.fill();
    g.fillRect(846, 120, 68, 3);
    g.fillRect(846, 224, 68, 3);
    g.fillStyle = '#efe3c3';
    g.beginPath();
    g.arc(880, 90, 23, 0, TAU);
    g.fill();
    g.strokeStyle = '#c9a24a';
    g.lineWidth = 3;
    g.stroke();
    g.strokeStyle = '#3a2614';
    g.lineWidth = 1.4;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU;
      const r1 = k % 3 === 0 ? 15 : 18;
      g.beginPath();
      g.moveTo(880 + Math.sin(a) * r1, 90 - Math.cos(a) * r1);
      g.lineTo(880 + Math.sin(a) * 20, 90 - Math.cos(a) * 20);
      g.stroke();
    }
    g.fillStyle = '#3a2614';
    g.font = 'bold 7px Georgia';
    g.textAlign = 'center';
    g.fillText('XII', 880, 79);
  }

  function drawDoorFrame(g) {
    g.fillStyle = '#1c0f0a';
    g.beginPath();
    g.moveTo(22, 248);
    g.lineTo(22, 110);
    g.arc(76, 110, 54, Math.PI, 0);
    g.lineTo(130, 248);
    g.closePath();
    g.fill();
    g.fillStyle = '#9a7834';
    g.beginPath();
    g.moveTo(70, 54);
    g.lineTo(82, 54);
    g.lineTo(79, 66);
    g.lineTo(73, 66);
    g.fill();
  }

  function drawSconceHolders(g) {
    for (const x of SCONCES) {
      g.fillStyle = goldGrad(g, x - 6, 136, x + 6, 160);
      ell(g, x, 150, 5, 11);
      g.fill();
      g.strokeStyle = '#b8923f';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x, 152);
      g.quadraticCurveTo(x + 10, 146, x, 130);
      g.stroke();
      g.fillStyle = '#c9a24a';
      ell(g, x, 129, 7, 2.5);
      g.fill();
      g.fillStyle = '#f3ead8';
      g.fillRect(x - 3, 112, 6, 17);
      g.fillStyle = 'rgba(0,0,0,0.15)';
      g.fillRect(x + 1, 112, 2, 17);
    }
  }

  // ---------- éléments animés ----------
  function drawFlame(ctx, x, y, s, t, seed) {
    const f = 1 + Math.sin(t * 12 + seed * 3) * 0.09 + Math.sin(t * 7.3 + seed) * 0.06;
    ctx.save();
    ctx.translate(x + Math.sin(t * 9 + seed) * 0.6, y);
    ctx.scale(s, s * f);
    const g = ctx.createRadialGradient(0, 2, 0, 0, 0, 10);
    g.addColorStop(0, '#fffbe0');
    g.addColorStop(0.4, '#ffd35a');
    g.addColorStop(1, 'rgba(255,120,20,0.2)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.quadraticCurveTo(6.5, -2, 4.6, 3);
    ctx.quadraticCurveTo(0, 7.5, -4.6, 3);
    ctx.quadraticCurveTo(-6.5, -2, 0, -11);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,240,0.9)';
    ell(ctx, 0, 2, 1.8, 3);
    ctx.fill();
    ctx.restore();
  }

  function drawMirrorGlass(ctx, v) {
    ctx.save();
    ctx.translate(200, 128);
    ell(ctx, 0, 0, 35, 61);
    ctx.clip();
    const g = ctx.createLinearGradient(-35, -61, 35, 61);
    g.addColorStop(0, '#6c8ab8');
    g.addColorStop(0.5, '#273857');
    g.addColorStop(1, '#141c30');
    ctx.fillStyle = g;
    ctx.fillRect(-40, -70, 80, 140);
    const k = ((v.t * 0.22) % 1.8) - 0.4;
    ctx.fillStyle = 'rgba(225,238,255,0.2)';
    ctx.beginPath();
    ctx.moveTo(-40 + k * 110, -70);
    ctx.lineTo(-22 + k * 110, -70);
    ctx.lineTo(-62 + k * 110, 70);
    ctx.lineTo(-80 + k * 110, 70);
    ctx.fill();
    ctx.fillStyle = `rgba(200,215,240,${v.progress && v.progress.coffret ? 0.05 : 0.18})`;
    for (let i = 0; i < 5; i++) {
      ell(ctx, Math.sin(v.t * 0.4 + i * 2) * 18, -40 + i * 20, 22, 8);
      ctx.fill();
    }
    ctx.restore();
  }

  function nearestPlayer(players, x, y) {
    let best = null, bd = Infinity;
    for (const p of players) {
      if (p.exited) continue;
      const d = Math.hypot(p.x - x, p.y - 60 - y);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }

  function drawPortraitEyes(ctx, v) {
    const sets = [
      { cx: 335, cy: 101, eyes: [[329, 101], [341, 101]], r: 3.2 },
      { cx: 700, cy: 54, eyes: [[695, 54], [705, 54]], r: 2.4 },
    ];
    for (const s of sets) {
      const p = nearestPlayer(v.players, s.cx, s.cy);
      let dx = 0, dy = 0.4;
      if (p) {
        const tx = p.x - s.cx, ty = p.y - 60 - s.cy;
        const len = Math.hypot(tx, ty) || 1;
        dx = tx / len;
        dy = ty / len;
      }
      for (const [ex, ey] of s.eyes) {
        ctx.fillStyle = '#f3eee0';
        ell(ctx, ex, ey, s.r, s.r * 0.85);
        ctx.fill();
        ctx.fillStyle = '#1a1010';
        ell(ctx, ex + dx * s.r * 0.5, ey + dy * s.r * 0.35, s.r * 0.5, s.r * 0.5);
        ctx.fill();
      }
    }
  }

  function drawFire(ctx, v) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(652, 246);
    ctx.lineTo(652, 180);
    ctx.quadraticCurveTo(700, 148, 748, 180);
    ctx.lineTo(748, 246);
    ctx.closePath();
    ctx.clip();
    const t = v.t;
    for (let k = 0; k < 7; k++) {
      const x = 664 + k * 12;
      const h = 32 + 14 * Math.sin(t * 6.5 + k * 1.7) + 8 * Math.sin(t * 13 + k);
      const g = ctx.createLinearGradient(0, 244, 0, 244 - h);
      g.addColorStop(0, '#ffb43a');
      g.addColorStop(0.6, '#ff6a1e');
      g.addColorStop(1, 'rgba(200,40,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 10, 244);
      ctx.quadraticCurveTo(x - 7, 244 - h * 0.6, x + Math.sin(t * 5 + k) * 3, 244 - h);
      ctx.quadraticCurveTo(x + 7, 244 - h * 0.6, x + 10, 244);
      ctx.fill();
    }
    ctx.fillStyle = '#ffe9a0';
    for (let k = 0; k < 4; k++) {
      const x = 676 + k * 16;
      const h = 14 + 6 * Math.sin(t * 9 + k * 2);
      ctx.beginPath();
      ctx.moveTo(x - 5, 244);
      ctx.quadraticCurveTo(x, 244 - h * 1.4, x + 5, 244);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#3a1f12';
    rr(ctx, 664, 236, 72, 8, 3);
    ctx.fill();
    ctx.fillStyle = '#2a140a';
    rr(ctx, 672, 232, 56, 7, 3);
    ctx.fill();
  }

  function drawNiches(ctx, v) {
    const pr = v.progress;
    if (!pr) return;
    for (let k = 0; k < 3; k++) {
      const r = pr.mantel[k];
      if (!r) continue;
      if (pr.doorOpen) {
        ctx.fillStyle = 'rgba(255,215,120,0.35)';
        ell(ctx, NICHE_X[k], 106, 14, 14);
        ctx.fill();
      }
      drawRelic(ctx, r, NICHE_X[k], 107, 22);
    }
  }

  function drawClockDyn(ctx, v) {
    const elapsed = Math.max(0, Math.min(v.duration, v.duration - v.remainingMs));
    const minutes = 55 + (elapsed / v.duration) * 5;
    const hA = ((11 + minutes / 60) / 12) * TAU, mA = (minutes / 60) * TAU;
    ctx.strokeStyle = '#24160c';
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(880, 90);
    ctx.lineTo(880 + Math.sin(hA) * 11, 90 - Math.cos(hA) * 11);
    ctx.stroke();
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(880, 90);
    ctx.lineTo(880 + Math.sin(mA) * 17, 90 - Math.cos(mA) * 17);
    ctx.stroke();
    ctx.fillStyle = '#c9a24a';
    ell(ctx, 880, 90, 2.2, 2.2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.rect(866, 136, 28, 76);
    ctx.clip();
    const a = Math.sin(v.t * Math.PI) * 0.28;
    const bx = 880 + Math.sin(a) * 58, by = 138 + Math.cos(a) * 58;
    ctx.strokeStyle = '#b8923f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(880, 138);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.fillStyle = '#e0bb5c';
    ell(ctx, bx, by, 7, 7);
    ctx.fill();
    ctx.restore();
    if (v.progress && v.progress.medaillon) {
      ctx.fillStyle = '#3a1d12';
      ctx.beginPath();
      ctx.moveTo(894, 136);
      ctx.lineTo(906, 132);
      ctx.lineTo(906, 216);
      ctx.lineTo(894, 212);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#b8923f';
      ctx.stroke();
    }
  }

  function doorPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(32, 246);
    ctx.lineTo(32, 110);
    ctx.arc(76, 110, 44, Math.PI, 0);
    ctx.lineTo(120, 246);
    ctx.closePath();
  }

  function drawDoor(ctx, v) {
    const pr = v.progress;
    const open = pr && pr.doorOpen;
    if (!open) {
      const g = ctx.createLinearGradient(32, 0, 120, 0);
      g.addColorStop(0, '#3a1e12');
      g.addColorStop(0.5, '#5c3421');
      g.addColorStop(1, '#3a1e12');
      ctx.fillStyle = g;
      doorPath(ctx);
      ctx.fill();
      ctx.save();
      doorPath(ctx);
      ctx.clip();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1.5;
      for (let x = 46; x < 120; x += 14) {
        ctx.beginPath();
        ctx.moveTo(x, 60);
        ctx.lineTo(x, 246);
        ctx.stroke();
      }
      ctx.fillStyle = '#1c1b22';
      ctx.fillRect(30, 124, 92, 7);
      ctx.fillRect(30, 212, 92, 7);
      ctx.fillStyle = '#5a5866';
      for (let x = 38; x < 120; x += 16) {
        ell(ctx, x, 127.5, 1.4, 1.4);
        ctx.fill();
        ell(ctx, x, 215.5, 1.4, 1.4);
        ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = '#c9a24a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(108, 180, 5, 0, TAU);
      ctx.stroke();
      // sceau magique : une gemme s'allume par relique trouvée
      const n = pr ? pr.inventory.length : 0;
      const pulse = 0.6 + 0.3 * Math.sin(v.t * 3);
      ctx.save();
      ctx.translate(76, 160);
      ctx.strokeStyle = `rgba(190,130,255,${pulse})`;
      ctx.lineWidth = 2;
      ell(ctx, 0, 0, 19, 19);
      ctx.stroke();
      ctx.lineWidth = 1;
      ell(ctx, 0, 0, 14, 14);
      ctx.stroke();
      for (let k = 0; k < 3; k++) {
        const a = -Math.PI / 2 + (k * TAU) / 3;
        ctx.fillStyle = k < n ? '#ffd86b' : '#3a2a4a';
        ell(ctx, Math.cos(a) * 14, Math.sin(a) * 14, 4, 4);
        ctx.fill();
        ctx.strokeStyle = '#c9a24a';
        ctx.stroke();
      }
      ctx.restore();
    } else {
      const g = ctx.createLinearGradient(0, 70, 0, 246);
      g.addColorStop(0, '#eaf4ff');
      g.addColorStop(1, '#7fa6d8');
      ctx.fillStyle = g;
      doorPath(ctx);
      ctx.fill();
      ctx.fillStyle = 'rgba(30,50,40,0.6)';
      ctx.beginPath();
      ctx.moveTo(32, 246);
      ctx.quadraticCurveTo(60, 222, 76, 230);
      ctx.quadraticCurveTo(96, 218, 120, 246);
      ctx.fill();
      ctx.fillStyle = '#4a2a18';
      ctx.beginPath();
      ctx.moveTo(32, 246);
      ctx.lineTo(32, 104);
      ctx.lineTo(10, 92);
      ctx.lineTo(10, 258);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = 'bold 12px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText('SORTIE', 76, 150 + Math.sin(v.t * 3) * 2);
    }
  }

  function drawTable(ctx, v) {
    const pr = v.progress || {};
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ell(ctx, 170, 468, 64, 8);
    ctx.fill();
    ctx.fillStyle = '#24130b';
    ctx.fillRect(120, 436, 6, 32);
    ctx.fillRect(214, 436, 6, 32);
    ctx.fillStyle = '#6e1230';
    rr(ctx, 108, 414, 124, 22, 6);
    ctx.fill();
    ctx.fillStyle = '#5a0e27';
    ctx.beginPath();
    ctx.moveTo(108, 428);
    ctx.lineTo(232, 428);
    ctx.lineTo(232, 446);
    for (let k = 0; k < 8; k++) {
      const x0 = 232 - k * 15.5;
      ctx.quadraticCurveTo(x0 - 7.75, 454, x0 - 15.5, 446);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d4a849';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(108, 446);
    for (let k = 0; k < 8; k++) {
      const x0 = 108 + k * 15.5;
      ctx.quadraticCurveTo(x0 + 7.75, 454, x0 + 15.5, 446);
    }
    ctx.stroke();
    // coffret
    ctx.fillStyle = '#5a2d16';
    rr(ctx, 144, 396, 52, 24, 3);
    ctx.fill();
    ctx.fillStyle = '#c9a24a';
    for (const [x, y] of [[144, 396], [190, 396], [144, 414], [190, 414]]) ctx.fillRect(x, y, 6, 6);
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = '#2a160c';
      ell(ctx, 158 + k * 12, 409, 4.6, 4.6);
      ctx.fill();
      ctx.strokeStyle = '#d4a849';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    if (!pr.coffret) {
      ctx.fillStyle = '#6b3a1e';
      rr(ctx, 142, 388, 56, 10, 4);
      ctx.fill();
      ctx.fillStyle = '#c9a24a';
      ctx.fillRect(166, 388, 8, 10);
    } else {
      ctx.fillStyle = 'rgba(255,220,140,0.8)';
      ell(ctx, 170, 397, 23, 4);
      ctx.fill();
      ctx.fillStyle = '#6b3a1e';
      ctx.beginPath();
      ctx.moveTo(142, 396);
      ctx.lineTo(198, 396);
      ctx.lineTo(194, 374);
      ctx.lineTo(146, 374);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3a1d10';
      ctx.fillRect(148, 378, 44, 14);
    }
  }

  function drawCandle(ctx, i, v) {
    const c = S.CANDLE_SPOTS[i];
    const col = S.CANDLES[i];
    const pr = v.progress || { candles: [] };
    const lit = pr.candlesDone || pr.candles.includes(i);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ell(ctx, c.x, c.y, 15, 5);
    ctx.fill();
    ctx.fillStyle = goldGrad(ctx, c.x - 12, 0, c.x + 12, 0);
    ell(ctx, c.x, c.y - 2, 12, 4.5);
    ctx.fill();
    rr(ctx, c.x - 7, c.y - 9, 14, 7, 2);
    ctx.fill();
    rr(ctx, c.x - 2.5, c.y - 50, 5, 42, 2);
    ctx.fill();
    ell(ctx, c.x, c.y - 28, 5, 3);
    ctx.fill();
    ell(ctx, c.x, c.y - 50, 10, 3.2);
    ctx.fill();
    ctx.fillStyle = col.wax;
    ell(ctx, c.x, c.y - 6, 3, 3);
    ctx.fill();
    ctx.fillStyle = col.wax;
    rr(ctx, c.x - 4.5, c.y - 73, 9, 23, 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(c.x - 3, c.y - 72, 2, 20);
    ctx.strokeStyle = '#1a1010';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y - 73);
    ctx.lineTo(c.x, c.y - 77);
    ctx.stroke();
    if (lit) drawFlame(ctx, c.x, c.y - 84, 1, v.t, i + 3);
    const puff = v.fx && v.fx.puffs.find((p) => p.i === i && v.t - p.t0 < 1.4);
    if (puff) {
      const a = v.t - puff.t0;
      ctx.fillStyle = `rgba(200,200,210,${0.5 * (1 - a / 1.4)})`;
      for (let k = 0; k < 3; k++) {
        ell(ctx, c.x + Math.sin(a * 4 + k) * 5, c.y - 80 - a * 30 - k * 8, 4 + a * 5, 3 + a * 4);
        ctx.fill();
      }
    }
  }

  function drawGhost(ctx, v) {
    const t = v.t;
    const x = 480 + Math.sin(t * 0.23) * 360;
    const y = 62 + Math.sin(t * 0.7) * 18;
    const urgent = v.remainingMs < 60000;
    const a = (urgent ? 0.45 : 0.22) + 0.12 * Math.sin(t * 1.3);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(x, y);
    ctx.scale(Math.cos(t * 0.23) >= 0 ? 1 : -1, 1);
    ctx.fillStyle = '#e8f1ff';
    ctx.beginPath();
    ctx.moveTo(-12, 10);
    ctx.lineTo(-12, -4);
    ctx.arc(0, -4, 12, Math.PI, 0);
    ctx.lineTo(12, 10);
    for (let k = 0; k < 4; k++) {
      const x0 = 12 - k * 6;
      ctx.quadraticCurveTo(x0 - 3, 14 + Math.sin(t * 6 + k) * 2, x0 - 6, 10);
    }
    ctx.fill();
    ctx.fillStyle = '#1a1030';
    ell(ctx, -4, -4, 2, 2.6);
    ctx.fill();
    ell(ctx, 4, -4, 2, 2.6);
    ctx.fill();
    ell(ctx, 0, 3, 2, urgent ? 3 : 1.5);
    ctx.fill();
    ctx.restore();
  }

  function sparkle(ctx, x, y, size, color, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.3, y - size * 0.3);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x + size * 0.3, y + size * 0.3);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size * 0.3, y + size * 0.3);
    ctx.lineTo(x - size, y);
    ctx.lineTo(x - size * 0.3, y - size * 0.3);
    ctx.closePath();
    ctx.fill();
  }

  function visFor(it) {
    if (it.id === 'candle') {
      const c = S.CANDLE_SPOTS[it.i];
      return { x: c.x, y: c.y - 62, r: 18 };
    }
    return VIS[it.id];
  }

  function drawInteractables(ctx, v) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const it of v.interactables) {
      if (!it.glow) continue;
      const vis = visFor(it);
      const colors = it.owner === -1 ? S.COLORS : [S.COLORS[it.owner]];
      const isNear = v.near && v.near.id === it.id && v.near.i === it.i;
      const n = it.id === 'candle' ? 3 : 6;
      for (let k = 0; k < n; k++) {
        const a = v.t * 1.3 + (k * TAU) / n + (it.i || 0);
        const rad = vis.r * (0.9 + 0.12 * Math.sin(v.t * 2 + k));
        const color = colors[k % colors.length];
        const tw = 0.45 + 0.4 * Math.sin(v.t * 4 + k * 1.7);
        sparkle(ctx, vis.x + Math.cos(a) * rad, vis.y + Math.sin(a) * rad * 0.75, isNear ? 4.2 : 3, color, tw);
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    if (v.near) {
      const vis = visFor(v.near);
      const mine = v.near.owner === -1 || v.near.owner === v.mySlot;
      const color = mine ? S.COLORS[v.mySlot] : '#b7a9c9';
      ctx.save();
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.55 + 0.25 * Math.sin(v.t * 5);
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = -v.t * 20;
      ell(ctx, vis.x, vis.y, vis.r + 6, (vis.r + 6) * 0.85);
      ctx.stroke();
      ctx.restore();
      // bulle d'action
      const label = v.nearLabel;
      ctx.font = '600 15px Georgia';
      const tw = ctx.measureText(label).width;
      const keyW = 26;
      const bw = tw + keyW + 22;
      const bx = Math.min(W - bw - 8, Math.max(8, vis.x - bw / 2));
      // objets muraux : bulle sous l'objet (le haut de l'écran porte le chrono)
      const by = vis.y < 200 ? Math.min(vis.y + vis.r + 10, 214) : vis.y - vis.r - 40;
      ctx.fillStyle = 'rgba(16,8,24,0.88)';
      rr(ctx, bx, by, bw, 30, 15);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = color;
      rr(ctx, bx + 6, by + 5, keyW - 6, 20, 5);
      ctx.fill();
      ctx.fillStyle = '#1a0d22';
      ctx.font = 'bold 13px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText('E', bx + 6 + (keyW - 6) / 2, by + 20);
      ctx.fillStyle = '#f6ecd8';
      ctx.font = '600 15px Georgia';
      ctx.textAlign = 'left';
      ctx.fillText(label, bx + keyW + 10, by + 20);
    }
  }

  function drawNameTag(ctx, p) {
    const y = p.y - 122;
    ctx.font = '600 13px Georgia';
    const tw = ctx.measureText(p.name).width;
    const w = tw + 24;
    ctx.fillStyle = 'rgba(16,8,24,0.75)';
    rr(ctx, p.x - w / 2, y - 14, w, 20, 10);
    ctx.fill();
    ctx.fillStyle = S.COLORS[p.slot];
    ell(ctx, p.x - w / 2 + 10, y - 4, 3.5, 3.5);
    ctx.fill();
    ctx.fillStyle = '#f6ecd8';
    ctx.textAlign = 'left';
    ctx.fillText(p.name, p.x - w / 2 + 17, y + 1);
  }

  // ---------- rendu principal ----------
  function render(ctx, v) {
    if (!bg) init();
    const pr = v.progress || {};
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(bg, 0, 0);
    drawMirrorGlass(ctx, v);
    drawPortraitEyes(ctx, v);
    drawFire(ctx, v);
    drawNiches(ctx, v);
    drawClockDyn(ctx, v);
    drawDoor(ctx, v);
    SCONCES.forEach((x, k) => drawFlame(ctx, x, 104, 1, v.t, k));

    // objets au sol + personnages, triés en profondeur
    const items = [{ y: 466, draw: () => drawTable(ctx, v) }];
    S.CANDLE_SPOTS.forEach((c, i) => items.push({ y: c.y, draw: () => drawCandle(ctx, i, v) }));
    const lights = [];
    for (const p of v.players) {
      if (p.exited) continue;
      items.push({
        y: p.y,
        draw: () => {
          const lp = C.drawCharacter(ctx, {
            x: p.x, y: p.y, scale: 0.95, look: p.look, dir: p.dir, moving: p.moving, walk: p.walk,
            t: v.t + p.slot * 1.7, expression: p.expression, blink: p.blink, ring: S.COLORS[p.slot],
          });
          lights.push({ x: p.x, y: p.y - 55, r: 80, a: 0.5 });
          const L = { lanterne: [140, '140,225,255', 0.3], baguette: [95, '255,215,120', 0.22], pendule: [100, '200,140,255', 0.24] }[lp.kind];
          lights.push({ x: lp.x, y: lp.y, r: L[0], a: 0.85, col: L[1], ga: L[2] });
        },
      });
    }
    items.sort((a, b) => a.y - b.y).forEach((it) => it.draw());

    // ---- éclairage ----
    const flick = 1 + Math.sin(v.t * 8) * 0.04 + Math.sin(v.t * 13) * 0.03;
    SCONCES.forEach((x) => lights.push({ x, y: 104, r: 125 * flick, a: 0.85, col: '255,190,90', ga: 0.2 }));
    lights.push({ x: 480, y: 120, r: 170, a: 0.6, col: '140,180,255', ga: 0.1 });
    lights.push({ x: 700, y: 215, r: 245 * flick, a: 0.95, col: '255,140,50', ga: 0.22 });
    lights.push({ x: 200, y: 128, r: 70, a: 0.35, col: '150,190,255', ga: 0.08 });
    S.CANDLE_SPOTS.forEach((c, i) => {
      if (pr.candlesDone || (pr.candles && pr.candles.includes(i))) {
        lights.push({ x: c.x, y: c.y - 84, r: 115 * flick, a: 0.85, col: '255,200,110', ga: 0.22 });
      }
    });
    if (pr.coffret) lights.push({ x: 170, y: 394, r: 70, a: 0.7, col: '255,210,130', ga: 0.2 });
    if (pr.doorOpen) lights.push({ x: 76, y: 175, r: 240, a: 1, col: '200,225,255', ga: 0.3 });
    (pr.mantel || []).forEach((r, k) => r && lights.push({ x: NICHE_X[k], y: 106, r: 45, a: 0.6, col: '255,220,140', ga: 0.15 }));

    const darkness = Math.min(0.8, 0.6 + (v.remainingMs < 30000 ? 0.05 : 0) - (v.fx ? v.fx.flash * 0.35 : 0));
    sh.globalCompositeOperation = 'source-over';
    sh.clearRect(0, 0, W, H);
    sh.fillStyle = `rgba(7,4,22,${Math.max(0.2, darkness)})`;
    sh.fillRect(0, 0, W, H);
    sh.globalCompositeOperation = 'destination-out';
    for (const L of lights) {
      const g = sh.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r);
      g.addColorStop(0, `rgba(0,0,0,${L.a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      sh.fillStyle = g;
      sh.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
    }
    sh.fillStyle = 'rgba(0,0,0,0.32)';
    sh.beginPath();
    BEAM.forEach(([x, y], k) => (k ? sh.lineTo(x, y) : sh.moveTo(x, y)));
    sh.fill();
    ctx.drawImage(shade, 0, 0);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const L of lights) {
      if (!L.col) continue;
      const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r * 0.8);
      g.addColorStop(0, `rgba(${L.col},${L.ga})`);
      g.addColorStop(1, `rgba(${L.col},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
    }
    // rayon de lune bleu + poussières
    const mg = ctx.createLinearGradient(0, 200, 0, 612);
    mg.addColorStop(0, 'rgba(120,170,255,0.16)');
    mg.addColorStop(1, 'rgba(120,170,255,0.04)');
    ctx.fillStyle = mg;
    ctx.beginPath();
    BEAM.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.fill();
    for (let k = 0; k < 34; k++) {
      const seed = (k * 9301 + 49297) % 233280 / 233280;
      const yy = 205 + ((seed * 400 + v.t * (8 + seed * 10)) % 405);
      const f = (yy - 200) / 412;
      const left = 432 + (318 - 432) * f, right = 528 + (650 - 528) * f;
      const xx = left + (right - left) * ((seed * 7.3 + Math.sin(v.t * 0.5 + k) * 0.05) % 1);
      ctx.fillStyle = `rgba(200,225,255,${0.25 + 0.25 * Math.sin(v.t * 2 + k)})`;
      ctx.fillRect(xx, yy, 1.6, 1.6);
    }
    ctx.restore();

    drawGhost(ctx, v);
    for (const p of v.players) if (!p.exited) drawNameTag(ctx, p);
    drawInteractables(ctx, v);

    // éclats quand une relique apparaît
    if (v.fx) {
      for (const b of v.fx.bursts) {
        const a = v.t - b.t0;
        if (a > 1.4) continue;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 14; k++) {
          const ang = (k / 14) * TAU;
          const d = 10 + a * 70;
          sparkle(ctx, b.x + Math.cos(ang) * d, b.y + Math.sin(ang) * d * 0.8, 5 * (1 - a / 1.4) + 1, b.color, 1 - a / 1.4);
        }
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      if (v.fx.flash > 0) {
        ctx.fillStyle = `rgba(255,230,170,${v.fx.flash * 0.18})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
    // vignette de fin de chrono
    if (v.remainingMs < 30000 && v.phase === 'playing') {
      const pulse = 0.25 + 0.2 * Math.sin(v.t * 6);
      const vg = ctx.createRadialGradient(W / 2, H / 2, 260, W / 2, H / 2, 620);
      vg.addColorStop(0, 'rgba(120,0,30,0)');
      vg.addColorStop(1, `rgba(120,0,30,${pulse})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function init() {
    bg = document.createElement('canvas');
    bg.width = W;
    bg.height = H;
    drawStatic(bg.getContext('2d'));
    shade = document.createElement('canvas');
    shade.width = W;
    shade.height = H;
    sh = shade.getContext('2d');
  }

  root.Room = { render, relicIcon, VIS };
})(window);
