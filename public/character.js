/* Dessin des chasseuses de fantômes (canvas, entièrement vectoriel). */
(function (root) {
  'use strict';
  const S = root.SHARED;
  const TAU = Math.PI * 2;
  const pick = (k, id) => S.LOOKS[k].find((o) => o.id === id) || S.LOOKS[k][0];

  function ell(ctx, x, y, rx, ry, rot) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU);
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }

  const OUTFIT = {
    redingote: { main: '#7140b0', dark: '#45216f', light: '#9a6ad6', trim: '#efc95e', legs: '#2a1f3d', boots: '#1f130c', sleeve: '#7140b0' },
    robe: { main: '#a8214c', dark: '#6e1230', light: '#d4497a', trim: '#f2c75e', legs: '#1d1220', boots: '#2a1410', sleeve: '#a8214c' },
    exploratrice: { main: '#1f8f68', dark: '#125a41', light: '#3fbf8f', trim: '#eaa92a', legs: '#f1e6c9', stripe: '#1f8f68', boots: '#5a3720', sleeve: '#1f8f68' },
  };

  function drawLeg(ctx, hx, ang, lift, O, outfitId, side) {
    ctx.save();
    ctx.translate(hx, -36);
    if (side) ctx.rotate(ang);
    ctx.translate(0, -lift);
    ctx.fillStyle = O.legs;
    rr(ctx, -3.3, 0, 6.6, 29, 3);
    ctx.fill();
    if (outfitId === 'exploratrice') {
      ctx.fillStyle = O.stripe;
      for (let yy = 3; yy < 26; yy += 6) ctx.fillRect(-3.3, yy, 6.6, 2.6);
    }
    ctx.fillStyle = O.boots;
    rr(ctx, -4.2, 22, 8.4, 10, 3);
    ctx.fill();
    ell(ctx, side ? 3 : 0, 32, side ? 7.5 : 5.2, 3.2);
    ctx.fill();
    if (outfitId === 'redingote') {
      ctx.fillStyle = O.trim;
      ctx.fillRect(-2.2, 25, 4.4, 2);
    }
    ctx.restore();
  }

  function drawArm(ctx, sx, ang, O, skin, puff) {
    ctx.save();
    ctx.translate(sx, -63);
    ctx.rotate(ang);
    ctx.fillStyle = O.sleeve;
    rr(ctx, -3.6, -1, 7.2, 20, 3.6);
    ctx.fill();
    ctx.fillStyle = O.dark;
    ctx.fillRect(-3.6, 9, 7.2, 1.2);
    ctx.fillStyle = O.trim;
    ctx.fillRect(-3.6, 16.5, 7.2, 2.5);
    ctx.fillStyle = skin.color;
    ell(ctx, 0, 23, 3.7, 3.9);
    ctx.fill();
    ctx.restore();
    if (puff) {
      ctx.fillStyle = O.main;
      ell(ctx, sx, -63, 6.5, 5.5);
      ctx.fill();
      ctx.fillStyle = O.light;
      ell(ctx, sx - 1.5, -65, 2.6, 1.8);
      ctx.fill();
    }
    return [sx - Math.sin(ang) * 23, -63 + Math.cos(ang) * 23];
  }

  function drawBody(ctx, id, O, t, sw, back) {
    if (id === 'robe') {
      const sway = sw * 1.4;
      const g = ctx.createLinearGradient(-25, 0, 25, 0);
      g.addColorStop(0, O.dark);
      g.addColorStop(0.42, O.main);
      g.addColorStop(0.58, O.light);
      g.addColorStop(1, O.dark);
      // jupon de dentelle
      ctx.fillStyle = '#f3e6d8';
      ctx.beginPath();
      ctx.moveTo(-22 + sway, -14);
      for (let k = 0; k < 8; k++) {
        const x0 = -22 + sway + k * (44 / 8);
        ctx.quadraticCurveTo(x0 + 44 / 16, -9, x0 + 44 / 8, -14);
      }
      ctx.lineTo(-22 + sway, -14);
      ctx.fill();
      // jupe en cloche
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-9, -41);
      ctx.quadraticCurveTo(-16, -28, -25 + sway, -14);
      const n = 6;
      for (let k = 0; k < n; k++) {
        const x0 = -25 + sway + k * (50 / n);
        ctx.quadraticCurveTo(x0 + 50 / n / 2, -8.5, x0 + 50 / n, -14);
      }
      ctx.quadraticCurveTo(16, -28, 9, -41);
      ctx.closePath();
      ctx.fill();
      // volant et galon doré
      ctx.strokeStyle = O.dark;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-21 + sway * 0.8, -19);
      for (let k = 0; k < 6; k++) {
        const x0 = -21 + sway * 0.8 + k * 7;
        ctx.quadraticCurveTo(x0 + 3.5, -16, x0 + 7, -19);
      }
      ctx.stroke();
      ctx.strokeStyle = O.trim;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-16 + sway * 0.6, -26);
      for (let k = 0; k < 4; k++) {
        const x0 = -16 + sway * 0.6 + k * 8;
        ctx.quadraticCurveTo(x0 + 4, -23.5, x0 + 8, -26);
      }
      ctx.stroke();
      // corsage
      ctx.fillStyle = O.main;
      rr(ctx, -10, -67, 20, 28, 6);
      ctx.fill();
      if (!back) {
        ctx.fillStyle = O.trim;
        ctx.beginPath();
        ctx.moveTo(-8, -66);
        ctx.lineTo(0, -58);
        ctx.lineTo(8, -66);
        ctx.lineTo(6, -67);
        ctx.lineTo(0, -61);
        ctx.lineTo(-6, -67);
        ctx.fill();
        ctx.strokeStyle = O.dark;
        ctx.lineWidth = 0.9;
        for (let yy = -55; yy < -42; yy += 4) {
          ctx.beginPath();
          ctx.moveTo(-3, yy);
          ctx.lineTo(3, yy + 3);
          ctx.moveTo(3, yy);
          ctx.lineTo(-3, yy + 3);
          ctx.stroke();
        }
        // nœud
        ctx.fillStyle = O.trim;
        ctx.beginPath();
        ctx.moveTo(0, -40);
        ctx.lineTo(-6, -44);
        ctx.lineTo(-6, -36);
        ctx.closePath();
        ctx.moveTo(0, -40);
        ctx.lineTo(6, -44);
        ctx.lineTo(6, -36);
        ctx.closePath();
        ctx.fill();
        ell(ctx, 0, -40, 1.8, 1.8);
        ctx.fill();
      }
    } else if (id === 'redingote') {
      const sway = sw * 1.2;
      const g = ctx.createLinearGradient(-18, 0, 18, 0);
      g.addColorStop(0, O.dark);
      g.addColorStop(0.5, O.main);
      g.addColorStop(1, O.dark);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-11, -42);
      ctx.lineTo(-18 + sway, -12);
      ctx.lineTo(-3 + sway * 0.5, -16);
      ctx.lineTo(0, -32);
      ctx.lineTo(3 + sway * 0.5, -16);
      ctx.lineTo(18 + sway, -12);
      ctx.lineTo(11, -42);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = O.trim;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-18 + sway, -12);
      ctx.lineTo(-3 + sway * 0.5, -16);
      ctx.moveTo(3 + sway * 0.5, -16);
      ctx.lineTo(18 + sway, -12);
      ctx.stroke();
      ctx.fillStyle = O.main;
      rr(ctx, -11, -68, 22, 32, 6);
      ctx.fill();
      ctx.fillStyle = O.dark;
      rr(ctx, -9, -73, 18, 7, 3);
      ctx.fill();
      if (!back) {
        ctx.fillStyle = O.dark;
        ctx.beginPath();
        ctx.moveTo(-9, -67);
        ctx.lineTo(0, -50);
        ctx.lineTo(-3, -67);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(9, -67);
        ctx.lineTo(0, -50);
        ctx.lineTo(3, -67);
        ctx.fill();
        ctx.fillStyle = '#f6f0e4';
        for (const yy of [-64, -60, -56]) {
          ell(ctx, 0, yy, 3.2, 2.4);
          ctx.fill();
        }
        ctx.fillStyle = O.trim;
        for (const [bx, by] of [[-5, -47], [5, -47], [-5, -41], [5, -41]]) {
          ell(ctx, bx, by, 1.6, 1.6);
          ctx.fill();
        }
      } else {
        ctx.strokeStyle = O.dark;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -66);
        ctx.lineTo(0, -34);
        ctx.stroke();
      }
    } else {
      // exploratrice
      ctx.fillStyle = '#6b4a2b';
      ctx.beginPath();
      ctx.moveTo(-11, -42);
      ctx.lineTo(-14 + sw, -25);
      ctx.lineTo(14 + sw, -25);
      ctx.lineTo(11, -42);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#4e341d';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const px of [-6, 0, 6]) {
        ctx.moveTo(px, -40);
        ctx.lineTo(px * 1.25 + sw, -26);
      }
      ctx.stroke();
      ctx.fillStyle = O.main;
      rr(ctx, -11, -68, 22, 29, 6);
      ctx.fill();
      ctx.fillStyle = '#5a3720';
      ctx.fillRect(-11, -43, 22, 4);
      if (!back) {
        ctx.fillStyle = O.dark;
        rr(ctx, -9.5, -55, 7, 7, 1.5);
        ctx.fill();
        rr(ctx, 2.5, -55, 7, 7, 1.5);
        ctx.fill();
        ctx.fillStyle = O.trim;
        ell(ctx, -6, -54, 1.1, 1.1);
        ctx.fill();
        ell(ctx, 6, -54, 1.1, 1.1);
        ctx.fill();
        ctx.fillRect(-2.5, -43.5, 5, 5);
        ctx.fillStyle = '#5a3720';
        ctx.fillRect(-1.2, -42.3, 2.4, 2.6);
        ctx.strokeStyle = '#5a3720';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(-10, -66);
        ctx.lineTo(10, -44);
        ctx.stroke();
      }
      // foulard moutarde qui flotte
      ctx.fillStyle = O.trim;
      rr(ctx, -9, -72, 18, 6, 3);
      ctx.fill();
      const flut = Math.sin(t * 5) * 2;
      ctx.beginPath();
      ctx.moveTo(4, -68);
      ctx.quadraticCurveTo(-10 + flut, -62, -14 + flut, -54);
      ctx.lineTo(-10 + flut, -53);
      ctx.quadraticCurveTo(-6 + flut, -60, 8, -67);
      ctx.fill();
    }
  }

  function drawHairBack(ctx, id, Hc) {
    ctx.fillStyle = Hc.color;
    if (id === 'carre') {
      rr(ctx, -18, -100, 36, 32, 10);
      ctx.fill();
    } else if (id === 'tresses') {
      ctx.fillStyle = Hc.dark;
      ell(ctx, 0, -86, 17, 17.5);
      ctx.fill();
    }
  }

  function drawBraid(ctx, x0, y0, sw, Hc, side) {
    for (let k = 0; k < 7; k++) {
      const y = y0 + k * 5;
      const x = x0 + side * (k > 1 ? 1 : 0) + sw * 0.7 * (k / 6);
      ctx.fillStyle = k % 2 ? Hc.light : Hc.color;
      ell(ctx, x, y, 4.6 - k * 0.2, 3.7, side * 0.5);
      ctx.fill();
      ctx.strokeStyle = Hc.dark;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
    const ex = x0 + side + sw * 0.7, ey = y0 + 34;
    ctx.fillStyle = '#a8214c';
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - 5, ey - 3);
    ctx.lineTo(ex - 5, ey + 3);
    ctx.closePath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex + 5, ey - 3);
    ctx.lineTo(ex + 5, ey + 3);
    ctx.closePath();
    ctx.fill();
  }

  function drawHairFront(ctx, id, Hc, t, back, sw) {
    ctx.fillStyle = Hc.color;
    if (id === 'chignon') {
      if (back) {
        ell(ctx, 0, -86, 16.5, 17);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(-16.5, -81);
        ctx.bezierCurveTo(-20, -111, 20, -111, 16.5, -81);
        ctx.bezierCurveTo(12, -90, 5, -95, -3, -93);
        ctx.bezierCurveTo(-9, -92, -13, -88, -16.5, -81);
        ctx.fill();
        ctx.strokeStyle = Hc.color;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(14, -86);
        ctx.quadraticCurveTo(18, -78, 13, -72);
        ctx.stroke();
      }
      ctx.fillStyle = Hc.color;
      ell(ctx, 0, -104, 9.5, 8.5);
      ctx.fill();
      ctx.strokeStyle = Hc.light;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(-1, -105, 5.5, Math.PI * 1.1, Math.PI * 1.6);
      ctx.stroke();
      ctx.strokeStyle = '#efc95e';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-12, -109);
      ctx.lineTo(10, -99);
      ctx.stroke();
      ctx.fillStyle = '#fff6e0';
      ell(ctx, -12, -109, 2.2, 2.2);
      ctx.fill();
    } else if (id === 'carre') {
      if (back) {
        rr(ctx, -18, -102, 36, 34, 11);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(-17.5, -77);
        ctx.bezierCurveTo(-21, -111, 21, -111, 17.5, -77);
        ctx.lineTo(13.5, -77);
        ctx.lineTo(13, -89);
        ctx.lineTo(-13, -89);
        ctx.lineTo(-13.5, -77);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = Hc.light;
      ctx.globalAlpha *= 0.6;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -90, 12, Math.PI * 1.15, Math.PI * 1.45);
      ctx.stroke();
      ctx.globalAlpha /= 0.6;
    } else {
      if (back) {
        ell(ctx, 0, -87, 16.8, 17);
        ctx.fill();
        drawBraid(ctx, -7, -78, sw, Hc, -1);
        drawBraid(ctx, 7, -78, sw, Hc, 1);
      } else {
        ctx.beginPath();
        ctx.moveTo(-16.8, -80);
        ctx.bezierCurveTo(-20, -111, 20, -111, 16.8, -80);
        ctx.quadraticCurveTo(11, -90, 0, -95);
        ctx.quadraticCurveTo(-11, -90, -16.8, -80);
        ctx.fill();
        ctx.strokeStyle = Hc.dark;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -101);
        ctx.lineTo(0, -95);
        ctx.stroke();
        drawBraid(ctx, -15, -80, sw, Hc, -1);
        drawBraid(ctx, 15, -80, sw, Hc, 1);
      }
      // couronne de fleurs lunaires
      ctx.fillStyle = '#b9e6ff';
      for (const fx of [-9, -3, 3, 9]) {
        ell(ctx, fx, -99 + Math.abs(fx) * 0.35, 1.8, 1.8);
        ctx.fill();
      }
    }
  }

  function drawFace(ctx, o, side, Hc) {
    const expr = o.expression || 'neutral';
    const ex = side ? 2.6 : 0;
    const px = side ? 1.7 : 0, py = side ? 0 : 0.6;
    for (const s of [-1, 1]) {
      const cx = ex + s * (side ? 5.2 : 6), cy = -85;
      if (o.blink) {
        ctx.strokeStyle = '#2a1a1a';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(cx - 3.5, cy);
        ctx.quadraticCurveTo(cx, cy + 2, cx + 3.5, cy);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#fff';
        ell(ctx, cx, cy, 4.4, expr === 'scared' ? 6 : 5.3);
        ctx.fill();
        ctx.fillStyle = '#2b1d3a';
        ell(ctx, cx + px, cy + py, expr === 'scared' ? 1.9 : 2.8, expr === 'scared' ? 2.1 : 3.2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ell(ctx, cx + px + 1, cy + py - 1.3, 0.95, 0.95);
        ctx.fill();
        ctx.strokeStyle = '#2a1a1a';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(cx - 4.6, cy - 3.2);
        ctx.quadraticCurveTo(cx, cy - 6.8, cx + 4.6, cy - 3.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + s * 4.3, cy - 3.6);
        ctx.lineTo(cx + s * 6.4, cy - 5.6);
        ctx.stroke();
      }
      // sourcils
      const by = cy - (expr === 'scared' ? 10.5 : 9);
      const inner = expr === 'scared' ? -2 : expr === 'happy' ? -0.5 : 0;
      ctx.strokeStyle = Hc.brow;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(cx - s * 3, by + inner);
      ctx.quadraticCurveTo(cx, by - 1.5, cx + s * 3.6, by + (expr === 'scared' ? 0.8 : 0));
      ctx.stroke();
      // joues
      ctx.fillStyle = 'rgba(255,110,140,0.32)';
      ell(ctx, cx + s * 2.2, cy + 6, 3.3, 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ell(ctx, ex + (side ? 1.5 : 0), -80, 1.1, 0.8);
    ctx.fill();
    const mx = ex + (side ? 1 : 0);
    if (expr === 'happy') {
      ctx.fillStyle = '#7a2233';
      ctx.beginPath();
      ctx.arc(mx, -77.5, 4.3, 0.08 * Math.PI, 0.92 * Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff8fa3';
      ell(ctx, mx, -74.8, 2, 1);
      ctx.fill();
    } else if (expr === 'scared') {
      ctx.fillStyle = '#5a1a26';
      ell(ctx, mx, -76, 2.4, 3.3);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#7a2233';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(mx, -79, 3.2, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    }
  }

  function drawStar(ctx, x, y, R, r, rot) {
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = rot + (k * Math.PI) / 5 - Math.PI / 2;
      const rad = k % 2 ? r : R;
      ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath();
  }

  /* Dessine l'accessoire à la position de la main ; renvoie le point lumineux (coord. locales). */
  function drawAccessory(ctx, id, hx, hy, t) {
    ctx.save();
    ctx.translate(hx, hy);
    let light = [hx, hy];
    if (id === 'lanterne') {
      const sw = Math.sin(t * 2.6) * 0.2;
      ctx.rotate(sw);
      ctx.strokeStyle = '#d6b25c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -1);
      ctx.lineTo(0, 4);
      ctx.stroke();
      ctx.fillStyle = '#3d2c14';
      rr(ctx, -6.5, 4, 13, 3.5, 1.5);
      ctx.fill();
      const g = ctx.createRadialGradient(0, 13, 1, 0, 13, 9);
      g.addColorStop(0, '#f4fdff');
      g.addColorStop(0.45, '#8fe3ff');
      g.addColorStop(1, 'rgba(60,140,200,0.75)');
      ctx.fillStyle = g;
      rr(ctx, -5.2, 7.5, 10.4, 11, 2);
      ctx.fill();
      ctx.strokeStyle = '#d6b25c';
      ctx.lineWidth = 1.1;
      ctx.strokeRect(-5.2, 7.5, 10.4, 11);
      ctx.beginPath();
      ctx.moveTo(0, 7.5);
      ctx.lineTo(0, 18.5);
      ctx.stroke();
      ctx.fillStyle = '#3d2c14';
      rr(ctx, -6.5, 18.5, 13, 3.5, 1.5);
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      const halo = ctx.createRadialGradient(0, 13, 0, 0, 13, 22);
      halo.addColorStop(0, 'rgba(150,230,255,0.55)');
      halo.addColorStop(1, 'rgba(150,230,255,0)');
      ctx.fillStyle = halo;
      ell(ctx, 0, 13, 22, 22);
      ctx.fill();
      light = [hx, hy + 13];
    } else if (id === 'baguette') {
      ctx.rotate(0.5 + Math.sin(t * 2) * 0.08);
      ctx.strokeStyle = '#3a2214';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 3);
      ctx.lineTo(0, -21);
      ctx.stroke();
      ctx.strokeStyle = '#efc95e';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-1.3, -2);
      ctx.lineTo(1.3, -2);
      ctx.stroke();
      ctx.fillStyle = '#ffd86b';
      drawStar(ctx, 0, -25, 6.2, 2.7, t * 1.5);
      ctx.fill();
      ctx.strokeStyle = '#fff3c0';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 4; k++) {
        const a = t * 3 + (k * TAU) / 4;
        const rad = 9 + Math.sin(t * 5 + k) * 2;
        ctx.fillStyle = `rgba(255,230,140,${0.5 + 0.4 * Math.sin(t * 6 + k)})`;
        ell(ctx, Math.cos(a) * rad, -25 + Math.sin(a) * rad, 1.2, 1.2);
        ctx.fill();
      }
      const halo = ctx.createRadialGradient(0, -25, 0, 0, -25, 16);
      halo.addColorStop(0, 'rgba(255,220,120,0.5)');
      halo.addColorStop(1, 'rgba(255,220,120,0)');
      ctx.fillStyle = halo;
      ell(ctx, 0, -25, 16, 16);
      ctx.fill();
      light = [hx + 12, hy - 22];
    } else {
      const a = Math.sin(t * 3) * 0.55;
      const ex = Math.sin(a) * 16, ey = Math.cos(a) * 16;
      ctx.strokeStyle = '#d9dde8';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      const g = ctx.createLinearGradient(ex, ey, ex, ey + 12);
      g.addColorStop(0, '#f1dcff');
      g.addColorStop(1, '#8a4fd8');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + 4.5, ey + 4);
      ctx.lineTo(ex, ey + 13);
      ctx.lineTo(ex - 4.5, ey + 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      const halo = ctx.createRadialGradient(ex, ey + 5, 0, ex, ey + 5, 18);
      halo.addColorStop(0, 'rgba(200,140,255,0.55)');
      halo.addColorStop(1, 'rgba(200,140,255,0)');
      ctx.fillStyle = halo;
      ell(ctx, ex, ey + 5, 18, 18);
      ctx.fill();
      light = [hx + ex, hy + ey + 5];
    }
    ctx.restore();
    return light;
  }

  /*
   * o = { x, y, scale, look, dir, moving, walk, t, expression, blink, alpha, ring }
   * (x, y) = position des pieds. Renvoie le point lumineux de l'accessoire (coord. monde).
   */
  function drawCharacter(ctx, o) {
    const look = S.sanitizeLook(o.look);
    const s = o.scale || 1, t = o.t || 0;
    const skin = pick('skin', look.skin), Hc = pick('hair', look.hair), O = OUTFIT[look.outfit];
    const dir = o.dir || 'down';
    const back = dir === 'up', side = dir === 'left' || dir === 'right', flip = dir === 'left' ? -1 : 1;
    const moving = !!o.moving, ph = o.walk || 0;
    const sw = moving ? Math.sin(ph) : 0;
    const bob = moving ? -Math.abs(Math.cos(ph)) * 2.4 : Math.sin(t * 2.2) * 0.6;

    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.scale(s, s);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.ring) {
      ctx.save();
      ctx.strokeStyle = o.ring;
      ctx.lineWidth = 2.2;
      ctx.globalAlpha *= 0.85;
      ell(ctx, 0, 1, 22, 7);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ell(ctx, 0, 0, 17, 5);
    ctx.fill();

    ctx.scale(flip, 1);
    ctx.translate(0, bob);

    if (!back) drawHairBack(ctx, look.hair, Hc);
    const legA = side ? sw * 0.6 : 0;
    const liftL = side ? 0 : Math.max(0, sw) * 3.5;
    const liftR = side ? 0 : Math.max(0, -sw) * 3.5;
    const hip = side ? 1.6 : 5;
    drawLeg(ctx, -hip, legA, liftL, O, look.outfit, side);
    drawLeg(ctx, hip, -legA, liftR, O, look.outfit, side);
    drawBody(ctx, look.outfit, O, t, sw, back);

    const armBack = 0.2 + (moving ? sw * 0.55 : Math.sin(t * 1.7) * 0.04);
    drawArm(ctx, -12, armBack, O, skin, look.outfit === 'robe');

    // cou + tête
    ctx.fillStyle = skin.shade;
    ctx.fillRect(-3, -72, 6, 7);
    ctx.fillStyle = skin.color;
    ell(ctx, 0, -85, 15, 16);
    ctx.fill();
    if (!back) {
      ell(ctx, -14.6, -84, 3, 4);
      ctx.fill();
      ell(ctx, 14.6, -84, 3, 4);
      ctx.fill();
      drawFace(ctx, o, side, Hc);
    }
    drawHairFront(ctx, look.hair, Hc, t, back, sw);

    const accA = moving ? -0.5 - sw * 0.25 : -0.55 + Math.sin(t * 1.5) * 0.05;
    const hand = drawArm(ctx, 12, accA, O, skin, look.outfit === 'robe');
    const lp = drawAccessory(ctx, look.accessory, hand[0], hand[1], t);
    ctx.restore();
    return { x: o.x + flip * s * lp[0], y: o.y + s * (lp[1] + bob), kind: look.accessory };
  }

  root.Character = { drawCharacter, drawAccessory, drawStar, ell, rr };
})(window);
