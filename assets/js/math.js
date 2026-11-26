/* 季忆 — 数学与色彩小工具（无依赖） */
(function () {
  'use strict';
  const S4 = (window.S4 = window.S4 || {});

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
  const mod = (n, m) => ((n % m) + m) % m;
  const smoothstep = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const smootherstep = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * t * (t * (t * 6 - 15) + 10);
  };
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);
  const TAU = Math.PI * 2;

  /* deterministic random ---------------------------------------- */
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* colour ------------------------------------------------------ */
  function hexToRgb(hex) {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  function rgbToHex(c) {
    const q = (v) => clamp(Math.round(v * 255), 0, 255).toString(16).padStart(2, '0');
    return '#' + q(c[0]) + q(c[1]) + q(c[2]);
  }
  function mixRgb(a, b, t, out) {
    const o = out || [0, 0, 0];
    o[0] = a[0] + (b[0] - a[0]) * t;
    o[1] = a[1] + (b[1] - a[1]) * t;
    o[2] = a[2] + (b[2] - a[2]) * t;
    return o;
  }
  function shade(c, amount) {
    return [clamp(c[0] * amount, 0, 1), clamp(c[1] * amount, 0, 1), clamp(c[2] * amount, 0, 1)];
  }
  function rgba(c, a) {
    return 'rgba(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ',' + a + ')';
  }

  /* mat4 (column-major) ----------------------------------------- */
  const M = {
    create() {
      const m = new Float32Array(16);
      m[0] = m[5] = m[10] = m[15] = 1;
      return m;
    },
    identity(o) {
      o.fill(0);
      o[0] = o[5] = o[10] = o[15] = 1;
      return o;
    },
    multiply(o, a, b) {
      const t = new Float32Array(16);
      for (let c = 0; c < 4; c++) {
        const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
        t[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
        t[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
        t[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
        t[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
      }
      o.set(t);
      return o;
    },
    ortho(o, l, r, b, t, n, f) {
      o.fill(0);
      o[0] = 2 / (r - l);
      o[5] = 2 / (t - b);
      o[10] = -2 / (f - n);
      o[12] = -(r + l) / (r - l);
      o[13] = -(t + b) / (t - b);
      o[14] = -(f + n) / (f - n);
      o[15] = 1;
      return o;
    },
    lookAt(o, eye, center, up) {
      let zx = eye[0] - center[0], zy = eye[1] - center[1], zz = eye[2] - center[2];
      let len = Math.hypot(zx, zy, zz) || 1;
      zx /= len; zy /= len; zz /= len;
      let xx = up[1] * zz - up[2] * zy;
      let xy = up[2] * zx - up[0] * zz;
      let xz = up[0] * zy - up[1] * zx;
      len = Math.hypot(xx, xy, xz) || 1;
      xx /= len; xy /= len; xz /= len;
      const yx = zy * xz - zz * xy;
      const yy = zz * xx - zx * xz;
      const yz = zx * xy - zy * xx;
      o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0;
      o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0;
      o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
      o[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
      o[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
      o[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
      o[15] = 1;
      return o;
    },
    /* T * Ry * Rx * Rz * S */
    compose(o, px, py, pz, ry, rx, rz, sx, sy, sz) {
      const cy = Math.cos(ry), sy_ = Math.sin(ry);
      const cx = Math.cos(rx), sx_ = Math.sin(rx);
      const cz = Math.cos(rz), sz_ = Math.sin(rz);

      // Ry * Rx
      const a00 = cy, a01 = sy_ * sx_, a02 = sy_ * cx;
      const a10 = 0, a11 = cx, a12 = -sx_;
      const a20 = -sy_, a21 = cy * sx_, a22 = cy * cx;

      // (Ry*Rx) * Rz
      const m00 = a00 * cz + a01 * sz_;
      const m01 = -a00 * sz_ + a01 * cz;
      const m02 = a02;
      const m10 = a10 * cz + a11 * sz_;
      const m11 = -a10 * sz_ + a11 * cz;
      const m12 = a12;
      const m20 = a20 * cz + a21 * sz_;
      const m21 = -a20 * sz_ + a21 * cz;
      const m22 = a22;

      o[0] = m00 * sx; o[1] = m10 * sx; o[2] = m20 * sx; o[3] = 0;
      o[4] = m01 * sy; o[5] = m11 * sy; o[6] = m21 * sy; o[7] = 0;
      o[8] = m02 * sz; o[9] = m12 * sz; o[10] = m22 * sz; o[11] = 0;
      o[12] = px; o[13] = py; o[14] = pz; o[15] = 1;
      return o;
    },
    /* basis columns ax, ay, az with translation p */
    basis(o, ax, ay, az, p) {
      o[0] = ax[0]; o[1] = ax[1]; o[2] = ax[2]; o[3] = 0;
      o[4] = ay[0]; o[5] = ay[1]; o[6] = ay[2]; o[7] = 0;
      o[8] = az[0]; o[9] = az[1]; o[10] = az[2]; o[11] = 0;
      o[12] = p[0]; o[13] = p[1]; o[14] = p[2]; o[15] = 1;
      return o;
    },
    /* camera-facing quad basis, rotated in-plane by angle, optional scale */
    billboard(o, right, up, back, p, angle, sx, sy) {
      const c = Math.cos(angle), s = Math.sin(angle);
      const ax = [
        right[0] * c + up[0] * s,
        right[1] * c + up[1] * s,
        right[2] * c + up[2] * s,
      ];
      const ay = [
        -right[0] * s + up[0] * c,
        -right[1] * s + up[1] * c,
        -right[2] * s + up[2] * c,
      ];
      o[0] = ax[0] * sx; o[1] = ax[1] * sx; o[2] = ax[2] * sx; o[3] = 0;
      o[4] = ay[0] * sy; o[5] = ay[1] * sy; o[6] = ay[2] * sy; o[7] = 0;
      o[8] = back[0]; o[9] = back[1]; o[10] = back[2]; o[11] = 0;
      o[12] = p[0]; o[13] = p[1]; o[14] = p[2]; o[15] = 1;
      return o;
    },
  };

  const v3 = {
    norm(v) {
      const l = Math.hypot(v[0], v[1], v[2]) || 1;
      return [v[0] / l, v[1] / l, v[2] / l];
    },
    add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; },
    sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; },
    scale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; },
    cross(a, b) {
      return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
      ];
    },
    dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; },
  };

  S4.math = {
    clamp, lerp, damp, mod, smoothstep, smootherstep,
    easeOutCubic, easeInOutCubic, easeOutQuint, TAU, rng,
    hexToRgb, rgbToHex, mixRgb, shade, rgba,
    m4: M, v3,
  };
})();
