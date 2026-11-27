/* 季忆 — 场景的几何、材质与季节状态 */
(function () {
  'use strict';
  const S4 = window.S4;
  const { math } = S4;
  const {
    clamp, lerp, smoothstep, smootherstep, mod, rng, hexToRgb, mixRgb, shade,
    m4, v3, TAU,
  } = math;

  const HALF_PI = Math.PI / 2;

  /* ───────────────────────── palettes ───────────────────────── */
  const PALETTE_SRC = [
    {
      key: 'spring', glyph: '春', name: '春', en: 'SPRING', label: '春 · 玉兰', no: '01',
      bgTop: '#f9e6e2', bgMid: '#f3ddd4', bgBottom: '#dbe6d0',
      glow: '#ffdcc4', accent: '#cb7987', accentDeep: '#a25a66',
      ink: '#3a352c', muted: '#8d8576',
      leaf: ['#e58f9f', '#f2b8bf', '#fff1ea', '#cf7c8d', '#bd6b7c'],
      trunk: '#b08e6d', leafStem: '#b98f80',
      glass: '#fff2e6', light: '#fff0dd', ambient: '#e4d8c6', rim: '#fff7ef',
      petal: '#f3b6be', petalCenter: '#e0a653', particle: '#f4c0c7',
      worm: '#fbf2e6', snow: '#ffffff',
    },
    {
      key: 'summer', glyph: '夏', name: '夏', en: 'SUMMER', label: '夏 · 梅雨', no: '02',
      bgTop: '#e3f0e0', bgMid: '#d7e9d4', bgBottom: '#c9dfcc',
      glow: '#eeffe0', accent: '#4f8457', accentDeep: '#345f3e',
      ink: '#2f3a2e', muted: '#778573',
      leaf: ['#3a7446', '#4f8a4d', '#6fa356', '#2b6138', '#8ab36a'],
      trunk: '#a98d71', leafStem: '#8d9b70',
      glass: '#effbef', light: '#f5ffe5', ambient: '#d9e2cf', rim: '#f8fff0',
      petal: '#f7eccb', petalCenter: '#dc9f3f', particle: '#d3e8b2',
      worm: '#f6f2e1', snow: '#ffffff',
    },
    {
      key: 'autumn', glyph: '秋', name: '秋', en: 'AUTUMN', label: '秋 · 银杏', no: '03',
      bgTop: '#fbe6cd', bgMid: '#f5dcbd', bgBottom: '#e6cfae',
      glow: '#ffd59b', accent: '#b96635', accentDeep: '#8d4a28',
      ink: '#3d3227', muted: '#8c7f6d',
      leaf: ['#cf6d31', '#b9522b', '#e59a4f', '#9d3f28', '#edb86d'],
      trunk: '#ad8c68', leafStem: '#a98862',
      glass: '#ffefd8', light: '#ffe4bd', ambient: '#e5d5bd', rim: '#fff4e3',
      petal: '#e99a52', petalCenter: '#b06a25', particle: '#e09a52',
      worm: '#faf1e1', snow: '#fffaf2',
    },
    {
      key: 'winter', glyph: '冬', name: '冬', en: 'WINTER', label: '冬 · 初雪', no: '04',
      bgTop: '#e4eef5', bgMid: '#d9e7f0', bgBottom: '#cbdce7',
      glow: '#e2f1ff', accent: '#5f7f96', accentDeep: '#426176',
      ink: '#2e3740', muted: '#78868f',
      leaf: ['#c2d5e2', '#a9c3d3', '#eef6fb', '#96b3c6', '#d8b49a'],
      trunk: '#a8a294', leafStem: '#a09a8d',
      glass: '#f1faff', light: '#e9f5ff', ambient: '#d6e1e8', rim: '#f7fcff',
      petal: '#f4faff', petalCenter: '#c09a55', particle: '#ffffff',
      worm: '#f3eee3', snow: '#ffffff',
    },
  ];

  /* prepare rgb versions */
  const PALETTES = PALETTE_SRC.map((p) => {
    const out = Object.assign({}, p);
    out.leaf = p.leaf.map(hexToRgb);
    out.bgTop = hexToRgb(p.bgTop);
    out.bgMid = hexToRgb(p.bgMid);
    out.bgBottom = hexToRgb(p.bgBottom);
    out.glow = hexToRgb(p.glow);
    out.accent = hexToRgb(p.accent);
    out.accentDeep = hexToRgb(p.accentDeep);
    out.ink = hexToRgb(p.ink);
    out.muted = hexToRgb(p.muted);
    out.trunk = hexToRgb(p.trunk);
    out.leafStem = hexToRgb(p.leafStem);
    out.glass = hexToRgb(p.glass);
    out.light = hexToRgb(p.light);
    out.ambient = hexToRgb(p.ambient);
    out.rim = hexToRgb(p.rim);
    out.petal = hexToRgb(p.petal);
    out.petalCenter = hexToRgb(p.petalCenter);
    out.particle = hexToRgb(p.particle);
    out.worm = hexToRgb(p.worm);
    out.snow = hexToRgb(p.snow);
    return out;
  });

  const SCRATCH = {
    leaf: PALETTES[0].leaf.map(() => [0, 0, 0]),
    bgTop: [0, 0, 0], bgMid: [0, 0, 0], bgBottom: [0, 0, 0], glow: [0, 0, 0],
    accent: [0, 0, 0], accentDeep: [0, 0, 0], ink: [0, 0, 0], muted: [0, 0, 0],
    trunk: [0, 0, 0], leafStem: [0, 0, 0], glass: [0, 0, 0],
    light: [0, 0, 0], ambient: [0, 0, 0], rim: [0, 0, 0],
    petal: [0, 0, 0], petalCenter: [0, 0, 0], particle: [0, 0, 0],
    worm: [0, 0, 0], snow: [0, 0, 0],
  };

  function blendPalette(a, b, t) {
    const out = {};
    for (const k in SCRATCH) {
      if (k === 'leaf') {
        out.leaf = SCRATCH.leaf.map((c, i) => mixRgb(a.leaf[i], b.leaf[i], t, c));
      } else {
        out[k] = mixRgb(a[k], b[k], t, SCRATCH[k]);
      }
    }
    out.key = t < 0.5 ? a.key : b.key;
    out.glyph = t < 0.5 ? a.glyph : b.glyph;
    out.name = t < 0.5 ? a.name : b.name;
    out.en = t < 0.5 ? a.en : b.en;
    out.label = t < 0.5 ? a.label : b.label;
    out.no = t < 0.5 ? a.no : b.no;
    return out;
  }

  /* ───────────────────────── geometry ───────────────────────── */
  function Geo() {
    return { pos: [], nrm: [], col: [] };
  }

  function pushTri(g, a, b, c, n, col) {
    g.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    for (let i = 0; i < 3; i++) g.nrm.push(n[0], n[1], n[2]);
    for (let i = 0; i < 3; i++) g.col.push(col[0], col[1], col[2]);
  }

  function rotY(p, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
  }
  function rotX(p, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
  }

  function addBox(g, cx, cy, cz, sx, sy, sz, col, ry, rx) {
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const corners = [
      [-hx, -hy, -hz], [hx, -hy, -hz], [hx, hy, -hz], [-hx, hy, -hz],
      [-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz],
    ].map((p) => {
      let q = p;
      if (rx) q = rotX(q, rx);
      if (ry) q = rotY(q, ry);
      return [q[0] + cx, q[1] + cy, q[2] + cz];
    });
    const faces = [
      { ids: [4, 5, 6, 7], n: [0, 0, 1] },
      { ids: [1, 0, 3, 2], n: [0, 0, -1] },
      { ids: [5, 1, 2, 6], n: [1, 0, 0] },
      { ids: [0, 4, 7, 3], n: [-1, 0, 0] },
      { ids: [7, 6, 2, 3], n: [0, 1, 0] },
      { ids: [0, 1, 5, 4], n: [0, -1, 0] },
    ];
    faces.forEach((f) => {
      let n = f.n;
      if (rx) n = rotX(n, rx);
      if (ry) n = rotY(n, ry);
      const a = corners[f.ids[0]], b = corners[f.ids[1]], c = corners[f.ids[2]], d = corners[f.ids[3]];
      pushTri(g, a, b, c, n, col);
      pushTri(g, a, c, d, n, col);
    });
  }

  function addCylinder(g, p0, p1, r0, r1, seg, col, capCol) {
    const axis = v3.norm(v3.sub(p1, p0));
    let ref = Math.abs(axis[1]) > 0.92 ? [1, 0, 0] : [0, 1, 0];
    const u = v3.norm(v3.cross(axis, ref));
    const v = v3.cross(axis, u);
    const cap = capCol || col;
    const ring0 = [], ring1 = [];
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * TAU;
      const c = Math.cos(a), s = Math.sin(a);
      const d = [u[0] * c + v[0] * s, u[1] * c + v[1] * s, u[2] * c + v[2] * s];
      ring0.push([p0[0] + d[0] * r0, p0[1] + d[1] * r0, p0[2] + d[2] * r0, d]);
      ring1.push([p1[0] + d[0] * r1, p1[1] + d[1] * r1, p1[2] + d[2] * r1, d]);
    }
    for (let i = 0; i < seg; i++) {
      const j = (i + 1) % seg;
      const A = ring0[i], B = ring0[j], C = ring1[j], D = ring1[i];
      const na = [A[3][0] + C[3][0], A[3][1] + C[3][1], A[3][2] + C[3][2]];
      const nl = Math.hypot(na[0], na[1], na[2]) || 1;
      na[0] /= nl; na[1] /= nl; na[2] /= nl;
      pushTri(g, [A[0], A[1], A[2]], [B[0], B[1], B[2]], [C[0], C[1], C[2]], na, col);
      pushTri(g, [A[0], A[1], A[2]], [C[0], C[1], C[2]], [D[0], D[1], D[2]], na, col);
    }
    if (r1 > 0.001) {
      for (let i = 0; i < seg; i++) {
        const j = (i + 1) % seg;
        pushTri(g, p1, [ring1[j][0], ring1[j][1], ring1[j][2]], [ring1[i][0], ring1[i][1], ring1[i][2]], axis, cap);
      }
    }
    if (r0 > 0.001) {
      const down = [-axis[0], -axis[1], -axis[2]];
      for (let i = 0; i < seg; i++) {
        const j = (i + 1) % seg;
        pushTri(g, p0, [ring0[i][0], ring0[i][1], ring0[i][2]], [ring0[j][0], ring0[j][1], ring0[j][2]], down, shade(cap, 0.86));
      }
    }
  }

  function addQuad(g, p0, p1, p2, p3, col, ny) {
    const e1 = v3.sub(p1, p0), e2 = v3.sub(p2, p0);
    const n = v3.norm(v3.cross(e1, e2));
    const nn = ny || n;
    pushTri(g, p0, p1, p2, nn, col);
    pushTri(g, p0, p2, p3, nn, col);
  }

  function addDisc(g, cx, cy, cz, r, seg, col, normal) {
    const n = normal || [0, 1, 0];
    const ref = Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = v3.norm(v3.cross(n, ref));
    const v = v3.cross(n, u);
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * TAU, a1 = ((i + 1) / seg) * TAU;
      const p1 = [cx + (u[0] * Math.cos(a0) + v[0] * Math.sin(a0)) * r, cy + (u[1] * Math.cos(a0) + v[1] * Math.sin(a0)) * r, cz + (u[2] * Math.cos(a0) + v[2] * Math.sin(a0)) * r];
      const p2 = [cx + (u[0] * Math.cos(a1) + v[0] * Math.sin(a1)) * r, cy + (u[1] * Math.cos(a1) + v[1] * Math.sin(a1)) * r, cz + (u[2] * Math.cos(a1) + v[2] * Math.sin(a1)) * r];
      pushTri(g, [cx, cy, cz], p1, p2, n, col);
    }
  }

  /* ───────────────────────── textures ───────────────────────── */
  function canvas2d(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function makeGlyphTexture(ch) {
    const S = 512;
    const c = canvas2d(S, S);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, S, S);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '430px "Jiyi Serif", "Songti SC", "STSong", "SimSun", "Noto Serif SC", serif';
    const g = ctx.createLinearGradient(0, 80, 0, 440);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.55, '#fffaf1');
    g.addColorStop(1, '#ffeede');
    ctx.fillStyle = g;
    ctx.fillText(ch, S / 2, S / 2 + 8);
    return c;
  }

  function makeGlyphShadow(ch) {
    const S = 512;
    const c = canvas2d(S, S);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, S, S);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '430px "Jiyi Serif", "Songti SC", "STSong", "SimSun", "Noto Serif SC", serif';
    ctx.fillStyle = 'rgba(52, 42, 30, 0.6)';
    try { ctx.filter = 'blur(34px)'; } catch (e) { /* ignore */ }
    ctx.fillText(ch, S / 2, S / 2 + 8);
    ctx.fillText(ch, S / 2, S / 2 + 8);
    return c;
  }

  function makePetalTexture() {
    const W = 256, H = 512;
    const c = canvas2d(W, H);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H - 26);
    const w = 190, len = 400;
    const grad = ctx.createLinearGradient(0, 0, 0, -len);
    grad.addColorStop(0, '#ffe1e5');
    grad.addColorStop(0.3, '#fff2f0');
    grad.addColorStop(0.8, '#ffffff');
    grad.addColorStop(1, '#fff8f6');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-w * 0.7, -len * 0.18, -w * 0.68, -len * 0.68, -w * 0.06, -len);
    ctx.bezierCurveTo(w * 0.46, -len * 0.8, w * 0.7, -len * 0.3, 0, 0);
    ctx.closePath();
    ctx.fill();

    // veins
    ctx.globalCompositeOperation = 'source-atop';
    ctx.strokeStyle = 'rgba(196, 150, 150, 0.20)';
    ctx.lineWidth = 1.6;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.quadraticCurveTo(i * 16, -len * 0.55, i * 26, -len * 0.92);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.quadraticCurveTo(-8, -len * 0.5, 4, -len * 0.9);
    ctx.stroke();
    ctx.restore();
    return c;
  }

  function makeGlowTexture() {
    const S = 128;
    const c = canvas2d(S, S);
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.28, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.62, 'rgba(255,255,255,0.16)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    return c;
  }

  function makeShadowTexture() {
    const S = 256;
    const c = canvas2d(S, S);
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.92)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.42)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    return c;
  }

  function makeDotTexture() {
    const S = 128;
    const c = canvas2d(S, S);
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.52, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.62, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.8, 'rgba(255,255,255,0.12)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    return c;
  }

  function makeBeamTexture() {
    const W = 128, H = 512;
    const c = canvas2d(W, H);
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // soften sides
    const side = ctx.createLinearGradient(0, 0, W, 0);
    side.addColorStop(0, 'rgba(0,0,0,0)');
    side.addColorStop(0.3, 'rgba(0,0,0,1)');
    side.addColorStop(0.7, 'rgba(0,0,0,1)');
    side.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, W, H);
    return c;
  }

  /* ───────────────────────── builders ───────────────────────── */
  const CREAM = hexToRgb('#e7dcc9');
  const CREAM_LIGHT = hexToRgb('#f8f2e5');
  const CREAM_DARK = hexToRgb('#d3c5ae');
  const STONE = hexToRgb('#ded2bd');
  const BRASS = hexToRgb('#c09a58');
  const WOOD = hexToRgb('#8f5f3c');
  const WOOD_LIGHT = hexToRgb('#a97850');
  const WOOD_MID = hexToRgb('#6e4629');
  const WOOD_DARK = hexToRgb('#4a2c1a');
  const WOOD_DEEP = hexToRgb('#2f1c10');

  function buildRaft() {
    const g = Geo();
    addCylinder(g, [0, 0, 0], [0, 0.08, 0], 2.42, 2.35, 8, WOOD_DARK, WOOD_MID);
    addCylinder(g, [0, 0.08, 0], [0, 0.16, 0], 2.35, 2.28, 8, WOOD_MID, WOOD_LIGHT);
    addCylinder(g, [0, 0.16, 0], [0, 0.19, 0], 2.28, 2.26, 8, BRASS, BRASS);
    addCylinder(g, [0, 0.19, 0], [0, 0.25, 0], 2.2, 2.16, 8, WOOD_DARK, CREAM_LIGHT);
    addCylinder(g, [0, 0.25, 0], [0, 0.28, 0], 2.13, 2.1, 8, CREAM_LIGHT, CREAM_LIGHT);

    // plank seams on the deck
    const planks = [-1.55, -0.52, 0.52, 1.55];
    for (let i = 0; i < planks.length; i++) {
      const len = i === 0 || i === 3 ? 2.15 : 2.7;
      addBox(g, 0, 0.161, planks[i], len, 0.004, 0.008, shade(WOOD_DARK, 0.92), 0, 0);
    }
    // brass rivets on the rim
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + TAU / 16;
      addBox(g, Math.cos(a) * 2.25, 0.183, Math.sin(a) * 2.25, 0.035, 0.018, 0.035, BRASS, 0, 0);
    }

    const R = 2.16;
    const chord = 2 * R * Math.sin(Math.PI / 8);
    for (let i = 0; i < 8; i++) {
      const am = (i / 8) * TAU + TAU / 16;
      addBox(g, Math.cos(am) * R, 0.265, Math.sin(am) * R, 0.075, 0.06, chord, WOOD_DARK, -am, 0);
    }
    return g;
  }

  function buildCover() {
    const g = Geo();
    const R = 2.18, y0 = 0.3, y1 = 4.3, H = y1 - y0;
    const chord = 2 * R * Math.sin(Math.PI / 8);

    // eight corner posts, with a lighter inlay and brass shoes
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const x = Math.cos(a) * R, z = Math.sin(a) * R;
      addBox(g, x, y0 + H / 2, z, 0.085, H, 0.085, WOOD_DARK, 0, 0);
      addBox(g, Math.cos(a) * (R + 0.048), y0 + H / 2, Math.sin(a) * (R + 0.048), 0.022, H - 0.12, 0.05, WOOD_LIGHT, 0, 0);
      addBox(g, x, y1 + 0.02, z, 0.12, 0.055, 0.12, BRASS, 0, 0);
      addBox(g, x, y0 + 0.02, z, 0.12, 0.045, 0.12, BRASS, 0, 0);
    }

    // top ring + a thin brass bead
    for (let i = 0; i < 8; i++) {
      const am = (i / 8) * TAU + TAU / 16;
      addBox(g, Math.cos(am) * R, y1, Math.sin(am) * R, 0.07, 0.07, chord, WOOD_MID, -am, 0);
      addBox(g, Math.cos(am) * (R + 0.035), y1 + 0.035, Math.sin(am) * (R + 0.035), 0.02, 0.018, chord, BRASS, -am, 0);
    }

    // eave fascia, slightly proud of the glass
    const Re = 2.36;
    const chordE = 2 * Re * Math.sin(Math.PI / 8);
    for (let i = 0; i < 8; i++) {
      const am = (i / 8) * TAU + TAU / 16;
      addBox(g, Math.cos(am) * Re, 4.37, Math.sin(am) * Re, 0.12, 0.085, chordE, WOOD_DARK, -am, 0);
      addBox(g, Math.cos(am) * (Re + 0.035), 4.415, Math.sin(am) * (Re + 0.035), 0.022, 0.022, chordE, BRASS, -am, 0);
    }

    // roof surface: eight panels, with raised hips, grain and upturned tips
    const eaveR = 2.34, eaveY = 4.42, apexY = 4.98;
    const apex = [0, apexY, 0];
    const roofPoint = (a, t) => {
      const r = eaveR + (0.06 - eaveR) * t;
      const y = eaveY + (apexY - eaveY) * t;
      return [Math.cos(a) * r, y, Math.sin(a) * r];
    };
    const addRoofStrip = (a, w, t0, t1, col, lift) => {
      const p0 = roofPoint(a - w, t0);
      const p1 = roofPoint(a + w, t0);
      const p2 = roofPoint(a + w, t1);
      const p3 = roofPoint(a - w, t1);
      let n = v3.norm(v3.cross(v3.sub(p1, p0), v3.sub(p3, p0)));
      if (n[1] < 0) n = [-n[0], -n[1], -n[2]];
      const o = [n[0] * lift, n[1] * lift, n[2] * lift];
      addQuad(g, v3.add(p0, o), v3.add(p1, o), v3.add(p2, o), v3.add(p3, o), col, n);
    };

    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * TAU, a1 = ((i + 1) / 8) * TAU;
      const p0 = [Math.cos(a0) * eaveR, eaveY, Math.sin(a0) * eaveR];
      const p1 = [Math.cos(a1) * eaveR, eaveY, Math.sin(a1) * eaveR];
      let n = v3.norm(v3.cross(v3.sub(p1, p0), v3.sub(apex, p0)));
      if (n[1] < 0) n = [-n[0], -n[1], -n[2]];
      pushTri(g, p0, p1, apex, n, i % 2 ? WOOD_MID : WOOD);
    }

    // raised hip ribs over the panel seams
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      addRoofStrip(a, 0.032, 0.015, 0.985, WOOD_DARK, 0.022);
    }
    // two fine grain lines on each panel
    for (let i = 0; i < 8; i++) {
      const am = (i / 8) * TAU + TAU / 16;
      addRoofStrip(am - 0.17, 0.012, 0.06, 0.9, WOOD_LIGHT, 0.012);
      addRoofStrip(am + 0.2, 0.009, 0.1, 0.86, shade(WOOD_DARK, 0.92), 0.012);
    }
    // upturned eave tips
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      addBox(g, Math.cos(a) * 2.42, 4.45, Math.sin(a) * 2.42, 0.09, 0.055, 0.09, WOOD_LIGHT, -a, 0.18);
    }

    // a small drum under the finial, with its own ribs and brass band
    addCylinder(g, [0, 4.98, 0], [0, 5.12, 0], 0.34, 0.3, 8, WOOD_MID, WOOD_LIGHT);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + TAU / 16;
      addBox(g, Math.cos(a) * 0.325, 5.05, Math.sin(a) * 0.325, 0.022, 0.1, 0.022, WOOD_LIGHT, 0, 0);
    }
    addCylinder(g, [0, 5.12, 0], [0, 5.14, 0], 0.37, 0.34, 8, BRASS, BRASS);
    addCylinder(g, [0, 5.14, 0], [0, 5.22, 0], 0.36, 0.14, 8, WOOD_DARK, WOOD_MID);

    // turned brass finial
    addCylinder(g, [0, 5.22, 0], [0, 5.3, 0], 0.035, 0.03, 8, BRASS, BRASS);
    addCylinder(g, [0, 5.3, 0], [0, 5.38, 0], 0.1, 0.12, 8, BRASS, BRASS);
    addCylinder(g, [0, 5.38, 0], [0, 5.48, 0], 0.045, 0.012, 8, BRASS, BRASS);

    return g;
  }

  function buildCaseGlass() {
    const g = Geo();
    const R = 2.1, y0 = 0.34, y1 = 4.28;
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * TAU, a1 = ((i + 1) / 8) * TAU;
      const am = (a0 + a1) / 2;
      const p0 = [Math.cos(a0) * R, y0, Math.sin(a0) * R];
      const p1 = [Math.cos(a1) * R, y0, Math.sin(a1) * R];
      const p2 = [Math.cos(a1) * R, y1, Math.sin(a1) * R];
      const p3 = [Math.cos(a0) * R, y1, Math.sin(a0) * R];
      addQuad(g, p0, p1, p2, p3, [1, 1, 1], [Math.cos(am), 0, Math.sin(am)]);
    }
    return { geo: g, alpha: 0.045 };
  }

  /* a little floating lantern, used a few times on the water */
  function buildSmallLanternFrame() {
    const g = Geo();
    addCylinder(g, [0, 0, 0], [0, 0.05, 0], 0.36, 0.33, 8, WOOD_DARK, WOOD_MID);
    addCylinder(g, [0, 0.05, 0], [0, 0.07, 0], 0.33, 0.32, 8, BRASS, BRASS);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      addBox(g, Math.cos(a) * 0.19, 0.22, Math.sin(a) * 0.19, 0.035, 0.32, 0.035, WOOD_DARK, 0, 0);
    }
    addCylinder(g, [0, 0.37, 0], [0, 0.41, 0], 0.31, 0.31, 8, WOOD_MID, WOOD_LIGHT);
    addCylinder(g, [0, 0.41, 0], [0, 0.48, 0], 0.33, 0.06, 8, WOOD_DARK, WOOD_LIGHT);
    addCylinder(g, [0, 0.48, 0], [0, 0.52, 0], 0.03, 0.012, 8, BRASS, BRASS);
    return g;
  }

  function buildSmallLanternPaper() {
    const g = Geo();
    addBox(g, 0, 0.225, 0, 0.3, 0.29, 0.3, [1, 0.93, 0.78]);
    return g;
  }

  /* seasonal water decorations */
  function buildLotusLeaf() {
    const g = Geo();
    const center = [0, 0.04, 0];
    const N = 20;
    const notch = 0.32;
    const cols = [hexToRgb('#7d9a68'), hexToRgb('#8aa974'), hexToRgb('#6f8b5c')];
    for (let i = 0; i < N; i++) {
      const a0 = notch + (i / N) * (TAU - notch * 2);
      const a1 = notch + ((i + 1) / N) * (TAU - notch * 2);
      const r0 = 0.95 + 0.05 * Math.sin(i * 2.1 + 0.3);
      const r1 = 0.95 + 0.05 * Math.sin((i + 1) * 2.1 + 0.3);
      const p0 = [Math.cos(a0) * r0, 0.012, Math.sin(a0) * r0];
      const p1 = [Math.cos(a1) * r1, 0.012, Math.sin(a1) * r1];
      pushTri(g, center, p0, p1, [0, 1, 0], cols[i % 3]);
    }
    for (let k = 0; k < 9; k++) {
      const a = notch + TAU / 19 + (k / 9) * (TAU - notch * 2 - TAU / 19);
      const r = 0.82;
      addBox(g, Math.cos(a) * r * 0.5, 0.024, Math.sin(a) * r * 0.5, 0.012, 0.004, r, hexToRgb('#5f7a4e'), Math.PI / 2 - a, 0);
    }
    return g;
  }

  function buildMapleLeafOld() {
    const g = Geo();
    const center = [0, 0.012, 0];
    const R = 0.46;
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU - Math.PI / 2;
      const r = i % 2 === 0 ? R * (0.92 + 0.1 * Math.sin(i * 2.3)) : R * 0.34;
      pts.push([Math.cos(a) * r, 0.01, Math.sin(a) * r]);
    }
    const cols = [hexToRgb('#b8793f'), hexToRgb('#a46435'), hexToRgb('#c68b4d')];
    for (let i = 0; i < 10; i++) {
      pushTri(g, center, pts[i], pts[(i + 1) % 10], [0, 1, 0], cols[i % 3]);
    }
    addBox(g, 0, 0.013, 0.36, 0.018, 0.006, 0.18, hexToRgb('#7f5a34'), 0, 0);
    return g;
  }

  function buildIcePatch() {
    const g = Geo();
    const center = [0, 0.018, 0];
    const bottom = [0, 0.002, 0];
    const N = 16;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU;
      const r = 0.55 + 0.09 * Math.sin(i * 1.6 + 0.5);
      pts.push([Math.cos(a) * r, 0.012, Math.sin(a) * r]);
    }
    const cols = [[0.82, 0.9, 0.92], [0.9, 0.95, 0.96]];
    for (let i = 0; i < N; i++) pushTri(g, center, pts[i], pts[(i + 1) % N], [0, 1, 0], cols[i % 2]);
    // thin slab sides and underside
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      const ti = pts[i];
      const tj = pts[j];
      const bi = [ti[0], 0.002, ti[2]];
      const bj = [tj[0], 0.002, tj[2]];
      pushTri(g, ti, tj, bj, [0, 0.4, 1], [0.72, 0.84, 0.9]);
      pushTri(g, ti, bj, bi, [0, 0.4, 1], [0.72, 0.84, 0.9]);
      pushTri(g, bottom, bi, bj, [0, -1, 0], [0.78, 0.88, 0.92]);
    }
    return g;
  }

  function buildFloatPetal(v = 0) {
    const g = Geo();
    const wf = 0.82 + 0.28 * v;
    const cols = [[1, 0.84, 0.88], [1, 0.9, 0.93], [0.98, 0.8, 0.86]];
    const N = 14;
    const top = [];
    const bot = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU;
      const x = Math.sin(a) * 0.12 * wf * (0.9 + 0.1 * Math.cos(2 * a));
      const z = -0.05 + Math.cos(a) * (0.19 + 0.03 * v);
      top.push([x, 0.008, z]);
      bot.push([x, -0.001, z]);
    }
    const cTop = [0, 0.018, 0];
    const cBot = [0, -0.001, 0];
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      pushTri(g, cTop, top[i], top[j], [0, 1, 0], cols[i % 3]);
      pushTri(g, cBot, bot[j], bot[i], [0, -1, 0], [0.7, 0.54, 0.6]);
      pushTri(g, top[i], top[j], bot[j], [0, 0.3, 1], [0.86, 0.68, 0.74]);
      pushTri(g, top[i], bot[j], bot[i], [0, 0.3, 1], [0.86, 0.68, 0.74]);
    }
    return g;
  }

  function buildMapleLeaf(v = 0) {
    const g = Geo();
    const center = [0, 0.018, 0];
    const bottom = [0, -0.001, 0];
    const cols = [[0.72, 0.45, 0.22], [0.8, 0.52, 0.26], [0.64, 0.4, 0.2]];
    const order = [-Math.PI / 6, Math.PI / 6, Math.PI / 2, (5 * Math.PI) / 6, (7 * Math.PI) / 6];
    const top = [];
    const bot = [];
    for (let li = 0; li < 5; li++) {
      const a = order[li];
      const aPrev = order[(li + 4) % 5];
      const aNext = order[(li + 1) % 5];
      const aNotchL = (aPrev + a) / 2;
      const aNotchR = (a + aNext) / 2;
      const notch = 0.23 + 0.035 * v;
      const shoulder = 0.4 + 0.04 * v;
      const tip = 0.52 + 0.05 * v;
      top.push([Math.cos(aNotchL) * notch, 0.005, Math.sin(aNotchL) * notch]);
      top.push([Math.cos(a - 0.16) * shoulder, 0.007, Math.sin(a - 0.16) * shoulder]);
      top.push([Math.cos(a) * tip, 0.01, Math.sin(a) * tip]);
      top.push([Math.cos(a + 0.16) * shoulder, 0.007, Math.sin(a + 0.16) * shoulder]);
    }
    for (let i = 0; i < top.length; i++) bot.push([top[i][0], top[i][1] - 0.006, top[i][2]]);
    for (let i = 0; i < top.length; i++) {
      const j = (i + 1) % top.length;
      pushTri(g, center, top[i], top[j], [0, 1, 0], cols[i % 3]);
      pushTri(g, bottom, bot[j], bot[i], [0, -1, 0], [0.48, 0.3, 0.17]);
      pushTri(g, top[i], top[j], bot[j], [0, 0.3, 1], [0.58, 0.36, 0.2]);
      pushTri(g, top[i], bot[j], bot[i], [0, 0.3, 1], [0.58, 0.36, 0.2]);
    }
    for (let k = 0; k < 5; k++) {
      const a = order[k];
      pushTri(g, center, [Math.cos(a - 0.13) * 0.36, 0.018, Math.sin(a - 0.13) * 0.36], [Math.cos(a) * 0.46, 0.018, Math.sin(a) * 0.46], [0, 1, 0], [0.52, 0.32, 0.17]);
      pushTri(g, center, [Math.cos(a) * 0.46, 0.018, Math.sin(a) * 0.46], [Math.cos(a + 0.13) * 0.36, 0.018, Math.sin(a + 0.13) * 0.36], [0, 1, 0], [0.52, 0.32, 0.17]);
    }
    addBox(g, 0, 0.006, -0.3, 0.018, 0.008, 0.2, hexToRgb('#6e4a2c'), 0, 0);
    return g;
  }

  function buildFloatLeaf() {
    const g = Geo();
    const N = 10;
    const cols = [[0.72, 0.5, 0.28], [0.8, 0.56, 0.32], [0.65, 0.44, 0.24]];
    const center = [0, 0.024, 0];
    const pts = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU;
      const r = 0.24 * (0.7 + 0.3 * Math.cos(a - 0.4));
      pts.push([Math.cos(a) * r, 0.004, Math.sin(a) * r]);
    }
    for (let i = 0; i < N; i++) pushTri(g, center, pts[i], pts[(i + 1) % N], [0, 1, 0], cols[i % 3]);
    addBox(g, 0, 0.005, -0.2, 0.015, 0.006, 0.12, hexToRgb('#6e4a2c'), 0, 0);
    return g;
  }

  function buildBlossom() {
    const g = Geo();
    const cols = [[1, 0.83, 0.88], [1, 0.9, 0.93], [1, 0.78, 0.84]];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      const cx = Math.cos(a) * 0.26;
      const cz = Math.sin(a) * 0.26;
      const pts = [];
      for (let k = 0; k < 8; k++) {
        const b = (k / 8) * TAU;
        const lx = Math.cos(b) * 0.24;
        const lz = Math.sin(b) * 0.13;
        pts.push([
          cx + Math.cos(a) * lx - Math.sin(a) * lz,
          0.007,
          cz + Math.sin(a) * lx + Math.cos(a) * lz,
        ]);
      }
      const pc = [cx, 0.032, cz];
      for (let k = 0; k < 8; k++) pushTri(g, pc, pts[k], pts[(k + 1) % 8], [0, 1, 0], cols[i % 3]);
    }
    addCylinder(g, [0, 0.02, 0], [0, 0.036, 0], 0.07, 0.05, 8, [0.95, 0.78, 0.4], [0.9, 0.7, 0.35]);
    return g;
  }

  /* one petal, base at origin, pointing +Y, with a soft cup */
  function buildPetalGeo() {
    const g = Geo();
    const rows = 7, cols = 3;
    const grid = [];
    for (let i = 0; i <= rows; i++) {
      const v = i / rows;
      const shape = Math.pow(Math.sin(Math.PI * Math.pow(v, 0.82)), 0.5);
      const halfW = 0.5 * shape;
      const row = [];
      for (let j = 0; j <= cols; j++) {
        const u = (j / cols) * 2 - 1;
        const x = halfW * u;
        const y = v;
        const z = 0.14 * Math.sin(Math.PI * v) - 0.09 * u * u;
        const tone = 0.88 + 0.16 * Math.pow(v, 0.8) + 0.03 * (1 - Math.abs(u));
        row.push({ p: [x, y, z], c: [tone, tone, tone] });
      }
      grid.push(row);
    }
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const A = grid[i][j], B = grid[i][j + 1], C = grid[i + 1][j + 1], D = grid[i + 1][j];
        const e1 = v3.sub(B.p, A.p), e2 = v3.sub(C.p, A.p);
        let n = v3.norm(v3.cross(e1, e2));
        if (n[2] < 0) n = [-n[0], -n[1], -n[2]];
        pushTriColored(g, A, B, C, n, A.c, B.c, C.c);
        pushTriColored(g, A, C, D, n, A.c, C.c, D.c);
      }
    }
    return g;
  }

  function pushTriColored(g, A, B, C, n, ca, cb, cc) {
    g.pos.push(A.p[0], A.p[1], A.p[2], B.p[0], B.p[1], B.p[2], C.p[0], C.p[1], C.p[2]);
    g.nrm.push(n[0], n[1], n[2], n[0], n[1], n[2], n[0], n[1], n[2]);
    g.col.push(ca[0], ca[1], ca[2], cb[0], cb[1], cb[2], cc[0], cc[1], cc[2]);
  }

  function buildFlowerCore() {
    const g = Geo();
    const gold = hexToRgb('#e0b25f');
    const goldDark = hexToRgb('#b9863b');
    addCylinder(g, [0, -0.03, 0], [0, 0.05, 0], 0.46, 0.4, 24, gold, gold);
    addCylinder(g, [0, 0.05, 0], [0, 0.08, 0], 0.4, 0.34, 24, goldDark, gold);
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * TAU;
      const r = 0.24 + (i % 3) * 0.06;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      addCylinder(g, [x, 0.04, z], [x * 1.18, 0.18 + (i % 2) * 0.04, z * 1.18], 0.014, 0.012, 4, goldDark, gold);
      addBox(g, x * 1.18, 0.2 + (i % 2) * 0.04, z * 1.18, 0.045, 0.045, 0.045, gold, 0, 0);
    }
    return g;
  }

  function buildTree(tips, branches) {
    const g = Geo();
    // roots
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + 0.4;
      addCylinder(g, [0, 1.2, 0], [Math.sin(a) * 0.46, 1.08, Math.cos(a) * 0.46], 0.08, 0.15, 7, WOOD_DARK, WOOD);
    }
    // trunk, gently curving
    addCylinder(g, [0, 1.08, 0], [0.03, 2.05, 0.02], 0.29, 0.21, 12, WOOD, shade(WOOD, 1.06));
    addCylinder(g, [0.03, 2.03, 0.02], [-0.02, 2.8, 0.0], 0.21, 0.145, 12, WOOD, WOOD);
    addCylinder(g, [-0.02, 2.78, 0], [0.04, 3.42, 0.02], 0.145, 0.08, 9, WOOD, shade(WOOD, 1.04));

    // recursive branches
    const rand = rng(20260321);
    function grow(p, dir, len, rad, depth) {
      const mid = [
        p[0] + dir[0] * len * 0.55 + (rand() - 0.5) * 0.05,
        p[1] + dir[1] * len * 0.55,
        p[2] + dir[2] * len * 0.55 + (rand() - 0.5) * 0.05,
      ];
      const end = [p[0] + dir[0] * len, p[1] + dir[1] * len, p[2] + dir[2] * len];
      addCylinder(g, p, mid, rad, rad * 0.74, 6, WOOD, WOOD);
      addCylinder(g, mid, end, rad * 0.74, rad * 0.44, 6, WOOD, WOOD);
      if (depth <= 0) {
        tips.push({ p: end, d: dir });
        return;
      }
      for (let i = 0; i < 2; i++) {
        const ang = 0.5 + rand() * 0.42;
        const phi = rand() * TAU;
        const up = Math.abs(dir[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
        const u = v3.norm(v3.cross(dir, up));
        const w = v3.cross(dir, u);
        const perp = [u[0] * Math.cos(phi) + w[0] * Math.sin(phi), u[1] * Math.cos(phi) + w[1] * Math.sin(phi), u[2] * Math.cos(phi) + w[2] * Math.sin(phi)];
        const nd = v3.norm([
          dir[0] * Math.cos(ang) + perp[0] * Math.sin(ang),
          dir[1] * Math.cos(ang) + perp[1] * Math.sin(ang) + 0.16,
          dir[2] * Math.cos(ang) + perp[2] * Math.sin(ang),
        ]);
        grow(mid, nd, len * (0.62 + rand() * 0.14), rad * 0.63, depth - 1);
      }
    }

    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + 0.7;
      const p = [0, 2.3 + (i % 3) * 0.22, 0];
      const dir = v3.norm([Math.sin(a) * 0.62, 0.86, Math.cos(a) * 0.62]);
      grow(p, dir, 0.58 + (i % 2) * 0.06, 0.07, 2);
    }
    grow([0.04, 3.36, 0.02], [0.02, 1, 0.04], 0.5, 0.06, 1);

    branches.forEach((b) => addCylinder(g, b[0], b[1], b[2], b[3], 6, WOOD, WOOD));
    return g;
  }

  function buildLeafData(tips) {
    const rand = rng(88123);
    const leaves = [];
    const leafCount = 820;
    for (let i = 0; i < leafCount; i++) {
      const tip = tips[Math.floor(rand() * tips.length)] || { p: [0, 3.9, 0] };
      const useTip = rand() < 0.54;
      let base;
      if (useTip) {
        base = tip.p;
      } else {
        // fill the crown with a soft ellipsoid
        const theta = rand() * TAU;
        const rr = Math.sqrt(rand()) * 1.5;
        base = [0, 3.95, 0];
        const x = Math.cos(theta) * rr;
        const z = Math.sin(theta) * rr * 0.88;
        const y = (rand() - 0.5) * 2.0;
        leaves.push({
          x, y: base[1] + y, z,
          sx: 0.042 + rand() * 0.045,
          rotX: rand() * Math.PI,
          rotY: rand() * Math.PI * 2,
          colorIdx: Math.floor(rand() * 5),
          phase: rand() * TAU,
          spin: (rand() - 0.5) * 0.5,
          tint: 0.9 + rand() * 0.18,
          winter: rand() < 0.09 ? 0.55 + rand() * 0.25 : 0.03 + rand() * 0.08,
        });
        continue;
      }
      const theta = rand() * TAU;
      const rr = 0.12 + rand() * 0.3;
      const x = base[0] + Math.cos(theta) * rr;
      const z = base[2] + Math.sin(theta) * rr * 0.92;
      const y = base[1] + (rand() - 0.4) * 0.3;
      leaves.push({
        x, y, z,
        sx: 0.045 + rand() * 0.05,
        rotX: rand() * Math.PI,
        rotY: rand() * Math.PI * 2,
        colorIdx: Math.floor(rand() * 5),
        phase: rand() * TAU,
        spin: (rand() - 0.5) * 0.5,
        tint: 0.9 + rand() * 0.18,
        winter: rand() < 0.09 ? 0.55 + rand() * 0.25 : 0.03 + rand() * 0.08,
      });
    }

    // petals that already fell on the vitrine floor
    for (let i = 0; i < 18; i++) {
      const a = rand() * TAU;
      const r = 0.3 + rand() * 1.25;
      leaves.push({
        x: Math.cos(a) * r,
        y: 1.1,
        z: Math.sin(a) * r,
        sx: 0.04 + rand() * 0.035,
        rotX: Math.PI / 2 + (rand() - 0.5) * 0.25,
        rotY: rand() * TAU,
        colorIdx: Math.floor(rand() * 5),
        phase: rand() * TAU,
        spin: 0,
        tint: 1,
        winter: 0.12,
        fallen: true,
      });
    }
    return leaves;
  }

  function buildSnowData(tips) {
    const rand = rng(4512);
    const out = [];
    for (let i = 0; i < 42; i++) {
      const tip = tips[Math.floor(rand() * tips.length)] || { p: [0, 4, 0] };
      out.push({
        x: tip.p[0] + (rand() - 0.5) * 0.22,
        y: tip.p[1] + 0.05 + rand() * 0.1,
        z: tip.p[2] + (rand() - 0.5) * 0.22,
        s: 0.055 + rand() * 0.07,
        phase: rand() * TAU,
      });
    }
    return out;
  }

  function buildParticles() {    const rand = rng(7717);
    const out = [];
    for (let i = 0; i < 40; i++) {
      out.push({
        x: (rand() - 0.5) * 7.6,
        y: rand() * 7.2 + 0.6,
        z: (rand() - 0.5) * 6.2,
        s: 0.032 + rand() * 0.05,
        v: 0.16 + rand() * 0.3,
        phase: rand() * TAU,
        drift: 0.4 + rand() * 0.8,
        spin: (rand() - 0.5) * 1.6,
      });
    }
    return out;
  }

  function buildStem() {
    const g = Geo();
    const stemCol = hexToRgb('#78854e');
    addCylinder(g, [0, 0, 0], [0, 1, 0], 0.07, 0.045, 8, stemCol, shade(stemCol, 1.12));
    return g;
  }

  /* ───────────────────────── world ───────────────────────── */
  function createWorld(renderer) {
    const gl = renderer.gl;

    const raftMesh = renderer.makeMesh(buildRaft());
    const coverMesh = renderer.makeMesh(buildCover());
    const glassFace = buildCaseGlass();
    const glassMesh = renderer.makeMesh(glassFace.geo);
    const glassAlpha = glassFace.alpha;
    const smallFrameMesh = renderer.makeMesh(buildSmallLanternFrame());
    const smallPaperMesh = renderer.makeMesh(buildSmallLanternPaper());
    const smalls = [
      { xf: -1.15, zf: 0.55, s: 1.3, phase: 0.7, rot: 0.4 },
      { xf: 1.15, zf: 0.45, s: 0.8, phase: 2.4, rot: 1.2 },
      { xf: 0.0, zf: 1.2, s: 1.0, phase: 4.1, rot: 2.6 },
    ];
    const lotusLeafMesh = renderer.makeMesh(buildLotusLeaf());
    const mapleMeshes = [renderer.makeMesh(buildMapleLeaf(0)), renderer.makeMesh(buildMapleLeaf(1))];
    const iceMesh = renderer.makeMesh(buildIcePatch());
    const floatPetalMeshes = [renderer.makeMesh(buildFloatPetal(0)), renderer.makeMesh(buildFloatPetal(1))];
    const floatLeafMesh = renderer.makeMesh(buildFloatLeaf());
    const blossomMesh = renderer.makeMesh(buildBlossom());
    const fallers = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + 0.3;
      const r = 6.8 + (i % 3) * 0.25;
      fallers.push({
        kind: 0,
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        phase: i * 0.157,
        speed: 0.05 + 0.01 * (i % 3),
        size: 0.48 + 0.09 * (i % 3),
        rot: i * 0.9,
        tint: [[1, 0.86, 0.9], [1, 0.92, 0.94], [1, 0.8, 0.86]][i % 3],
        v: i % 2,
      });
    }
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + 0.8;
      const r = 6.8 + (i % 3) * 0.25;
      fallers.push({
        kind: 1,
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        phase: i * 0.173,
        speed: 0.045 + 0.01 * (i % 3),
        size: 0.52 + 0.09 * (i % 3),
        rot: i * 1.1,
        tint: [[1, 0.8, 0.62], [1, 0.72, 0.54], [1, 0.9, 0.74]][i % 3],
        v: i % 2,
      });
    }
    const decos = {
      spring: [
        { t: 'float', x: -4.8, z: 0.0, rot: 0.4, s: 0.8, tint: [1, 0.86, 0.9] },
        { t: 'float', x: 4.8, z: 0.0, rot: 2.0, s: 0.9, tint: [1, 0.92, 0.94] },
        { t: 'float', x: -4.4, z: -2.4, rot: 4.2, s: 0.7, tint: [1, 0.8, 0.86] },
        { t: 'float', x: 4.4, z: -2.4, rot: 1.3, s: 0.85, tint: [1, 0.9, 0.92] },
        { t: 'float', x: -1.2, z: 4.2, rot: 5.1, s: 0.75, tint: [1, 0.84, 0.88] },
        { t: 'float', x: 1.4, z: 4.2, rot: 3.3, s: 0.8, tint: [1, 0.88, 0.9] },
      ],
      summer: [
        { t: 'leaf', x: -4.8, z: 0.0, rot: 0.2, s: 1.3 },
        { t: 'leaf', x: 4.8, z: 0.0, rot: 1.8, s: 1.15 },
        { t: 'leaf', x: -4.4, z: -2.4, rot: 3.2, s: 1.0 },
        { t: 'flower', x: 4.4, z: -2.4, rot: 1.0, s: 1.25 },
      ],
      autumn: [
        { t: 'maple', x: -4.8, z: 0.0, rot: 0.3, s: 1.15, tint: [1, 0.8, 0.62] },
        { t: 'maple', x: 4.8, z: 0.0, rot: 2.1, s: 1.0, tint: [1, 0.72, 0.54] },
        { t: 'maple', x: -4.4, z: -2.4, rot: 4.0, s: 1.1, tint: [1, 0.9, 0.74] },
        { t: 'maple', x: 4.4, z: -2.4, rot: 1.2, s: 0.95, tint: [1, 0.84, 0.66] },
      ],
      winter: [
        { t: 'ice', x: -4.8, z: 0.0, rot: 0.4, s: 1.3 },
        { t: 'ice', x: 4.8, z: 0.0, rot: 1.6, s: 1.1 },
        { t: 'ice', x: -4.4, z: -2.4, rot: 3.0, s: 1.2 },
      ],
    };

    // tree (branch tips first)
    const tips = [];
    const treeGeo = buildTree(tips, []);
    const treeMesh = renderer.makeMesh(treeGeo);
    const stemMesh = renderer.makeMesh(buildStem());
    const petalMesh = renderer.makeMesh(buildPetalGeo());
    const flowerCoreMesh = renderer.makeMesh(buildFlowerCore());
    const leaves = buildLeafData(tips);
    const snow = buildSnowData(tips);
    const particles = buildParticles();

    const leafInst = renderer.makeInstanced(leaves.length + snow.length);
    const particleInst = renderer.makeInstanced(particles.length);

    // glyphs
    const glyphs = {};
    PALETTES.forEach((p) => {
      glyphs[p.key] = {
        tex: renderer.makeTexture(makeGlyphTexture(p.glyph), { mipmap: true }),
        shadow: renderer.makeTexture(makeGlyphShadow(p.glyph), { mipmap: true }),
      };
    });
    glyphs.bloom = {
      tex: renderer.makeTexture(makeGlyphTexture('花'), { mipmap: true }),
      shadow: renderer.makeTexture(makeGlyphShadow('花'), { mipmap: true }),
    };

    const tex = {
      glow: renderer.makeTexture(makeGlowTexture()),
      shadow: renderer.makeTexture(makeShadowTexture()),
      dot: renderer.makeTexture(makeDotTexture(), { mipmap: true }),
    };

    // scratch
    const matA = m4.create();
    const matB = m4.create();
    const matC = m4.create();
    const matD = m4.create();
    const ident = m4.create();

    const textModel = m4.create();
    const shadowModel = m4.create();
    const groupModel = m4.create();
    const treeModel = m4.create();
    const coverModel = m4.create();
    const reflGroup = m4.create();
    const reflTree = m4.create();
    const reflCover = m4.create();
    const waterModel = m4.create();
    const contactModel = m4.create();
    const mirror = m4.create();
    mirror[5] = -1;

    // 3D flowers: three rings of curved petals
    const petals = [];
    for (let i = 0; i < 12; i++) {
      petals.push({ a: (i / 12) * TAU + 0.13, tilt: 1.04, len: 1.9, halfW: 0.46, delay: 0, layer: 0 });
    }
    for (let i = 0; i < 9; i++) {
      petals.push({ a: (i / 9) * TAU + 0.45, tilt: 0.8, len: 1.3, halfW: 0.4, delay: 0.06, layer: 1 });
    }
    for (let i = 0; i < 6; i++) {
      petals.push({ a: (i / 6) * TAU + 0.78, tilt: 0.54, len: 0.82, halfW: 0.32, delay: 0.12, layer: 2 });
    }

    // tiny drifting lights for the night scene
    const fireflies = [];
    {
      const fr = rng(6602);
      for (let i = 0; i < 26; i++) {
        fireflies.push({
          x: (fr() - 0.5) * 7.4,
          y: 0.9 + fr() * 5.1,
          z: (fr() - 0.5) * 6.2,
          s: 0.05 + fr() * 0.06,
          phase: fr() * TAU,
          sp: 0.25 + fr() * 0.5,
          warm: i % 4 !== 0,
        });
      }
    }

    // distant stars for the night sky
    const stars = [];
    {
      const sr = rng(1207);
      for (let i = 0; i < 52; i++) {
        stars.push({
          x: (sr() - 0.5) * 18,
          y: 1.2 + sr() * 9.2,
          s: 0.016 + sr() * 0.034,
          phase: sr() * TAU,
          warm: sr() < 0.22,
        });
      }
    }

    // glyph layout scales
    let layout = {
      halfHeight: 5.6,
      aspect: 1.6,
      text: { x: 4.3, y: 2.2, size: 4.2, depth: 9 },
    };

    function setLayout(halfHeight, aspect, textLayout) {
      layout.halfHeight = halfHeight;
      layout.aspect = aspect;
      if (textLayout) layout.text = textLayout;
    }

    /* palette by angle */
    function paletteAt(angle) {
      const f = angle / HALF_PI;
      const i = Math.floor(f);
      const w = smootherstep(0, 1, f - i);
      const a = mod(i, 4), b = mod(i + 1, 4);
      const pal = blendPalette(PALETTES[a], PALETTES[b], w);
      pal.seasonA = a;
      pal.seasonB = b;
      pal.seasonW = w;
      pal.floatIndex = f;
      return pal;
    }

    function seasonWeights(angle) {
      const f = angle / HALF_PI;
      const i = Math.floor(f);
      const w = smootherstep(0, 1, f - i);
      const a = mod(i, 4), b = mod(i + 1, 4);
      const out = [0, 0, 0, 0];
      out[a] += 1 - w;
      out[b] += w;
      return out;
    }

    /* leaf instances ------------------------------------------- */
    function updateLeaves(angle, bloom, time) {
      const f = angle / HALF_PI;
      const i = Math.floor(f);
      const w = smootherstep(0, 1, f - i);
      const a = mod(i, 4), b = mod(i + 1, 4);
      const scaleA = [1.0, 1.18, 1.06, 1.0];
      const scaleB = [1.0, 1.18, 1.06, 1.0];
      const winterA = a === 3 ? 1 - w : 0;
      const winterB = b === 3 ? w : 0;
      const winter = winterA + winterB;

      const data = leafInst.data;
      let n = 0;
      for (let k = 0; k < leaves.length; k++) {
        const L = leaves[k];
        const baseScale = L.sx * lerp(scaleA[a], scaleB[b], w);
        const leafScaleW = lerp(1, L.winter, winter);
        let scale = baseScale * leafScaleW;

        // bloom: leaves shrink toward the crown, staggered (fallen petals stay)
        if (!L.fallen) {
          const dist = Math.hypot(L.x, L.y - 3.9, L.z) / 2.1;
          const delay = clamp(dist * 0.5, 0, 0.55);
          const kk = clamp((bloom - delay) / (1 - delay), 0, 1);
          scale *= 1 - smoothstep(0, 1, kk);
        }

        if (scale < 0.0008) continue;

        const sway = 1 - bloom * 0.7;
        const ox = Math.sin(time * 0.7 + L.phase) * 0.015 * sway;
        const oy = Math.sin(time * 0.95 + L.phase * 1.7) * 0.01 * sway;
        const oz = Math.cos(time * 0.63 + L.phase) * 0.015 * sway;

        const colA = PALETTES[a].leaf[L.colorIdx];
        const colB = PALETTES[b].leaf[L.colorIdx];
        let cr = lerp(colA[0], colB[0], w) * L.tint;
        let cg = lerp(colA[1], colB[1], w) * L.tint;
        let cb = lerp(colA[2], colB[2], w) * L.tint;

        // winter: surviving leaves turn dry
        if (winter > 0.01 && L.winter > 0.3) {
          const dry = [0.6, 0.5, 0.4];
          cr = lerp(cr, dry[0], winter * 0.75);
          cg = lerp(cg, dry[1], winter * 0.75);
          cb = lerp(cb, dry[2], winter * 0.75);
        }

        data[n * 11] = L.x + ox;
        data[n * 11 + 1] = L.y + oy;
        data[n * 11 + 2] = L.z + oz;
        data[n * 11 + 3] = scale;
        data[n * 11 + 4] = scale * 0.34;
        data[n * 11 + 5] = scale * 0.82;
        data[n * 11 + 6] = L.rotX + Math.sin(time * 0.4 + L.phase) * 0.12 * sway;
        data[n * 11 + 7] = L.rotY + time * 0.02 * L.spin;
        data[n * 11 + 8] = cr;
        data[n * 11 + 9] = cg;
        data[n * 11 + 10] = cb;
        n++;
      }

      // snow clumps
      const snowScale = winter;
      if (snowScale > 0.02) {
        for (let k = 0; k < snow.length; k++) {
          const S = snow[k];
          const sc = S.s * smoothstep(0, 0.55, snowScale);
          if (sc < 0.0008) continue;
          data[n * 11] = S.x;
          data[n * 11 + 1] = S.y + Math.sin(time * 0.6 + S.phase) * 0.01;
          data[n * 11 + 2] = S.z;
          data[n * 11 + 3] = sc * 1.4;
          data[n * 11 + 4] = sc * 0.7;
          data[n * 11 + 5] = sc * 1.4;
          data[n * 11 + 6] = 0;
          data[n * 11 + 7] = S.phase;
          data[n * 11 + 8] = 1;
          data[n * 11 + 9] = 1;
          data[n * 11 + 10] = 0.99;
          n++;
        }
      }
      return n;
    }

    function updateParticles(dt, time, angle, bloom) {
      const w = seasonWeights(angle);
      const vis = [w[0] * 0.85 + w[1] * 0.4, w[1] * 0.55, w[2] * 1.0, w[3] * 1.0];
      const colors = [
        PALETTES[0].particle, PALETTES[1].particle, PALETTES[2].particle, PALETTES[3].particle,
      ];
      const data = particleInst.data;
      let n = 0;
      for (let k = 0; k < particles.length; k++) {
        const P = particles[k];
        P.y -= P.v * dt * (0.6 + vis[2] + vis[3]);
        if (P.y < 0.35) {
          P.y = 7.0 + Math.random() * 0.6;
          P.x = (Math.random() - 0.5) * 7.6;
          P.z = (Math.random() - 0.5) * 6.2;
        }
        const seasonMix = w;
        let cr = 0, cg = 0, cb = 0;
        for (let s = 0; s < 4; s++) {
          cr += colors[s][0] * seasonMix[s];
          cg += colors[s][1] * seasonMix[s];
          cb += colors[s][2] * seasonMix[s];
        }
        const a = Math.max(vis[0], Math.max(vis[1], Math.max(vis[2], vis[3]))) * 0.9;
        if (a < 0.02) continue;
        const x = P.x + Math.sin(time * 0.4 * P.drift + P.phase) * 0.22;
        const z = P.z + Math.cos(time * 0.32 * P.drift + P.phase) * 0.18;
        const sc = P.s * 1.0;
        data[n * 11] = x;
        data[n * 11 + 1] = P.y;
        data[n * 11 + 2] = z;
        data[n * 11 + 3] = sc * 1.5;
        data[n * 11 + 4] = sc * 0.24;
        data[n * 11 + 5] = sc * 0.9;
        data[n * 11 + 6] = time * P.spin + P.phase;
        data[n * 11 + 7] = time * P.spin * 0.7 + P.phase;
        data[n * 11 + 8] = cr;
        data[n * 11 + 9] = cg;
        data[n * 11 + 10] = cb;
        n++;
      }
      return n;
    }

    /* flower ---------------------------------------------------- */
    function drawFlower(bloom, pal, camera, time, night, baseModel, ghost) {
      if (bloom < 0.004) return;
      const open = smootherstep(0, 1, clamp(bloom, 0, 1));
      const fs = 0.86;
      const centerY = 2.9;
      const baseY = 0.32;
      const right = camera.right, up = camera.up, back = camera.back;
      const petalColors = [
        mixRgb(pal.petal, pal.accent, 0.22),
        mixRgb(pal.petal, pal.accent, 0.1),
        mixRgb(pal.petal, pal.accentDeep, 0.06),
      ];

      // a slender green flower stem rising from the raft (never the tree trunk)
      const stemH = (centerY - baseY) * (0.2 + 0.8 * smootherstep(0, 0.55, bloom));
      m4.compose(matA, 0.02, baseY, 0, 0, 0, 0.035, fs, stemH, fs);
      m4.multiply(matD, baseModel, matA);
      renderer.drawMesh(stemMesh, matD, {
        tint: [0.34, 0.46, 0.22], tintMix: 1, ghost,
        opacity: ghost ? 0.34 : 1, dim: ghost ? 0.8 : 1, wave: ghost ? 0.8 : 0,
      });

      // four leaves along the stem
      for (let li = 0; li < 4; li++) {
        const side = li % 2 === 0 ? -1 : 1;
        const s = (0.38 + 0.62 * open) * (li < 2 ? 1 : 0.82);
        m4.compose(matA, side * 0.1, 1.18 + li * 0.3, (li % 2 ? 0.04 : -0.04), side * (1.05 + li * 0.08), 1.02, 0, 0.36 * s * fs, 0.78 * s * fs, 1);
        m4.multiply(matD, baseModel, matA);
        renderer.drawMesh(petalMesh, matD, {
          tint: [0.4, 0.53, 0.27], tintMul: 1, ghost,
          opacity: ghost ? 0.34 : 1, dim: ghost ? 0.8 : 1, wave: ghost ? 0.8 : 0,
        });
      }

      // warm halo behind the bloom
      if (!ghost) {
        const cw = [0, centerY + 0.22, -0.4];
        m4.billboard(matD, right, up, back, cw, 0, 3.7 * open, 3.7 * open);
        renderer.drawSprite(tex.glow, matD, pal.petal, 0.14 * open + night * 0.16, 'add');
      }

      // petals
      for (let layer = 2; layer >= 0; layer--) {
        for (let i = 0; i < petals.length; i++) {
          const P = petals[i];
          if (P.layer !== layer) continue;
          const local = clamp((bloom - P.delay) / (1 - P.delay), 0, 1);
          if (local <= 0.002) continue;
          const k = smootherstep(0, 1, local);
          const len = P.len * fs * (0.18 + 0.82 * k);
          const halfW = P.halfW * fs * (0.45 + 0.55 * k);
          const tilt = P.tilt * (0.32 + 0.68 * k);
          m4.compose(matA, 0, centerY, 0, P.a, tilt, 0, halfW * 2, len, 1);
          m4.multiply(matD, baseModel, matA);
          renderer.drawMesh(petalMesh, matD, {
            tint: petalColors[layer],
            tintMul: 1,
            emissive: 0.3 - layer * 0.02 + night * 0.45,
            ghost,
            opacity: ghost ? 0.34 : 1,
            dim: ghost ? 0.8 : 1,
            wave: ghost ? 0.8 : 0,
          });
        }
      }

      // heart of the flower
      const coreScale = (0.58 + 0.47 * open) * fs;
      m4.compose(matA, 0, centerY + 0.06, 0, 0, 0, 0, coreScale, coreScale, coreScale);
      m4.multiply(matD, baseModel, matA);
      renderer.drawMesh(flowerCoreMesh, matD, {
        emissive: 0.16 + night * 0.32, ghost,
        opacity: ghost ? 0.34 : 1, dim: ghost ? 0.8 : 1, wave: ghost ? 0.8 : 0,
      });

      if (!ghost) {
        m4.billboard(matC, right, up, back, [0, centerY + 0.11, 0], 0, 1.1 * open, 1.1 * open);
        renderer.drawSprite(tex.glow, matC, pal.petalCenter, 0.18 + night * 0.5, 'add');
      }
    }

    function drawFireflies(camera, time, night) {
      if (night < 0.01) return;
      renderer.setDepth(false, true);
      for (let i = 0; i < fireflies.length; i++) {
        const F = fireflies[i];
        const x = F.x + Math.sin(time * 0.26 * F.sp + F.phase) * 0.38;
        const y = F.y + Math.sin(time * 0.38 * F.sp + F.phase * 1.7) * 0.24;
        const z = F.z + Math.cos(time * 0.21 * F.sp + F.phase) * 0.32;
        const twinkle = 0.5 + 0.5 * Math.sin(time * 1.5 + F.phase);
        const a = night * (0.26 + 0.3 * twinkle);
        const col = F.warm ? [1, 0.78, 0.42] : [0.68, 0.84, 1];
        m4.billboard(matD, camera.right, camera.up, camera.back, [x, y, z], 0, F.s * 2.4, F.s * 2.4);
        renderer.drawSprite(tex.glow, matD, col, a, 'add');
      }
      renderer.setDepth(true, true);
    }

    function drawNightSky(camera, time, night, pal) {
      if (night < 0.01) return;
      renderer.setDepth(false, false);
      const point = (x, y) => [
        camera.target[0] + camera.right[0] * x + camera.up[0] * y,
        camera.target[1] + camera.right[1] * x + camera.up[1] * y,
        camera.target[2] + camera.right[2] * x + camera.up[2] * y,
      ];

      // a breath of season colour in the sky
      const aurora = point(4.6, 6.0);
      m4.billboard(matD, camera.right, camera.up, camera.back, aurora, 0, 10, 7);
      renderer.drawSprite(tex.glow, matD, mixRgb(pal.accent, [0.35, 0.5, 0.8], 0.45), 0.05 * night, 'add');

      for (let i = 0; i < stars.length; i++) {
        const S = stars[i];
        const p = point(S.x, S.y);
        const tw = 0.5 + 0.5 * Math.sin(time * 0.8 + S.phase);
        const a = night * (0.12 + 0.3 * tw);
        const col = S.warm ? [1, 0.86, 0.62] : [0.72, 0.84, 1];
        m4.billboard(matD, camera.right, camera.up, camera.back, p, 0, S.s * 2.2, S.s * 2.2);
        renderer.drawSprite(tex.glow, matD, col, a, 'add');
      }
      renderer.setDepth(true, true);
    }

    /* main draw ------------------------------------------------ */
    function draw(state) {
      const { angle, pal, camera, time, dt, bloom, text, motion, floatY, rippleAge, waterTime } = state;
      const night = state.night || 0;
      const wt = waterTime == null ? time : waterTime;
      const coverAmt = smootherstep(0.04, 0.82, bloom);
      const lift = coverAmt * 13.5;
      const bgTop = mixRgb(pal.bgTop, [0.04, 0.06, 0.1], night);
      const bgMid = mixRgb(pal.bgMid, [0.065, 0.09, 0.14], night);
      const bgBottom = mixRgb(pal.bgBottom, [0.03, 0.045, 0.075], night);
      const bgGlow = mixRgb(pal.glow, [0.12, 0.1, 0.075], night);
      const fy = floatY == null ? 0.04 : floatY;

      renderer.state.time = wt;
      renderer.setLight({
        dir: v3.norm([-0.46, 0.82, 0.34]),
        color: mixRgb(pal.light, [1.0, 0.8, 0.52], night),
        ambient: mixRgb(pal.ambient, [0.18, 0.19, 0.24], night * 0.9),
        rimColor: mixRgb(pal.rim, [1.0, 0.88, 0.66], night),
        rim: 0.12 + 0.2 * night,
        fogColor: bgMid,
        fog: 0.02,
      });

      renderer.clear();
      renderer.drawBackground({
        top: bgTop, mid: bgMid, bottom: bgBottom,
        glow: bgGlow, glowPos: [0.54, 0.5],
      });
      drawNightSky(camera, wt, night, pal);

      // the lantern floats; the season arrival adds a small dip
      m4.compose(groupModel, 0, fy, 0, angle, 0, 0, 1, 1, 1);
      m4.multiply(reflGroup, mirror, groupModel);
      m4.compose(matA, 0, -0.78, 0, 0, 0, 0, 1, 1, 1);
      m4.multiply(treeModel, groupModel, matA);
      m4.multiply(reflTree, mirror, treeModel);
      m4.compose(matA, coverAmt * 0.55, lift, -coverAmt * 0.35, coverAmt * 0.24, 0, coverAmt * 0.1, 1, 1, 1);
      m4.multiply(coverModel, groupModel, matA);
      m4.multiply(reflCover, mirror, coverModel);

      const leafCount = updateLeaves(angle, bloom, time);
      const trunkTint = [
        lerp(pal.trunk[0], 0.35, bloom * 0.8),
        lerp(pal.trunk[1], 0.47, bloom * 0.8),
        lerp(pal.trunk[2], 0.24, bloom * 0.8),
      ];
      const ghost = { ghost: true, opacity: 0.34, dim: 0.62, wave: 1.0 };
      const treeFade = 1 - smootherstep(0.16, 0.55, bloom);
      const ghostTree = { ghost: true, opacity: 0.34 * treeFade, dim: 0.62, wave: 1.0, tint: trunkTint, tintMix: 0.5 };
      const ghostLeaf = { ghost: true, opacity: 0.34 * treeFade, dim: 0.62, wave: 1.0, emissive: night * 0.2 };

      // reflection of the floating lantern, before the water surface
      renderer.drawMesh(raftMesh, reflGroup, ghost);
      if (treeFade > 0.01) {
        renderer.drawMesh(treeMesh, reflTree, ghostTree);
        renderer.drawInstances(leafInst, leafCount, reflTree, ghostLeaf);
      }
      drawFlower(bloom, pal, camera, time, night, reflGroup, true);
      renderer.drawMesh(coverMesh, reflCover, ghost);
      renderer.drawGlass(glassMesh, reflCover, pal.glass, glassAlpha * 0.5 * (1 - coverAmt * 0.94));

      if (night > 0.02) {
        renderer.setDepth(false, false);
        m4.billboard(matD, camera.right, camera.up, camera.back, [0, -1.0, 0], 0, 4.8, 6.4);
        renderer.drawSprite(tex.glow, matD, [1, 0.72, 0.4], 0.34 * night, 'add');
      }

      // a few small lanterns on the water, each with a soft reflection
      const spread = clamp(layout.aspect * 2.2 + 1.9, 2.8, 5.4);
      const smallPos = (S) => {
        const sx = spread * S.xf + Math.sin(wt * 0.12 + S.phase) * 0.1;
        const sz = spread * S.zf + Math.cos(wt * 0.1 + S.phase) * 0.08;
        const bob = 0.016 + 0.014 * Math.sin(wt * 0.8 + S.phase);
        const sc = S.s * (1.0 + 0.035 * Math.sin(wt * 0.55 + S.phase));
        return [sx, sz, bob, sc];
      };
      for (let si = 0; si < smalls.length; si++) {
        const S = smalls[si];
        const [sx, sz, bob, sc] = smallPos(S);
        m4.compose(matA, sx, bob, sz, S.rot + wt * 0.02, 0.03 * Math.sin(wt * 0.6 + S.phase), 0.03 * Math.cos(wt * 0.5 + S.phase), sc, sc, sc);
        m4.multiply(matD, mirror, matA);
        renderer.drawMesh(smallFrameMesh, matD, { ghost: true, opacity: 0.2, dim: 0.6, wave: 1 });
        renderer.drawMesh(smallPaperMesh, matD, { ghost: true, opacity: 0.2, dim: 0.6, wave: 1, emissive: 0.03 + night * 0.4 });
        if (night > 0.02) {
          m4.billboard(matD, camera.right, camera.up, camera.back, [sx, -bob - 0.2 * sc, sz], 0, 1.0 * sc, 1.0 * sc);
          renderer.drawSprite(tex.glow, matD, [1, 0.72, 0.4], 0.13 * night, 'add');
        }
      }

      // ── seasonal water decorations ───────────────────────────
      const seasonKeys = ['spring', 'summer', 'autumn', 'winter'];
      const slot = ((angle / (TAU / 4)) % 4 + 4) % 4;
      const i0 = Math.floor(slot) % 4;
      const f = slot - Math.floor(slot);
      const i1 = (i0 + 1) % 4;
      const decoSpread = clamp(layout.aspect * 1.8 + 1.7, 3.6, 4.0);
      const dxs = decoSpread / 4.0;
      const narrow = layout.aspect < 0.7;
      const summerPal = PALETTES[1];
      const flowerTint = [1, 0.68, 0.76];
      const wSummer = i0 === 1 ? 1 - f : (i1 === 1 ? f : 0);
      const wSpring = i0 === 0 ? 1 - f : (i1 === 0 ? f : 0);
      const wAutumn = i0 === 2 ? 1 - f : (i1 === 2 ? f : 0);

      const drawLotusFlower = (d, w, refl) => {
        const x = d.x * dxs;
        const z = d.z * dxs;
        const ease = w * w * (3 - 2 * w);
        const sc = d.s * (0.9 + 0.12 * dxs) * (0.7 + 0.3 * ease);
        const bob = 0.018 * Math.sin(wt * 0.8 + d.x);
        const sway = 0.055 * Math.sin(wt * 0.45 + d.z);
        const tiltX = 0.025 * Math.sin(wt * 0.38 + d.x);
        const tiltZ = 0.032 * Math.cos(wt * 0.33 + d.z);
        m4.compose(matA, x, 0.02 + bob, z, d.rot + sway, tiltX, tiltZ, sc, sc, sc);
        if (refl) m4.multiply(matD, mirror, matA);
        const base = refl ? matD : matA;
        const op = refl ? w * 0.18 : w * 0.92;
        const ghost = refl;
        const wave = refl ? 0.6 : 0;
        // stem
        m4.compose(matB, 0, 0, 0, 0, 0, 0, 0.5, 0.62, 0.5);
        m4.multiply(matC, base, matB);
        renderer.drawMesh(stemMesh, matC, { tint: [0.32, 0.46, 0.22], tintMix: 1, opacity: op, ghost, wave });
        // two rings of petals
        for (let ri = 0; ri < 2; ri++) {
          const n = ri ? 4 : 5;
          for (let pi = 0; pi < n; pi++) {
            const a = (pi / n) * TAU + (ri ? 0.5 : 0);
            const tilt = ri ? 0.55 : 1.02;
            m4.compose(matB, 0, 0.62, 0, a, tilt, 0, 0.3, 0.5, 0.3);
            m4.multiply(matC, base, matB);
            renderer.drawMesh(petalMesh, matC, {
              tint: flowerTint, tintMix: 1, opacity: op, ghost, wave,
              emissive: 0.04,
            });
          }
        }
        // heart
        m4.compose(matB, 0, 0.66, 0, 0, 0, 0, 0.18, 0.18, 0.18);
        m4.multiply(matC, base, matB);
        renderer.drawMesh(flowerCoreMesh, matC, { opacity: op, ghost, wave, emissive: 0.08 });
      };

      const drawFlatDecos = (key, w) => {
        if (w < 0.01) return;
        const list = decos[key];
        if (!list) return;
        for (let di = 0; di < list.length; di++) {
          if (narrow && di >= 3) break;
          const d = list[di];
          if (d.t === 'flower') continue;
          const x = d.x * dxs + Math.sin(wt * 0.1 + di) * 0.08;
          const z = d.z * dxs + Math.cos(wt * 0.08 + di) * 0.06;
          const ease = w * w * (3 - 2 * w);
          const sc = d.s * (0.9 + 0.12 * dxs) * (0.7 + 0.3 * ease);
          const y = 0.035;
          const bob = 0.018 * Math.sin(wt * 0.9 + di * 1.7);
          const sway = 0.12 * Math.sin(wt * 0.32 + di * 1.9);
          const pitch = 0.035 * Math.sin(wt * 0.55 + di * 1.3);
          const roll = 0.045 * Math.cos(wt * 0.43 + di * 1.1);
          m4.compose(matA, x, y + bob, z, d.rot + sway, pitch, roll, sc, sc, sc);
          renderer.setDepth(false, true);
          m4.billboard(matD, camera.right, camera.up, camera.back, [x, 0.006, z], 0, sc * 1.5, sc * 1.5);
          renderer.drawSprite(tex.shadow, matD, [0.1, 0.1, 0.08], 0.085 * w, 'normal');
          renderer.setDepth(true, true);
          let mesh = iceMesh;
          let tint = [0.8, 0.9, 0.96];
          let mix = 0.35;
          let op = w * 0.5 * ease;
          if (d.t === 'blossom') {
            mesh = blossomMesh; tint = d.tint; mix = 1; op = w * 0.95 * ease;
          } else if (d.t === 'float') {
            mesh = floatPetalMeshes[di % 2]; tint = d.tint; mix = 1; op = w * 0.92 * ease;
          } else if (d.t === 'leaf2') {
            mesh = floatLeafMesh; tint = d.tint; mix = 0.45; op = w * 0.94 * ease;
          } else if (d.t === 'leaf') {
            mesh = lotusLeafMesh; op = w * 0.94 * ease;
          } else if (d.t === 'maple') {
            mesh = mapleMeshes[di % 2]; tint = d.tint; mix = 0.5; op = w * 0.94 * ease;
          }
          renderer.drawMesh(mesh, matA, { tint, tintMix: mix, opacity: op });
        }
      };

      if (wSummer > 0.01) {
        const flower = decos.summer.find((x) => x.t === 'flower');
        if (flower) drawLotusFlower(flower, wSummer, true);
      }

      // water surface
      m4.compose(waterModel, 0, 0, 0, 0, -Math.PI / 2, 0, 190, 190, 1);
      const wShallow = mixRgb(mixRgb([0.66, 0.77, 0.74], [0.07, 0.13, 0.15], night), pal.accent, 0.05);
      const wDeep = mixRgb(mixRgb([0.38, 0.54, 0.55], [0.018, 0.05, 0.075], night), pal.accentDeep, 0.04);
      // small landing ripples for falling petals / maple leaves
      const landRipples = new Float32Array(12);
      {
        const list = [];
        for (let fi = 0; fi < fallers.length; fi++) {
          const f = fallers[fi];
          const w = f.kind === 0 ? wSpring : wAutumn;
          if (w < 0.05) continue;
          const cyc = (wt * f.speed + f.phase) % 1;
          const age = cyc / f.speed;
          if (age > 2.2) continue;
          const landT = wt - age;
          list.push({
            x: f.x + Math.sin(landT * 0.85 + f.phase * 6.28) * (0.55 + 0.2 * Math.sin(landT * 0.4 + f.phase * 9)),
            z: f.z + Math.cos(landT * 0.65 + f.phase * 6.28) * 0.5,
            age,
            w,
          });
        }
        list.sort((a, b) => a.age - b.age);
        for (let i = 0; i < 3 && i < list.length; i++) {
          landRipples[i * 4] = list[i].x;
          landRipples[i * 4 + 1] = list[i].z;
          landRipples[i * 4 + 2] = list[i].age;
          landRipples[i * 4 + 3] = list[i].w;
        }
      }

      renderer.drawWater(waterModel, {
        deep: wDeep,
        shallow: wShallow,
        sky: bgBottom,
        light: mixRgb([1, 0.96, 0.86], [1, 0.78, 0.45], night),
        rippleCenter: [0, 0],
        rippleAge: rippleAge == null ? -1 : rippleAge,
        rippleStrength: 1,
        landRipples,
      });

      // contact shadow on the water
      renderer.setDepth(false, true);
      m4.basis(contactModel, [5.0, 0, 0], [0, 0, -5.0], [0, 1, 0], [0, 0.016, 0]);
      renderer.drawSprite(tex.shadow, contactModel, [0.08, 0.09, 0.08], 0.22, 'normal');
      renderer.setDepth(true, true);

      // seasonal floating decorations, on the water surface
      drawFlatDecos(seasonKeys[i0], 1 - f);
      drawFlatDecos(seasonKeys[i1], f);
      if (wSummer > 0.01) {
        const flower = decos.summer.find((x) => x.t === 'flower');
        if (flower) drawLotusFlower(flower, wSummer, false);
      }

      // falling petals (spring) / maple leaves (autumn)
      const drawFallers = (kind, weight) => {
        if (weight < 0.02) return;
        for (let fi = 0; fi < fallers.length; fi++) {
          const f = fallers[fi];
          if (f.kind !== kind) continue;
          const cyc = (wt * f.speed + f.phase) % 1;
          const y = 8.2 * (1 - Math.pow(cyc, 1.12)) + 0.2;
          const swing = Math.sin(wt * 0.85 + f.phase * 6.28);
          const x = f.x + swing * (0.55 + 0.2 * Math.sin(wt * 0.4 + f.phase * 9));
          const z = f.z + Math.cos(wt * 0.65 + f.phase * 6.28) * 0.5;
          const flap = Math.sin(wt * 1.75 + f.phase * 6.28) * 1.05;
          const roll = Math.cos(wt * 1.25 + f.phase * 6.28) * 0.8;
          m4.compose(matA, x, y, z, f.rot + wt * 0.45, flap, roll, f.size, f.size, f.size);
          renderer.drawMesh(kind === 0 ? floatPetalMeshes[f.v] : mapleMeshes[f.v], matA, {
            tint: f.tint, tintMix: kind === 0 ? 1 : 0.55, opacity: weight * 0.92,
          });
        }
      };
      drawFallers(0, wSpring);
      drawFallers(1, wAutumn);

      // actual lantern above the water
      for (let si = 0; si < smalls.length; si++) {
        const S = smalls[si];
        const [sx, sz, bob, sc] = smallPos(S);
        m4.compose(matA, sx, bob, sz, S.rot + wt * 0.02, 0.03 * Math.sin(wt * 0.6 + S.phase), 0.03 * Math.cos(wt * 0.5 + S.phase), sc, sc, sc);
        renderer.drawMesh(smallFrameMesh, matA);
        renderer.drawMesh(smallPaperMesh, matA, { emissive: 0.12 + night * 0.8 });
      }

      renderer.drawMesh(raftMesh, groupModel);
      if (treeFade > 0.01) {
        renderer.drawMesh(treeMesh, treeModel, { tint: trunkTint, tintMix: 0.5, opacity: treeFade });
        renderer.drawInstances(leafInst, leafCount, treeModel, { emissive: night * 0.2, opacity: treeFade });
      }
      drawFlower(bloom, pal, camera, time, night, groupModel, false);

      if (night > 0.02) {
        renderer.setDepth(false, true);
        m4.billboard(matD, camera.right, camera.up, camera.back, [0, 1.9, -0.2], 0, 3.8, 4.4);
        renderer.drawSprite(tex.glow, matD, [1, 0.74, 0.42], 0.3 * night, 'add');
        m4.basis(matC, [2.9, 0, 0], [0, 0, -2.9], [0, 1, 0], [0, 0.31, 0]);
        renderer.drawSprite(tex.glow, matC, [1, 0.68, 0.36], 0.3 * night, 'add');
        renderer.setDepth(true, true);
      }

      renderer.drawMesh(coverMesh, coverModel);

      // seasonal glyph: after the opaque cover, no depth writes (no square)
      if (text && text.alpha > 0.002) {
        const glyph = glyphs[text.key] || glyphs.spring;
        const tl = layout.text;
        const size = tl.size * text.scale;
        const cx = camera.target[0] + camera.right[0] * tl.x + camera.up[0] * tl.y + camera.back[0] * tl.depth;
        const cyy = camera.target[1] + camera.right[1] * tl.x + camera.up[1] * tl.y + camera.back[1] * tl.depth;
        const czz = camera.target[2] + camera.right[2] * tl.x + camera.up[2] * tl.y + camera.back[2] * tl.depth;
        // the season glyph rises out of the pavilion as it fades in
        const rise = Math.pow(1 - clamp(text.alpha, 0, 1), 1.5) * 2.2;
        const floatY = Math.sin(time * 0.5) * 0.02 - rise;
        const pos = [cx, cyy + floatY, czz];

        const shScale = size * 1.03;
        m4.billboard(shadowModel, camera.right, camera.up, camera.back, [
          pos[0] + camera.right[0] * 0.035 - camera.up[0] * 0.06,
          pos[1] + camera.right[1] * 0.035 - camera.up[1] * 0.06,
          pos[2] + camera.right[2] * 0.035 - camera.up[2] * 0.06,
        ], 0, shScale, shScale);
        // a soft light halo separates the glyph from the pale background
        m4.billboard(matD, camera.right, camera.up, camera.back, pos, 0, size * 1.14, size * 1.14);
        renderer.drawSprite(tex.glow, matD, [1, 0.99, 0.95], 0.08 + night * 0.03, 'add');
        renderer.setDepth(false, true);
        renderer.drawSprite(glyph.shadow, shadowModel, [
          0.3, 0.26, 0.22,
        ], (0.035 - night * 0.02) * text.alpha, 'normal');
        renderer.setDepth(true, true);

        const deep = mixRgb(pal.accentDeep, pal.accent, 0.25);
        const midColor = mixRgb(pal.accent, [1, 1, 1], 0.04 + 0.55 * night);
        const top = mixRgb(pal.accent, [1, 0.99, 0.96], 0.62);
        const bottom = mixRgb(deep, [1, 1, 1], 0.02 + 0.45 * night);
        m4.billboard(textModel, camera.right, camera.up, camera.back, pos, 0, size, size);
        renderer.drawText(
          glyph.tex, textModel, top, midColor, bottom,
          text.alpha * (0.98 + 0.02 * night), 0.22,
        );
      }

      renderer.drawGlass(glassMesh, coverModel, pal.glass, glassAlpha * (1 - coverAmt * 0.94));

      if (night > 0.02) {
        renderer.setDepth(false, true);
        for (let si = 0; si < smalls.length; si++) {
          const S = smalls[si];
          const [sx, sz, bob, sc] = smallPos(S);
          m4.billboard(matD, camera.right, camera.up, camera.back, [sx, bob + 0.24 * sc, sz], 0, 1.15 * sc, 1.15 * sc);
          renderer.drawSprite(tex.glow, matD, [1, 0.74, 0.42], 0.36 * night, 'add');
        }
        renderer.setDepth(true, true);
      }

      drawFireflies(camera, wt, night);

      const pCount = updateParticles(dt * (motion == null ? 1 : motion), time, angle, bloom);
      renderer.setDepth(false, true);
      renderer.drawInstances(particleInst, pCount, ident);
      renderer.setDepth(true, true);
    }

    function getGlyphKeys() {
      return Object.keys(glyphs);
    }

    return {
      draw,
      setLayout,
      paletteAt,
      seasonWeights,
      glyphKeys: getGlyphKeys(),
      PALETTES,
      size: { leaves: leaves.length, petals: petals.length },
    };
  }

  S4.createWorld = createWorld;
  S4.PALETTES = PALETTES;
})();


