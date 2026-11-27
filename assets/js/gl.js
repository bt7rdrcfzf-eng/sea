/* 季忆 — 极简 WebGL2 渲染器 */
(function () {
  'use strict';
  const S4 = window.S4;

  /* shaders ----------------------------------------------------- */
  const LIT_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec3 aColor;
uniform mat4 uViewProj;
uniform mat4 uModel;
uniform vec3 uTint;
uniform float uTintMix;
uniform float uTintMul;
uniform float uWave;
uniform float uWaveTime;
out vec3 vNormal;
out vec3 vColor;
out vec3 vWorld;
void main() {
  vec4 wp = uModel * vec4(aPos, 1.0);
  if (uWave > 0.001) {
    float depth = clamp(-wp.y * 0.16, 0.0, 1.0);
    float w = sin(wp.z * 2.7 + uWaveTime * 0.9) + sin(wp.x * 3.1 - uWaveTime * 0.7) + 0.5 * sin(wp.x * 7.3 + wp.z * 5.1 - uWaveTime * 1.4);
    wp.x += w * uWave * (0.028 + depth * 0.09);
    wp.z += cos(wp.x * 2.2 + uWaveTime * 0.8) * uWave * (0.018 + depth * 0.065);
  }
  vWorld = wp.xyz;
  vNormal = mat3(uModel) * aNormal;
  vColor = mix(aColor, uTint, uTintMix) * mix(vec3(1.0), uTint, uTintMul);
  gl_Position = uViewProj * wp;
}`;

  const LIT_FS = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec3 vColor;
in vec3 vWorld;
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform vec3 uAmbient;
uniform vec3 uRimColor;
uniform float uRim;
uniform float uEmissive;
uniform vec3 uViewDir;
uniform vec3 uFogColor;
uniform float uFog;
uniform float uOpacity;
uniform float uDim;
uniform float uGhost;
out vec4 fragColor;
void main() {
  vec3 n = normalize(vNormal);
  float ndl = uGhost > 0.5 ? abs(dot(n, uLightDir)) : max(dot(n, uLightDir), 0.0);
  float hemi = n.y * 0.5 + 0.5;
  vec3 col = vColor * (uAmbient * (0.46 + 0.20 * hemi) + uLightColor * ndl * 0.46);
  col *= 1.0 - 0.07 * (1.0 - hemi);
  col += vColor * uEmissive;
  float rim = pow(1.0 - max(dot(n, uViewDir), 0.0), 3.0);
  col += uRimColor * rim * uRim;
  float ao = 0.76 + 0.24 * smoothstep(0.0, 1.5, vWorld.y);
  col *= ao;
  col = mix(col, uFogColor, uFog * smoothstep(0.0, 1.0, 1.0 - vWorld.y / 10.0));
  col *= uDim;
  float a = uOpacity;
  if (uGhost > 0.5) a *= mix(0.35, 1.0, smoothstep(-6.5, -0.2, vWorld.y));
  fragColor = vec4(col, a);
}`;

  const INST_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
layout(location = 3) in vec3 aOffset;
layout(location = 4) in vec3 aScale;
layout(location = 5) in float aRotX;
layout(location = 6) in float aRotY;
layout(location = 7) in vec3 aInstColor;
uniform mat4 uViewProj;
uniform mat4 uModel;
uniform float uWave;
uniform float uWaveTime;
out vec3 vNormal;
out vec3 vColor;
out vec3 vWorld;
void main() {
  float cx = cos(aRotX), sx = sin(aRotX);
  float cy = cos(aRotY), sy = sin(aRotY);
  vec3 p = aPos * aScale;
  vec3 n = aNormal;
  p = vec3(p.x, p.y * cx - p.z * sx, p.y * sx + p.z * cx);
  n = vec3(n.x, n.y * cx - n.z * sx, n.y * sx + n.z * cx);
  p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
  n = vec3(n.x * cy + n.z * sy, n.y, -n.x * sy + n.z * cy);
  vec4 wp = uModel * vec4(p + aOffset, 1.0);
  if (uWave > 0.001) {
    float depth = clamp(-wp.y * 0.16, 0.0, 1.0);
    float w = sin(wp.z * 2.7 + uWaveTime * 0.9) + sin(wp.x * 3.1 - uWaveTime * 0.7) + 0.5 * sin(wp.x * 7.3 + wp.z * 5.1 - uWaveTime * 1.4);
    wp.x += w * uWave * (0.028 + depth * 0.09);
    wp.z += cos(wp.x * 2.2 + uWaveTime * 0.8) * uWave * (0.018 + depth * 0.065);
  }
  vWorld = wp.xyz;
  vNormal = mat3(uModel) * n;
  vColor = aInstColor;
  gl_Position = uViewProj * wp;
}`;

  const GLASS_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec3 aColor;
uniform mat4 uViewProj;
uniform mat4 uModel;
out vec3 vNormal;
out vec3 vWorld;
out vec3 vColor;
void main() {
  vec4 wp = uModel * vec4(aPos, 1.0);
  vWorld = wp.xyz;
  vNormal = mat3(uModel) * aNormal;
  vColor = aColor;
  gl_Position = uViewProj * wp;
}`;

  const GLASS_FS = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec3 vWorld;
in vec3 vColor;
uniform vec3 uColor;
uniform float uAlpha;
uniform vec3 uViewDir;
uniform float uTime;
out vec4 fragColor;
void main() {
  vec3 n = normalize(vNormal);
  float facing = abs(dot(n, uViewDir));
  float fres = pow(1.0 - facing, 2.2);
  float band = sin((vWorld.x * 0.55 + vWorld.y * 0.9) * 1.15 + uTime * 0.05);
  float sheen = smoothstep(0.35, 1.0, band) * 0.05;
  float top = smoothstep(0.65, 1.0, vWorld.y / 5.3) * 0.04;
  float a = uAlpha + fres * 0.22 + sheen + top;
  vec3 c = mix(uColor, vec3(0.82, 0.9, 0.96), 0.35) + vec3(0.1) * fres + vec3(0.1) * sheen;
  fragColor = vec4(c, clamp(a, 0.0, 0.92));
}`;

  const SPRITE_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
layout(location = 1) in vec2 aUv;
uniform mat4 uViewProj;
uniform mat4 uModel;
out vec2 vUv;
void main() {
  vUv = aUv;
  gl_Position = uViewProj * uModel * vec4(aPos, 0.0, 1.0);
}`;

  const SPRITE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
uniform vec4 uColor;
out vec4 fragColor;
void main() {
  vec4 t = texture(uTex, vUv);
  fragColor = vec4(uColor.rgb * t.rgb, uColor.a * t.a);
}`;

  const TEXT_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
uniform vec3 uColorTop;
uniform vec3 uColorMid;
uniform vec3 uColorBottom;
uniform float uAlpha;
uniform float uFade;
out vec4 fragColor;
void main() {
  vec4 t = texture(uTex, vUv);
  float h = vUv.y;
  vec3 c = mix(uColorBottom, uColorMid, smoothstep(0.0, 0.52, h));
  c = mix(c, uColorTop, smoothstep(0.52, 1.0, h));
  float a = t.a * uAlpha;
  // soft dissolve at the base, a slightly airy crown
  a *= mix(1.0, smoothstep(0.0, 0.30, h), uFade);
  a *= mix(0.80, 1.0, smoothstep(0.0, 0.5, h));
  a *= mix(0.94, 1.0, smoothstep(0.55, 1.0, h));
  if (a < 0.01) discard;
  fragColor = vec4(c, a);
}`;

  const WATER_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
uniform mat4 uViewProj;
uniform mat4 uModel;
out vec3 vWorld;
void main() {
  vec4 wp = uModel * vec4(aPos, 0.0, 1.0);
  vWorld = wp.xyz;
  gl_Position = uViewProj * wp;
}`;

  const WATER_FS = `#version 300 es
precision highp float;
in vec3 vWorld;
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSky;
uniform vec3 uLight;
uniform vec2 uRippleCenter;
uniform float uRippleAge;
uniform float uRippleStrength;
uniform vec4 uLandRipples[3];
out vec4 fragColor;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec2 p = vWorld.xz;
  float t = uTime;
  float h = 0.0;
  vec2 g = vec2(0.0);

  // four overlapping wind-wave directions
  float a1 = 0.58;
  float ph1 = p.x * 0.42 + p.y * 0.19 + t * 0.27;
  h += a1 * sin(ph1);
  g += a1 * vec2(cos(ph1) * 0.42, cos(ph1) * 0.19);
  float a2 = 0.40;
  float ph2 = p.x * 0.83 - p.y * 0.51 - t * 0.35;
  h += a2 * sin(ph2);
  g += a2 * vec2(cos(ph2) * 0.83, -cos(ph2) * 0.51);
  float a3 = 0.22;
  float ph3 = p.x * 1.57 + p.y * 1.21 + t * 0.52;
  h += a3 * sin(ph3);
  g += a3 * vec2(cos(ph3) * 1.57, cos(ph3) * 1.21);
  float a4 = 0.10;
  float ph4 = p.x * 2.83 - p.y * 2.27 - t * 0.79;
  h += a4 * sin(ph4);
  g += a4 * vec2(cos(ph4) * 2.83, -cos(ph4) * 2.27);

  // fine capillary ripples
  float pf1 = p.x * 3.9 + p.y * 2.2 + t * 1.05;
  h += 0.09 * sin(pf1);
  g += 0.09 * vec2(cos(pf1) * 3.9, cos(pf1) * 2.2);
  float pf2 = p.x * 2.6 - p.y * 4.1 - t * 1.3;
  h += 0.065 * sin(pf2);
  g += 0.065 * vec2(cos(pf2) * 2.6, -cos(pf2) * 4.1);

  // slow swell
  float ph5 = p.x * 0.13 + p.y * 0.10 + t * 0.11;
  h += 0.55 * sin(ph5);
  g += 0.55 * vec2(cos(ph5) * 0.13, cos(ph5) * 0.10);

  // gust patches: the surface amplitude changes from place to place
  float gustA = vnoise(p * 0.16 + vec2(t * 0.032, -t * 0.018));
  float gustB = vnoise(p * 0.37 - vec2(t * 0.045, t * 0.027));
  float gust = 0.55 + 0.70 * gustA * (0.4 + 0.6 * gustB);
  h *= gust;
  g *= gust;

  float dist = length(p);

  // ripple: thin concentric waves; they disturb the normal and darken troughs
  float age = uRippleAge;
  float rippleElev = 0.0;
  if (age > 0.0 && age < 7.5) {
    vec2 rel = p - uRippleCenter;
    float dCenter = length(rel);
    vec2 dir = dCenter > 0.0001 ? rel / dCenter : vec2(1.0, 0.0);
    float d = max(0.0, dCenter - 2.3);
    float front = 2.1 * age / (1.0 + 0.12 * age);
    float width = 0.6 + age * 0.30;
    float env = exp(-pow((d - front) / width, 2.0)) * smoothstep(0.0, 0.30, age);
    float fade = exp(-age * 0.32) * (1.0 - smoothstep(3.6, 6.9, age)) * uRippleStrength;
    float phase = (d - front) * 3.0;
    rippleElev = sin(phase) * env * fade;
    float slope = cos(phase) * 7.0 * env * fade;
    h += rippleElev * 0.04;
    g += dir * slope * 0.10;
  }

  // small ripples from petals / maple leaves landing on the water
  for (int li = 0; li < 3; li++) {
    vec4 lr = uLandRipples[li];
    if (lr.z > 0.0 && lr.z < 2.2) {
      float ld = length(p - lr.xy);
      float lf = 0.22 * lr.z / (1.0 + lr.z * 0.3);
      float lw = 0.16 + lr.z * 0.12;
      float lenv = exp(-pow((ld - lf) / lw, 2.0)) * (1.0 - smoothstep(1.8, 2.2, lr.z));
      float lph = (ld - lf) * 6.5;
      rippleElev += sin(lph) * lenv * 0.85 * lr.w;
    }
  }

  vec3 n = normalize(vec3(-g.x * 0.04, 1.0, -g.y * 0.04));
  vec3 lightDir = normalize(vec3(-0.35, 0.75, 0.42));
  float spec = pow(max(dot(n, lightDir), 0.0), 70.0);
  float spec2 = pow(max(dot(n, normalize(vec3(0.45, 0.55, -0.55))), 0.0), 30.0);

  vec3 col = mix(uShallow, uDeep, smoothstep(0.0, 18.0, dist));
  col = mix(col, uSky, smoothstep(14.0, 50.0, dist) * 0.55);
  float shade = clamp(h * 0.10, -0.6, 0.6);
  col *= 1.0 + shade * 0.9;
  col += uLight * spec * 0.8;
  col += uLight * spec2 * 0.16;
  if (age > 0.0 && age < 7.5) {
    col *= 1.0 - rippleElev * 0.20;
    col += uLight * max(rippleElev, 0.0) * 0.05;
  }
  float waterline = exp(-pow((dist - 2.42) * 8.0, 2.0)) * 0.03;
  col += uLight * waterline;
  float fres = smoothstep(5.0, 30.0, dist);
  col = mix(col, uSky, fres * 0.22);
  float alpha = mix(0.46, 0.68, fres);
  fragColor = vec4(col, alpha);
}`;

  const BG_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

  const BG_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uBottom;
uniform vec3 uGlow;
uniform vec2 uGlowPos;
uniform float uTime;
out vec4 fragColor;
void main() {
  float y = vUv.y;
  vec3 col = mix(uBottom, uTop, smoothstep(0.0, 1.0, y));
  float mid = exp(-pow((y - 0.52) * 2.6, 2.0));
  col = mix(col, uMid, mid * 0.48);
  float d = distance(vUv, uGlowPos);
  col += uGlow * exp(-d * d * 4.6) * 0.34;
  float d2 = distance(vUv, vec2(0.5, 0.48));
  col *= 1.0 - 0.26 * smoothstep(0.40, 1.05, d2);
  // very slight paper warmth at the bottom
  col = mix(col, col * vec3(1.015, 0.995, 0.965), smoothstep(0.5, 0.0, y) * 0.6);
  fragColor = vec4(col, 1.0);
}`;

  /* helpers ----------------------------------------------------- */
  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error('Shader compile failed: ' + log);
    }
    return s;
  }

  function makeProgram(gl, vsSrc, fsSrc) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error('Program link failed: ' + gl.getProgramInfoLog(p));
    }
    const uniforms = new Map();
    return {
      program: p,
      u(name) {
        if (!uniforms.has(name)) uniforms.set(name, gl.getUniformLocation(p, name));
        return uniforms.get(name);
      },
    };
  }

  function buffer(gl, data, usage) {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage || gl.STATIC_DRAW);
    return b;
  }

  function makeMesh(gl, geo) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const pos = buffer(gl, new Float32Array(geo.pos));
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    const nrm = buffer(gl, new Float32Array(geo.nrm));
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    let col = null;
    if (geo.col) {
      col = buffer(gl, new Float32Array(geo.col));
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);
    }
    gl.bindVertexArray(null);
    return { vao, pos, nrm, col, count: geo.pos.length / 3 };
  }

  function makeInstanced(gl, maxCount) {
    // unit cube, 36 verts, flat normals
    const geo = cubeGeometry(0, 0, 0, 1, 1, 1, [1, 1, 1]);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    buffer(gl, new Float32Array(geo.pos));
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    buffer(gl, new Float32Array(geo.nrm));
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    const inst = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, inst);
    gl.bufferData(gl.ARRAY_BUFFER, maxCount * 11 * 4, gl.DYNAMIC_DRAW);
    const stride = 11 * 4;
    const setup = (loc, size, offset) => {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset);
      gl.vertexAttribDivisor(loc, 1);
    };
    setup(3, 3, 0);
    setup(4, 3, 12);
    setup(5, 1, 24);
    setup(6, 1, 28);
    setup(7, 3, 32);
    gl.bindVertexArray(null);
    return { vao, inst, maxCount, count: geo.pos.length / 3, data: new Float32Array(maxCount * 11) };
  }

  function cubeGeometry(cx, cy, cz, sx, sy, sz, color) {
    const pos = [], nrm = [], col = [];
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const faces = [
      { n: [0, 0, 1], v: [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]] },
      { n: [0, 0, -1], v: [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]] },
      { n: [1, 0, 0], v: [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]] },
      { n: [-1, 0, 0], v: [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]] },
      { n: [0, 1, 0], v: [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz]] },
      { n: [0, -1, 0], v: [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]] },
    ];
    faces.forEach((f) => {
      const [a, b, c, d] = f.v;
      const tri = [a, b, c, a, c, d];
      tri.forEach((p) => {
        pos.push(p[0] + cx, p[1] + cy, p[2] + cz);
        nrm.push(f.n[0], f.n[1], f.n[2]);
        col.push(color[0], color[1], color[2]);
      });
    });
    return { pos, nrm, col };
  }

  /* renderer ---------------------------------------------------- */
  function createRenderer(canvas) {
    const gl = canvas.getContext('webgl2', {
      antialias: true,
      alpha: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    if (!gl) return null;

    const lit = makeProgram(gl, LIT_VS, LIT_FS);
    const inst = makeProgram(gl, INST_VS, LIT_FS);
    const glass = makeProgram(gl, GLASS_VS, GLASS_FS);
    const water = makeProgram(gl, WATER_VS, WATER_FS);
    const sprite = makeProgram(gl, SPRITE_VS, SPRITE_FS);
    const text = makeProgram(gl, SPRITE_VS, TEXT_FS);
    const bg = makeProgram(gl, BG_VS, BG_FS);

    // fullscreen triangle pair
    const bgVao = gl.createVertexArray();
    gl.bindVertexArray(bgVao);
    buffer(gl, new Float32Array([-1, -1, 3, -1, -1, 3]));
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    // unit quad, centred, uv 0..1
    const quad = {
      pos: [-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5],
      uv: [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1],
    };
    const quadVao = gl.createVertexArray();
    gl.bindVertexArray(quadVao);
    buffer(gl, new Float32Array(quad.pos));
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    buffer(gl, new Float32Array(quad.uv));
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    // billboards (glyph, petals, light shafts) are double sided
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);

    const state = {
      w: 1, h: 1, dpr: 1,
      viewProj: new Float32Array(16),
      eye: [0, 0, 1],
      viewDir: [0, 0, -1],
      lightDir: [0, 1, 0],
      lightColor: [1, 1, 1],
      ambient: [0.6, 0.6, 0.6],
      rimColor: [1, 1, 1],
      rim: 0.1,
      fogColor: [1, 1, 1],
      fog: 0,
      time: 0,
      bg: null,
    };

    function setBlend(mode) {
      if (mode === 'add') {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      } else if (mode === 'normal') {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      } else {
        gl.disable(gl.BLEND);
      }
    }

    function resize(cssW, cssH, dpr) {
      state.w = cssW;
      state.h = cssH;
      state.dpr = dpr;
      const w = Math.max(1, Math.round(cssW * dpr));
      const h = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
    }

    function setCamera(viewProj, eye, viewDir) {
      state.viewProj.set(viewProj);
      state.eye = eye;
      state.viewDir = viewDir;
    }

    function setLight(light) {
      state.lightDir = light.dir;
      state.lightColor = light.color;
      state.ambient = light.ambient;
      state.rimColor = light.rimColor || [1, 1, 1];
      state.rim = light.rim == null ? 0.12 : light.rim;
      state.fogColor = light.fogColor || [1, 1, 1];
      state.fog = light.fog || 0;
    }

    function clear() {
      gl.clearColor(0.957, 0.945, 0.914, 1);
      gl.depthMask(true);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    function drawBackground(colors) {
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      setBlend('none');
      gl.useProgram(bg.program);
      gl.uniform3fv(bg.u('uTop'), colors.top);
      gl.uniform3fv(bg.u('uMid'), colors.mid);
      gl.uniform3fv(bg.u('uBottom'), colors.bottom);
      gl.uniform3fv(bg.u('uGlow'), colors.glow);
      gl.uniform2fv(bg.u('uGlowPos'), colors.glowPos);
      gl.uniform1f(bg.u('uTime'), state.time);
      gl.bindVertexArray(bgVao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.depthMask(true);
      gl.enable(gl.DEPTH_TEST);
    }

    function setLitUniforms(p) {
      gl.uniformMatrix4fv(p.u('uViewProj'), false, state.viewProj);
      gl.uniform3fv(p.u('uLightDir'), state.lightDir);
      gl.uniform3fv(p.u('uLightColor'), state.lightColor);
      gl.uniform3fv(p.u('uAmbient'), state.ambient);
      gl.uniform3fv(p.u('uRimColor'), state.rimColor);
      gl.uniform1f(p.u('uRim'), state.rim);
      gl.uniform3fv(p.u('uViewDir'), state.viewDir);
      gl.uniform3fv(p.u('uFogColor'), state.fogColor);
      gl.uniform1f(p.u('uFog'), state.fog);
    }

    function drawMesh(mesh, model, opts) {
      const o = opts || {};
      gl.useProgram(lit.program);
      setLitUniforms(lit);
      gl.uniformMatrix4fv(lit.u('uModel'), false, model);
      gl.uniform3fv(lit.u('uTint'), o.tint || [1, 1, 1]);
      gl.uniform1f(lit.u('uTintMix'), o.tintMix || 0);
      gl.uniform1f(lit.u('uTintMul'), o.tintMul || 0);
      gl.uniform1f(lit.u('uEmissive'), o.emissive || 0);
      gl.uniform1f(lit.u('uOpacity'), o.opacity == null ? 1 : o.opacity);
      gl.uniform1f(lit.u('uDim'), o.dim == null ? 1 : o.dim);
      gl.uniform1f(lit.u('uGhost'), o.ghost ? 1 : 0);
      gl.uniform1f(lit.u('uWave'), o.wave || 0);
      gl.uniform1f(lit.u('uWaveTime'), state.time);
      gl.bindVertexArray(mesh.vao);
      const op = o.opacity == null ? 1 : o.opacity;
      if (o.ghost) {
        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);
        setBlend('normal');
      } else if (op < 0.999) {
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(true);
        setBlend('normal');
      } else {
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(true);
        setBlend('none');
      }
      gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
      if (o.ghost) gl.enable(gl.DEPTH_TEST);
    }

    function drawInstances(instanceMesh, count, model, opts) {
      const o = opts || {};
      gl.useProgram(inst.program);
      setLitUniforms(inst);
      gl.uniformMatrix4fv(inst.u('uModel'), false, model);
      gl.uniform3fv(inst.u('uTint'), [1, 1, 1]);
      gl.uniform1f(inst.u('uTintMix'), 0);
      gl.uniform1f(inst.u('uTintMul'), 0);
      gl.uniform1f(inst.u('uEmissive'), o.emissive || 0);
      gl.uniform1f(inst.u('uOpacity'), o.opacity == null ? 1 : o.opacity);
      gl.uniform1f(inst.u('uDim'), o.dim == null ? 1 : o.dim);
      gl.uniform1f(inst.u('uGhost'), o.ghost ? 1 : 0);
      gl.uniform1f(inst.u('uWave'), o.wave || 0);
      gl.uniform1f(inst.u('uWaveTime'), state.time);
      gl.bindBuffer(gl.ARRAY_BUFFER, instanceMesh.inst);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, instanceMesh.data.subarray(0, count * 11));
      gl.bindVertexArray(instanceMesh.vao);
      const op = o.opacity == null ? 1 : o.opacity;
      if (o.ghost) {
        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);
        setBlend('normal');
      } else if (op < 0.999) {
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(true);
        setBlend('normal');
      } else {
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(true);
        setBlend('none');
      }
      gl.drawArraysInstanced(gl.TRIANGLES, 0, instanceMesh.count, count);
      if (o.ghost) gl.enable(gl.DEPTH_TEST);
    }

    function drawGlass(mesh, model, color, alpha) {
      gl.useProgram(glass.program);
      gl.uniformMatrix4fv(glass.u('uViewProj'), false, state.viewProj);
      gl.uniformMatrix4fv(glass.u('uModel'), false, model);
      gl.uniform3fv(glass.u('uColor'), color);
      gl.uniform1f(glass.u('uAlpha'), alpha);
      gl.uniform3fv(glass.u('uViewDir'), state.viewDir);
      gl.uniform1f(glass.u('uTime'), state.time);
      gl.bindVertexArray(mesh.vao);
      setBlend('normal');
      gl.depthMask(false);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
      gl.depthMask(true);
    }

    function drawWater(model, colors) {
      gl.useProgram(water.program);
      gl.uniformMatrix4fv(water.u('uViewProj'), false, state.viewProj);
      gl.uniformMatrix4fv(water.u('uModel'), false, model);
      gl.uniform1f(water.u('uTime'), state.time);
      gl.uniform3fv(water.u('uDeep'), colors.deep);
      gl.uniform3fv(water.u('uShallow'), colors.shallow);
      gl.uniform3fv(water.u('uSky'), colors.sky);
      gl.uniform3fv(water.u('uLight'), colors.light);
      gl.uniform2fv(water.u('uRippleCenter'), colors.rippleCenter);
      gl.uniform1f(water.u('uRippleAge'), colors.rippleAge);
      gl.uniform1f(water.u('uRippleStrength'), colors.rippleStrength);
      gl.uniform4fv(water.u('uLandRipples[0]'), colors.landRipples || new Float32Array(12));
      gl.bindVertexArray(quadVao);
      setBlend('normal');
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function drawSprite(tex, model, color, alpha, mode) {
      gl.useProgram(sprite.program);
      gl.uniformMatrix4fv(sprite.u('uViewProj'), false, state.viewProj);
      gl.uniformMatrix4fv(sprite.u('uModel'), false, model);
      gl.uniform4f(sprite.u('uColor'), color[0], color[1], color[2], alpha);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex.texture);
      gl.uniform1i(sprite.u('uTex'), 0);
      gl.bindVertexArray(quadVao);
      setBlend(mode || 'normal');
      gl.depthMask(false);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.depthMask(true);
    }

    function drawText(tex, model, top, mid, bottom, alpha, fade) {
      gl.useProgram(text.program);
      gl.uniformMatrix4fv(text.u('uViewProj'), false, state.viewProj);
      gl.uniformMatrix4fv(text.u('uModel'), false, model);
      gl.uniform3fv(text.u('uColorTop'), top);
      gl.uniform3fv(text.u('uColorMid'), mid);
      gl.uniform3fv(text.u('uColorBottom'), bottom);
      gl.uniform1f(text.u('uAlpha'), alpha);
      gl.uniform1f(text.u('uFade'), fade == null ? 0.55 : fade);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex.texture);
      gl.uniform1i(text.u('uTex'), 0);
      gl.bindVertexArray(quadVao);
      setBlend('normal');
      gl.depthMask(false);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function setDepth(write, test) {
      gl.depthMask(write);
      if (test) gl.enable(gl.DEPTH_TEST);
      else gl.disable(gl.DEPTH_TEST);
    }

    function makeTexture(source, opts) {
      const o = opts || {};
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      if (o.mipmap) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.generateMipmap(gl.TEXTURE_2D);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      return { texture: t, width: source.width, height: source.height };
    }

    return {
      gl,
      state,
      resize,
      setCamera,
      setLight,
      clear,
      drawBackground,
      drawMesh,
      drawInstances,
      drawGlass,
      drawWater,
      drawSprite,
      drawText,
      setDepth,
      makeTexture,
      makeMesh: (geo) => makeMesh(gl, geo),
      makeInstanced: (max) => makeInstanced(gl, max),
      quadVao,
      cubeGeometry,
    };
  }

  S4.gl = { createRenderer, cubeGeometry };
})();
