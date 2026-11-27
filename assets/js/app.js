/* 季忆 — 交互、季节状态与界面 */
(function () {
  'use strict';
  const S4 = window.S4;
  const { math } = S4;
  const { clamp, lerp, damp, mod, smoothstep, smootherstep, m4, v3, hexToRgb, rgbToHex, rgba, mixRgb, TAU } = math;

  const HALF_PI = Math.PI / 2;
  const SEASON_KEYS = ['spring', 'summer', 'autumn', 'winter'];

  /* ───────────────────────── 文案 ───────────────────────── */
  const SEASONS = [
    {
      key: 'spring', no: '01', label: '春 · 玉兰', en: 'SPRING', name: '春天',
      lines: [
        { who: '我', text: '楼下的玉兰开了。我替你数过，一共十七朵。' },
        { who: '你', text: '那第十八朵留给我。等它落下来，夹进你正在读的那本书里。' },
        { who: '我', text: '好。我把书翻到第三十二页，那里空着一行。' },
      ],
      note: '拖动旋转，收集四季',
    },
    {
      key: 'summer', no: '02', label: '夏 · 梅雨', en: 'SUMMER', name: '夏天',
      lines: [
        { who: '我', text: '这边的雨下了一整夜，像有人在楼上轻轻走动。' },
        { who: '你', text: '我这边也是。天亮的时候，屋檐还在滴水。' },
        { who: '我', text: '那我们各自数到一百。谁先睡着，谁就赢一颗糖。' },
      ],
      note: '第二季 · 雨声很长',
    },
    {
      key: 'autumn', no: '03', label: '秋 · 银杏', en: 'AUTUMN', name: '秋天',
      lines: [
        { who: '你', text: '银杏开始落了。地上像铺了一层没写完的信纸。' },
        { who: '我', text: '那我们把没说完的话都写上去，一片叶子一句。' },
        { who: '你', text: '写到最后一片的时候，记得留个落款。' },
      ],
      note: '第三季 · 叶子在响',
    },
    {
      key: 'winter', no: '04', label: '冬 · 初雪', en: 'WINTER', name: '冬天',
      lines: [
        { who: '我', text: '今年的第一场雪，比去年晚了三天。' },
        { who: '你', text: '我把它记下来了，连同你说话时的呼吸。' },
        { who: '我', text: '那就把整个冬天先借给你，春天再还我。' },
      ],
      note: '第四季 · 雪落在树上',
    },
  ];

  const BLOOM_LINES = [
    { who: '我', text: '它开了。就在你停下来的这一刻。' },
    { who: '你', text: '原来一棵树，也会把一整年开成一朵花。' },
    { who: '我', text: '别急着走。花只开一会儿，然后再变回树。' },
  ];

  /* ───────────────────────── 元素 ───────────────────────── */
  const el = {};
  ['letter', 'letterNo', 'letterSeason', 'letterState', 'dialogue', 'letterNote',
    'counter', 'hold', 'ripple', 'hint', 'giftBtn',
    'giftDot', 'giftLayer', 'giftTitle', 'giftText', 'live', 'seasonDots',
    'stage', 'nightBtn'].forEach((k) => { el[k] = document.getElementById(k); });

  /* ───────────────────────── 视口 / 相机 ───────────────────────── */
  const camera = {
    yaw: 38 * Math.PI / 180,
    pitch: 30 * Math.PI / 180,
    halfHeight: 6.4,
    target: [0, 3.05, 0],
    text: { x: 4.3, y: 2.2, size: 4.2, depth: 9 },
    viewProj: m4.create(),
    right: [1, 0, 0],
    up: [0, 1, 0],
    back: [0, 0, 1],
    eye: [0, 0, 1],
  };
  const view = m4.create();
  const proj = m4.create();

  const layoutInfo = { mobile: false, sheetH: 0, w: 1, h: 1, aspect: 1, lift: 0, narrow: false };

  function computeCamera(w, h) {
    const aspect = w / h;
    const mobile = w <= 780;
    const sheetH = mobile && el.letter ? el.letter.getBoundingClientRect().height : 0;
    const availableH = Math.max(280, h - sheetH);

    const narrow = aspect < 1.28 || mobile;
    let halfH;
    if (narrow) {
      // portrait / square: a large lantern, glyph above it
      halfH = Math.max(9.0, 8.4 / (2 * aspect));
      if (mobile) {
        halfH = Math.max(halfH, (9.2 / (availableH / h)) * 0.5);
      }
    } else {
      // landscape: the glyph floats to the right of the lantern
      halfH = Math.max(5.6, 8.4 / (2 * aspect));
    }

    const lift = mobile ? (sheetH * 0.34 / h) * 2 * halfH : 0.1;
    camera.halfHeight = halfH;
    camera.target = [0, 2.4 - lift, 0];

    if (narrow) {
      camera.text = {
        x: 0,
        y: 2 * halfH * 0.3,
        size: halfH * 0.38,
        depth: -6,
      };
    } else {
      const size = halfH * 0.62;
      const maxX = halfH * aspect * 0.94 - size * 0.5;
      const x = Math.max(1.8, Math.min(2.4 + size * 0.5 - 0.4, maxX));
      camera.text = {
        x,
        y: 2 * halfH * 0.24,
        size,
        depth: 9,
      };
    }

    const dir = v3.norm([
      Math.sin(camera.yaw) * Math.cos(camera.pitch),
      Math.sin(camera.pitch),
      Math.cos(camera.yaw) * Math.cos(camera.pitch),
    ]);
    const eye = [
      camera.target[0] + dir[0] * 42,
      camera.target[1] + dir[1] * 42,
      camera.target[2] + dir[2] * 42,
    ];
    camera.eye = eye;
    m4.lookAt(view, eye, camera.target, [0, 1, 0]);
    m4.ortho(proj, -halfH * aspect, halfH * aspect, -halfH, halfH, 0.1, 400);
    m4.multiply(camera.viewProj, proj, view);

    camera.right = [view[0], view[4], view[8]];
    camera.up = [view[1], view[5], view[9]];
    camera.back = [view[2], view[6], view[10]];

    layoutInfo.mobile = mobile;
    layoutInfo.narrow = narrow;
    layoutInfo.sheetH = sheetH;
    layoutInfo.w = w;
    layoutInfo.h = h;
    layoutInfo.aspect = aspect;
    layoutInfo.lift = lift;

    document.documentElement.style.setProperty('--sheet-h', Math.round(sheetH) + 'px');
  }

  /* ───────────────────────── 状态 ───────────────────────── */
  const state = {
    angle: 0,
    angleTarget: 0,
    velocity: 0,
    dragging: false,
    pointerId: null,
    lastX: 0,
    lastMove: 0,
    pointerVel: 0,
    turns: 0,
    prevAngle: 0,    hold: { active: false, kind: 'season', season: 0, t: 0 },
    settleT: 0,
    bloom: 0,
    bloomTarget: 0,
    bloomPending: false,
    nextBloomAt: 1,
    bloomCount: 0,
    visited: [false, false, false, false],
    textAlpha: 0,
    textKey: 'spring',
    textScale: 0.94,
    freezeT: 99,
    motion: 1,
    animTime: 0,
    time: 0,
    giftUnlocked: false,
    seasonUi: -1,
    firstDrag: false,
    nightOn: false,
    nightAmt: 0,
    navigating: false,
    dipStart: -100,
    dip: 0,
    rippleAge: -1,
    floatY: 0.035,
    lastInteract: 0,
  };

  let renderer = null;
  let world = null;
  let currentPal = null;
  let lastCss = 0;
  let raf = 0;
  let lastFrame = 0;
  let reduced = false;

  const params = new URLSearchParams(location.search);
  if (params.get('debug') === '1') window.__jiyi = state;

  /* 调试浮层：只在 ?debug=1 时出现 */
  function installDebug() {
    if (params.get('debug') !== '1') return;
    const box = document.createElement('pre');
    box.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:99;max-width:60vw;max-height:40vh;overflow:auto;margin:0;padding:8px 10px;background:rgba(20,18,14,.82);color:#f7e9cf;font:10px/1.5 monospace;border-radius:6px;white-space:pre-wrap;pointer-events:none';
    box.textContent = 'debug';
    document.body.appendChild(box);
    const show = (msg) => { box.textContent = String(msg).slice(0, 2000); };
    window.addEventListener('error', (e) => {
      show('ERROR: ' + (e.message || '') + '\n' + (e.filename || '') + ':' + (e.lineno || '') + '\n' + (e.error && e.error.stack ? e.error.stack : ''));
    });
    window.addEventListener('unhandledrejection', (e) => {
      show('REJECT: ' + (e.reason && e.reason.stack ? e.reason.stack : e.reason));
    });
    window.setInterval(() => {
      if (window.S4_APP) {
        const s = window.S4_APP.state;
        box.textContent = 'angle=' + (s.angle * 180 / Math.PI).toFixed(1) + '°  season=' + mod(nearestStop(s.angle), 4) +
          '\nturns=' + s.turns.toFixed(2) + '  bloom=' + s.bloom.toFixed(2) + '  hold=' + s.hold.active + '/' + s.hold.kind +
          '\ntext=' + s.textAlpha.toFixed(2) + '  visited=' + s.visited.join(',') +
          '\nhalfH=' + camera.halfHeight.toFixed(2) + '  text=' + JSON.stringify(camera.text);
      }
    }, 400);
  }

  /* ───────────────────────── UI ───────────────────────── */
  function setCssVars(pal) {
    const root = document.documentElement.style;
    const n = state.nightAmt || 0;
    const accent = mixRgb(pal.accent, [1, 1, 1], 0.22 * n);
    const accentDeep = mixRgb(pal.accentDeep, [1, 0.95, 0.88], 0.2 * n);
    const ink = mixRgb(pal.ink, [0.92, 0.88, 0.8], n);
    const muted = mixRgb(pal.muted, [0.66, 0.63, 0.56], n);
    const paper = mixRgb(pal.worm, [0.06, 0.08, 0.11], n);
    root.setProperty('--accent', rgbToHex(accent));
    root.setProperty('--accent-deep', rgbToHex(accentDeep));
    root.setProperty('--accent-soft', rgba(accent, 0.15));
    root.setProperty('--accent-ghost', rgba(accent, 0.055));
    root.setProperty('--ink', rgbToHex(ink));
    root.setProperty('--muted', rgbToHex(muted));
    root.setProperty('--paper', rgbToHex(paper));
  }

  function markInteraction() {
    state.lastInteract = state.time;
    if (el.hint) el.hint.classList.remove('is-on');
  }

  function toggleNight() {
    state.nightOn = !state.nightOn;
    document.body.classList.toggle('is-night', state.nightOn);
    el.nightBtn.setAttribute('aria-pressed', state.nightOn ? 'true' : 'false');
    el.nightBtn.setAttribute('aria-label', state.nightOn ? '切换到白天' : '切换到夜色');
    if (el.live) el.live.textContent = state.nightOn ? '夜间灯光亮起。' : '回到白天。';
    markInteraction();
  }

  function renderDialogue(lines, isBloom) {
    if (!el.dialogue) return;
    el.dialogue.innerHTML = '';
    lines.forEach((line, i) => {
      const p = document.createElement('p');
      p.className = 'line' + (i % 2 === 1 ? ' is-them' : '');
      const who = document.createElement('span');
      who.className = 'who';
      who.textContent = line.who;
      const say = document.createElement('span');
      say.className = 'say';
      say.textContent = line.text;
      p.appendChild(who);
      p.appendChild(say);
      el.dialogue.appendChild(p);
      window.setTimeout(() => p.classList.add('in'), 60 + i * 110);
    });
    el.letter.classList.toggle('is-bloom', !!isBloom);
  }

  function updateSeasonCard(seasonIndex) {
    const s = SEASONS[seasonIndex];
    el.letterNo.textContent = s.no;
    el.letterSeason.textContent = s.label;
    el.letterState.textContent = s.en;
    el.counter.textContent = s.no + ' / 04';
    el.letterNote.textContent = s.note;
    renderDialogue(s.lines, false);
    state.seasonUi = seasonIndex;
    updateDots(seasonIndex);
    if (el.live) el.live.textContent = s.name + '到了。' + s.lines[0].text;
  }

  function updateBloomCard() {
    el.letterNo.textContent = '—';
    el.letterSeason.textContent = '第 ' + Math.max(1, state.bloomCount) + ' 次开放';
    el.letterState.textContent = 'BLOOM';
    el.counter.textContent = 'BLOOM';
    el.letterNote.textContent = '继续拖动，它会再变回树';
    renderDialogue(BLOOM_LINES, true);
    updateDots(-1);
    if (el.live) el.live.textContent = '树开成了一朵花。';
  }

  function updateDots(current) {
    if (!el.seasonDots) return;
    const dots = el.seasonDots.children;
    for (let i = 0; i < dots.length; i++) {
      dots[i].classList.toggle('seen', state.visited[i]);
      dots[i].classList.toggle('now', i === current);
    }
  }

  function showHold(kind) {
    el.hold.classList.add('is-on');
    el.hold.classList.toggle('is-bloom', kind === 'bloom');
    if (el.ripple) {
      el.ripple.setAttribute('aria-label', kind === 'bloom' ? '收下这朵花' : '确认并进入这一季');
    }
  }

  function hideHold() {
    el.hold.classList.remove('is-on');
    el.hold.classList.remove('is-bloom');
  }

  function openGift() {
    if (!el.giftLayer) return;
    markInteraction();
    el.giftLayer.hidden = false;
    const unlocked = state.giftUnlocked;
    el.giftTitle.textContent = unlocked ? '给你的小礼物' : '一份还没拆开的礼物';
    el.giftText.textContent = unlocked
      ? '把这一年压成一枚书签，夹进你正在读的那本书里。翻到第三十二页，那里空着一行。'
      : '等树开成一朵花，再回来拆开它。';
    requestAnimationFrame(() => {
      const close = el.giftLayer.querySelector('.gift-close');
      if (close) close.focus({ preventScroll: true });
    });
  }

  function closeGift() {
    if (!el.giftLayer) return;
    el.giftLayer.hidden = true;
    el.giftBtn.focus({ preventScroll: true });
    markInteraction();
  }

  function unlockGift() {
    state.giftUnlocked = true;
    el.giftBtn.classList.add('is-ready');
    el.giftDot.style.opacity = '1';
  }

  /* ───────────────────────── 季节 / 定格 ───────────────────────── */
  function nearestStop(angle) {
    return Math.round(angle / HALF_PI);
  }

  function beginHold(stop) {
    const season = mod(stop, 4);
    state.hold.active = true;
    state.hold.t = 0;
    state.hold.season = season;
    state.visited[season] = true;
    state.freezeT = 0;
    state.settleT = 0;
    state.dipStart = state.time;

    if (state.bloomPending && state.turns >= state.nextBloomAt) {
      state.bloomPending = false;
      state.bloomCount += 1;
      state.nextBloomAt = state.turns + 1;
      state.hold.kind = 'bloom';
      state.bloomTarget = 1;
      state.textKey = '';
      updateBloomCard();
      showHold('bloom');
      if (!state.giftUnlocked) unlockGift();
      return;
    }

    state.hold.kind = 'season';
    state.bloomTarget = 0;
    state.textKey = SEASONS[season].key;
    updateSeasonCard(season);
    showHold('season');
  }

  function endHold() {
    if (!state.hold.active) return;
    state.hold.active = false;
    state.hold.t = 0;
    state.bloomTarget = 0;
    hideHold();
  }

  function navigateSeason() {
    if (!state.hold.active || state.navigating) return;
    markInteraction();
    state.navigating = true;
    for (let i = 0; i < 3; i++) {
      const ring = document.createElement('span');
      ring.className = 'click-ripple';
      ring.style.animationDelay = i * 80 + 'ms';
      el.ripple.appendChild(ring);
      window.setTimeout(() => ring.remove(), 1600);
    }
    const url = state.hold.kind === 'bloom'
      ? './letter.html?season=bloom'
      : './letter.html?season=' + SEASONS[mod(state.hold.season, 4)].key;
    window.setTimeout(() => { location.href = url; }, 820);
  }

  /* ───────────────────────── 输入 ───────────────────────── */
  function onPointerDown(e) {
    if (e.button != null && e.button !== 0) return;
    if (!el.giftLayer.hidden) return;
    markInteraction();
    state.dragging = true;
    state.pointerId = e.pointerId;
    state.lastX = e.clientX;
    state.lastMove = performance.now();
    state.pointerVel = 0;
    state.velocity = 0;
    state.angleTarget = state.angle;
    state.settleT = 0;
    el.stage.classList.add('is-dragging');
    el.stage.setPointerCapture && el.stage.setPointerCapture(e.pointerId);
    endHold();
  }

  function onPointerMove(e) {
    if (!state.dragging || e.pointerId !== state.pointerId) return;
    const now = performance.now();
    const dx = e.clientX - state.lastX;
    const dt = Math.max(8, now - state.lastMove) / 1000;
    state.lastX = e.clientX;
    state.lastMove = now;
    const delta = dx * 0.0072;
    state.angleTarget += delta;
    state.angle += delta;
    state.pointerVel = clamp((dx * 0.0072) / dt, -7, 7);
    state.velocity = state.pointerVel;
  }

  function onPointerUp(e) {
    if (!state.dragging || (e.pointerId != null && e.pointerId !== state.pointerId)) return;
    state.dragging = false;
    state.pointerId = null;
    el.stage.classList.remove('is-dragging');
    if (performance.now() - state.lastMove > 90) state.velocity = 0;
    state.velocity = clamp(state.velocity * 0.65, -4.6, 4.6);
  }

  function onWheel(e) {
    if (!el.giftLayer.hidden) return;
    e.preventDefault();
    markInteraction();
    endHold();
    const delta = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 0.0019;
    state.angleTarget += delta;
    state.velocity *= 0.3;
  }

  function onKey(e) {
    if (!el.giftLayer.hidden) return;
    markInteraction();
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const stop = nearestStop(state.angle);
      state.angleTarget = (stop + dir) * HALF_PI;
      state.velocity = 0;
      endHold();
    } else if (e.key === 'Enter' && state.hold.active) {
      navigateSeason();
    } else if (e.key === 'g' || e.key === 'G') {
      openGift();
    } else if (e.key === 'n' || e.key === 'N') {
      if (el.giftLayer.hidden) toggleNight();
    }
  }

  /* ───────────────────────── 循环 ───────────────────────── */
  function update(dt) {
    state.time += dt;
    const prev = state.prevAngle;

    if (!state.dragging) {
      if (Math.abs(state.velocity) > 0.12) {
        state.angleTarget += state.velocity * dt;
        state.velocity *= Math.exp(-3.2 * dt);
      } else {
        state.velocity = 0;
        const stop = nearestStop(state.angleTarget) * HALF_PI;
        state.angleTarget = damp(state.angleTarget, stop, 11, dt);
        if (Math.abs(state.angleTarget - stop) < 0.0018) state.angleTarget = stop;
      }
    }

    state.angle = damp(state.angle, state.angleTarget, state.dragging ? 26 : 13, dt);
    state.turns += Math.abs(state.angle - prev) / TAU;
    state.prevAngle = state.angle;

    if (state.turns >= state.nextBloomAt) state.bloomPending = true;

    const stop = nearestStop(state.angle);
    const dist = Math.abs(state.angle - stop * HALF_PI);
    const atStop = !state.dragging && Math.abs(state.velocity) < 0.25 && dist < 0.035 &&
      Math.abs(state.angleTarget - stop * HALF_PI) < 0.08;

    if (atStop) {
      state.settleT += dt;
      if (!state.hold.active && state.settleT > 0.22) beginHold(stop);
    } else {
      state.settleT = 0;
    }

    if (state.hold.active) {
      state.hold.t += dt;
      if (state.dragging) endHold();
    }

    // freeze beat after arriving
    if (state.freezeT < 2.2) state.freezeT += dt;
    if (reduced) {
      state.motion = 1;
    } else {
      state.motion = 0.16 + 0.84 * smoothstep(0.32, 1.35, state.freezeT);
    }
    state.animTime += dt * state.motion;

    state.textAlpha = damp(state.textAlpha, state.hold.active && state.hold.kind !== 'bloom' ? 1 : 0, 3.6, dt);
    state.textScale = damp(state.textScale, state.hold.active ? 1 : 0.94, 6.5, dt);
    state.bloom = damp(state.bloom, state.bloomTarget, state.bloomTarget > state.bloom ? 1.2 : 2.4, dt);
    state.nightAmt = damp(state.nightAmt, state.nightOn ? 1 : 0, 2.15, dt);

    // float / seasonal dip: the raft just kisses the water, then ripples
    const dipAge = state.time - state.dipStart;
    let dip = 0;
    if (dipAge >= 0 && dipAge < 2.0) {
      const p = clamp(dipAge / 1.6, 0, 1);
      const settle = Math.sin(Math.PI * p) * Math.sin(Math.PI * p);
      dip = -0.1 * settle + 0.006 * Math.sin(2 * Math.PI * p) * settle;
    }
    // the ring keeps spreading and dissolving long after the lantern has risen
    const ringAge = dipAge - 0.35;
    const rippleAge = ringAge > 0 && ringAge < 7.4 ? ringAge : -1;
    state.dip = dip;
    state.rippleAge = rippleAge;
    state.floatY = Math.max(0.002, 0.1 + 0.012 * Math.sin(state.animTime * 0.85) + dip);

    // idle hint ("旋转") after three quiet seconds
    if (el.hint) {
      const idle = state.time - state.lastInteract;
      const show = idle > 3 && !state.dragging && !(el.giftLayer && !el.giftLayer.hidden);
      el.hint.classList.toggle('is-on', show);
    }

    if (state.hold.active && state.hold.kind === 'bloom') {
      state.textKey = '';
    } else if (state.hold.active) {
      state.textKey = SEASONS[mod(state.hold.season, 4)].key;
    }

    const uiSeason = mod(nearestStop(state.angle), 4);
    if (uiSeason !== state.seasonUi && !state.hold.active) {
      state.seasonUi = uiSeason;
      el.counter.textContent = SEASONS[uiSeason].no + ' / 04';
      updateDots(uiSeason);
    }
  }

  function render(dt) {
    const pal = world.paletteAt(state.angle);
    currentPal = pal;
    world.setLayout(camera.halfHeight, layoutInfo.aspect, camera.text);
    world.draw({
      angle: state.angle,
      pal,
      camera,
      time: state.animTime,
      waterTime: state.time,
      dt: Math.min(0.05, dt),
      bloom: state.bloom,
      motion: state.motion,
      night: state.nightAmt,
      floatY: state.floatY,
      rippleAge: state.rippleAge,
      text: {
        alpha: state.textAlpha,
        scale: state.textScale,
        key: state.textKey,
      },
    });

    if (state.time - lastCss > 0.14) {
      lastCss = state.time;
      setCssVars(pal);
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!lastFrame) lastFrame = now;
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    update(dt);
    if (renderer && world) {
      renderer.resize(layoutInfo.w, layoutInfo.h, Math.min(window.devicePixelRatio || 1, 2));
      renderer.setCamera(camera.viewProj, camera.eye, v3.norm(v3.sub(camera.eye, camera.target)));
      render(dt);
    }
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    computeCamera(w, h);
    if (renderer) {
      renderer.resize(w, h, Math.min(window.devicePixelRatio || 1, 2));
      renderer.setCamera(camera.viewProj, camera.eye, v3.norm(v3.sub(camera.eye, camera.target)));
    }
  }

  /* ───────────────────────── 启动 ───────────────────────── */
  async function init() {
    reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (params.get('static') === '1') document.body.classList.add('is-static');
    installDebug();

    if (el.stage) el.stage.style.opacity = '0';
    resize();

    // draw the first letter immediately, before the WebGL scene is built
    updateSeasonCard(0);
    state.seasonUi = 0;
    state.textKey = 'spring';
    try { setCssVars(S4.PALETTES[0]); } catch (e) { /* ignore */ }

    // the bundled 4.5 kB serif subset makes the five glyphs identical on every device
    try {
      await Promise.race([
        document.fonts.load('400 430px "Jiyi Serif"'),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
    } catch (e) { /* fall back to system serif */ }

    try {
      renderer = S4.gl.createRenderer(el.stage);
    } catch (err) {
      renderer = null;
    }

    if (!renderer) {
      showFallback();
      return;
    }

    world = S4.createWorld(renderer);
    renderer.resize(layoutInfo.w, layoutInfo.h, Math.min(window.devicePixelRatio || 1, 2));
    renderer.setCamera(camera.viewProj, camera.eye, v3.norm(v3.sub(camera.eye, camera.target)));

    // restore a comfortable season if requested (also used for screenshots)
    const angleParam = params.get('angle');
    const seasonParam = params.get('season');
    if (angleParam != null) {
      state.angle = parseFloat(angleParam) * Math.PI / 180;
      state.angleTarget = state.angle;
      state.prevAngle = state.angle;
    } else if (seasonParam != null && seasonParam !== 'bloom') {
      const idx = Math.max(0, Math.min(3, parseInt(seasonParam, 10) || 0));
      state.angle = idx * HALF_PI;
      state.angleTarget = state.angle;
      state.prevAngle = state.angle;
      updateSeasonCard(idx);
    }

    const turnsParam = params.get('turns');
    if (turnsParam != null) {
      const t = parseFloat(turnsParam);
      if (isFinite(t)) state.turns = t;
    }

    if (params.get('bloom') === '1') {
      state.bloom = 1;
      state.bloomTarget = 1;
      state.bloomCount = 1;
      state.textKey = '';
      state.hold.active = true;
      state.hold.kind = 'bloom';
      state.hold.t = 2;
      state.textAlpha = 0;
      state.textScale = 1;
      updateBloomCard();
      showHold('bloom');
    } else if (params.get('hold') === '1') {      const idx = mod(Math.round(state.angle / HALF_PI), 4);
      state.hold.active = true;
      state.hold.kind = 'season';
      state.hold.season = idx;
      state.hold.t = 2;
      state.textKey = SEASONS[idx].key;
      state.textAlpha = 1;
      state.textScale = 1;
      state.visited[idx] = true;
      updateSeasonCard(idx);
      showHold('season');
    } else {
      window.setTimeout(() => {
        const stop = nearestStop(state.angle);
        const atStop = Math.abs(state.angle - stop * HALF_PI) < 0.02;
        if (atStop && !state.hold.active && !state.dragging) beginHold(stop);
      }, 250);
    }

    if (params.get('debug') === '1') {
      state.visited = [true, true, true, true];
      unlockGift();
    }

    if (params.get('gift') === '1') {
      state.visited = [true, true, true, true];
      unlockGift();
      window.setTimeout(openGift, 350);
    }

    if (params.get('night') === '1') {
      toggleNight();
      state.nightAmt = 1;
    }

    // events
    el.stage.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => window.setTimeout(resize, 260));
    document.addEventListener('visibilitychange', () => { lastFrame = 0; });

    el.ripple.addEventListener('click', navigateSeason);
    el.giftBtn.addEventListener('click', openGift);
    el.nightBtn.addEventListener('click', toggleNight);
    if (el.giftLayer) {
      el.giftLayer.addEventListener('click', (e) => {
        if (e.target.closest('[data-close]')) closeGift();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && el.giftLayer && !el.giftLayer.hidden) closeGift();
    });

    if (el.letter && 'ResizeObserver' in window) {
      const ro = new ResizeObserver(() => {
        if (window.innerWidth <= 780) {
          computeCamera(window.innerWidth, window.innerHeight);
        }
      });
      ro.observe(el.letter);
    }

    requestAnimationFrame(() => {
      el.stage.style.transition = 'opacity 1.2s ease';
      el.stage.style.opacity = '1';
    });

    raf = requestAnimationFrame(frame);
    window.S4_APP = { state, camera, world, renderer };
  }

  function showFallback() {
    const div = document.createElement('div');
    div.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:24px;font-family:serif;color:#3a352c;background:#f4f0e6;z-index:50';
    div.innerHTML = '<div><p style="font-family:monospace;font-size:10px;letter-spacing:.2em;color:#9a9284">WEBGL</p><p style="font-size:20px;letter-spacing:.1em">这棵树需要 WebGL 才能生长。<br>请换一个浏览器，或开启硬件加速。</p></div>';
    document.getElementById('app').appendChild(div);
  }

  /* 脚本在 body 末尾 defer 执行；字形字体是本地子集，先等它加载 */
  function boot() {
    init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
