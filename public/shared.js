/* Données partagées entre le serveur (Node) et le navigateur. */
(function (root) {
  'use strict';

  const S = {
    W: 960,
    H: 640,
    WALL_Y: 246,
    FLOOR: { minX: 40, maxX: 920, minY: 274, maxY: 612 },
    GAME_DURATION_MS: 5 * 60 * 1000,
    PLAYER_SPEED: 180,
    INTERACT_RADIUS: 80,
    TEAM_RADIUS: 150,
    COLORS: ['#ffc95e', '#7fdcff'],
    COLOR_NAMES: ['dorée', 'bleu lune'],

    SYMBOLS: [
      { glyph: '☾', label: 'la lune' },
      { glyph: '★', label: "l'étoile" },
      { glyph: '♥', label: 'le cœur' },
      { glyph: '☠', label: 'le crâne' },
      { glyph: '☀', label: 'le soleil' },
      { glyph: '♠', label: 'le pique' },
    ],

    CANDLES: [
      { id: 'rouge', label: 'rouge', wax: '#c22a43' },
      { id: 'vert', label: 'verte', wax: '#2f9a62' },
      { id: 'bleu', label: 'bleue', wax: '#3b6fd1' },
      { id: 'violet', label: 'violette', wax: '#8a46c4' },
    ],

    RELICS: [
      { id: 'cle', name: 'la clé en argent', short: 'Clé en argent' },
      { id: 'bague', name: 'la bague maudite', short: 'Bague maudite' },
      { id: 'medaillon', name: 'le médaillon', short: 'Médaillon' },
    ],

    NICHES: ['Niche de gauche', 'Niche du centre', 'Niche de droite'],
    CLOCK_COMPARTMENTS: ['le balancier', 'le cadran', 'le socle'],

    // Points d'interaction (au sol, devant chaque élément du décor)
    SPOTS: {
      door: { x: 78, y: 292 },
      mirror: { x: 200, y: 292 },
      portrait: { x: 335, y: 292 },
      fireplace: { x: 700, y: 300 },
      clock: { x: 878, y: 296 },
      coffret: { x: 170, y: 478 },
    },
    CANDLE_SPOTS: [
      { x: 290, y: 566 },
      { x: 408, y: 404 },
      { x: 552, y: 404 },
      { x: 670, y: 566 },
    ],

    // Qui peut voir / agir (0 = créatrice du salon, 1 = invitée)
    ROLES: { mirror: 0, coffret: 1, portrait: 1, candle: 0, hints: 0, clock: 1 },

    START: [
      { x: 446, y: 540 },
      { x: 514, y: 540 },
    ],

    LOOKS: {
      skin: [
        { id: 'porcelaine', label: 'Porcelaine', color: '#f7dfcd', shade: '#e2bea6' },
        { id: 'miel', label: 'Miel', color: '#e4b38c', shade: '#c9946c' },
        { id: 'cannelle', label: 'Cannelle', color: '#b97c55', shade: '#9a6141' },
        { id: 'ebene', label: 'Ébène', color: '#7b4b32', shade: '#5f3824' },
      ],
      hair: [
        { id: 'chignon', label: 'Chignon flamboyant', color: '#c8502e', light: '#ee8048', dark: '#8a3018', brow: '#7a2a14' },
        { id: 'carre', label: 'Carré corbeau', color: '#1f1c36', light: '#5a55a0', dark: '#0e0d1a', brow: '#14121f' },
        { id: 'tresses', label: 'Tresses lunaires', color: '#ece3c6', light: '#ffffff', dark: '#b9ac85', brow: '#a3956c' },
      ],
      outfit: [
        { id: 'redingote', label: 'Redingote améthyste' },
        { id: 'robe', label: 'Robe bordeaux à volants' },
        { id: 'exploratrice', label: 'Tenue d’exploratrice' },
      ],
      accessory: [
        { id: 'lanterne', label: 'Lanterne spectrale' },
        { id: 'baguette', label: 'Baguette étoilée' },
        { id: 'pendule', label: 'Pendule de cristal' },
      ],
    },
  };

  S.OBSTACLES = [{ x: 108, y: 432, w: 124, h: 36 }].concat(
    S.CANDLE_SPOTS.map((c) => ({ x: c.x - 11, y: c.y - 8, w: 22, h: 13 }))
  );

  S.defaultLook = () => ({ skin: 'miel', hair: 'chignon', outfit: 'robe', accessory: 'lanterne' });

  S.sanitizeLook = (look) => {
    const out = {};
    for (const key of Object.keys(S.LOOKS)) {
      const ids = S.LOOKS[key].map((o) => o.id);
      out[key] = look && ids.includes(look[key]) ? look[key] : ids[0];
    }
    return out;
  };

  S.sanitizeName = (name) => {
    const clean = String(name == null ? '' : name).replace(/[<>&"]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
    return clean || 'Chasseuse';
  };

  S.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  S.canStand = (x, y) => {
    const F = S.FLOOR;
    if (x < F.minX || x > F.maxX || y < F.minY || y > F.maxY) return false;
    const bx = x - 11, by = y - 5, bw = 22, bh = 8;
    for (const o of S.OBSTACLES) {
      if (bx < o.x + o.w && bx + bw > o.x && by < o.y + o.h && by + bh > o.y) return false;
    }
    return true;
  };

  S.relic = (id) => S.RELICS.find((r) => r.id === id);

  if (typeof module === 'object' && module.exports) module.exports = S;
  else root.SHARED = S;
})(typeof window !== 'undefined' ? window : globalThis);
