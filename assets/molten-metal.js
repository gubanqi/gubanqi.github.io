// MoltenMetal: native WebGL2 adaptation of the user-provided React Bits source.
// The supplied vertex and fragment shaders are unchanged.
(() => {
const hexToRgb = hex => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1];
  return [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255];
};

const colorModeToFloat = mode => (mode === 'ember' ? 1 : mode === 'frost' ? 2 : 0);

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uScale;
uniform float uDetail;
uniform float uGlow;
uniform float uCoreSize;
uniform float uSwirl;
uniform float uFold;
uniform float uBlackPoint;
uniform float uBrightness;
uniform float uColorMode;
uniform float uGrain;
uniform float uGrainIntensity;
uniform float uOpacity;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform bool uEnableMouse;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uBackgroundColor;
uniform bool uLightMode;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  float time = iTime * uSpeed;
  vec2 p = uScale * ((gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y) - 0.5;

  vec2 drift = vec2(0.0);
  if (uEnableMouse) {
    drift = (uMouse - 0.5) * uMouseStrength * 2.0;
  }
  p += drift;

  vec2 i = p;
  float c = 0.0;
  float r = length(p + vec2(sin(time), sin(time * 0.3 + 5.0)) * 0.5);
  float d = length(p);
  float rot = d + time + p.x * uSwirl;

  float cosRot = cos(rot);
  mat2 warp = mat2(cos(rot - sin(time / 5.0)), sin(rot), -sin(cosRot - time), cosRot) * uFold;
  float glowCore = uGlow * uCoreSize;

  for (float n = 0.0; n < 8.0; n++) {
    if (n >= uDetail) break;
    p *= warp;
    float t = r - time / (n + 3.0);
    i -= p + vec2(cos(t - i.x - r) + sin(t + i.y), sin(t - i.y) + cos(t + i.x) + r);
    c += glowCore / length(vec2(sin(i.x + t), cos(i.y + t)));
  }

  c /= 6.0;

  float intensity = max(c - uBlackPoint, 0.0) * uBrightness;

  float g = clamp(intensity, 0.0, 1.0);

  float mid = 0.5;
  if (uColorMode > 1.5) {
    mid = 0.65;
  } else if (uColorMode > 0.5) {
    mid = 0.35;
  }

  vec3 col = mix(uColor1, uColor2, smoothstep(0.0, mid, g));
  col = mix(col, uColor3, smoothstep(mid, 1.0, g));

  float a = g;
  if (uGrain > 0.5) {
    float gr = hash(gl_FragCoord.xy + iTime);
    a += (gr - 0.5) * uGrainIntensity;
  }
  a = clamp(a, 0.0, 1.0) * uOpacity;
  if (uLightMode) {
    float signal = 1.0 - exp(-max(c, 0.0) * 6.5);
    float body = smoothstep(0.075, 0.68, signal);
    float ridge = smoothstep(0.42, 0.92, signal);

    vec3 lightCol = mix(uColor1, uColor2, smoothstep(0.08, 0.52, signal));
    lightCol = mix(lightCol, uColor3, smoothstep(0.52, 0.96, signal));
    lightCol = mix(lightCol, lightCol * 0.72, ridge * 0.24);

    float coverage = body * mix(0.2, 0.86, signal) * uOpacity;
    if (uGrain > 0.5) {
      float gr = hash(gl_FragCoord.xy + iTime);
      coverage += (gr - 0.5) * uGrainIntensity * body * 0.16;
    }
    fragColor = vec4(mix(uBackgroundColor, lightCol, clamp(coverage, 0.0, 0.92)), 1.0);
  } else {
    fragColor = vec4(col * a, a);
  }
}
`;

const root = document.getElementById('molten-wallpaper');
if (!root) return;
const canvas = document.createElement('canvas');
let gl;
try {
  gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
} catch {
  return;
}
if (!gl) return;
const compile = (type, source) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
};
const vertexShader = compile(gl.VERTEX_SHADER, vertex);
const fragmentShader = compile(gl.FRAGMENT_SHADER, fragment);
if (!vertexShader || !fragmentShader) {
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  return;
}
const program = gl.createProgram();
if (!program) {
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  return;
}
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.bindAttribLocation(program, 0, 'position');
gl.linkProgram(program);
gl.deleteShader(vertexShader);
gl.deleteShader(fragmentShader);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  gl.deleteProgram(program);
  return;
}
const buffer = gl.createBuffer();
if (!buffer) {
  gl.deleteProgram(program);
  return;
}
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
gl.useProgram(program);
const uniforms = {};
for (const name of ['iResolution', 'iTime', 'uMouse', 'uEnableMouse']) {
  uniforms[name] = gl.getUniformLocation(program, name);
}
// All values below match the user's MoltenMetal usage example.
for (const [name, value] of Object.entries({ uSpeed: 0.35, uScale: 4, uDetail: 3, uGlow: 1.6, uCoreSize: 0.1, uSwirl: 1, uFold: -0.2, uBlackPoint: 0.05, uBrightness: 1.3, uColorMode: colorModeToFloat('molten'), uGrain: 1, uGrainIntensity: 0.05, uMouseStrength: 0.3, uOpacity: 1 })) {
  gl.uniform1f(gl.getUniformLocation(program, name), value);
}
for (const [name, color] of Object.entries({ uColor1: '#5227FF', uColor2: '#FF9FFC', uColor3: '#FFFFFF', uBackgroundColor: '#FFFFFF' })) {
  gl.uniform3fv(gl.getUniformLocation(program, name), hexToRgb(color));
}
gl.uniform1i(gl.getUniformLocation(program, 'uLightMode'), 0);
root.appendChild(canvas);

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const isPaused = () => document.documentElement.dataset.motionPaused === 'true' || Boolean(document.querySelector('dialog[open]'));
const mouse = [0.5, 0.5];
const targetMouse = [0.5, 0.5];
let active = true;
let raf = 0;
let last = 0;
let elapsed = 0;

const draw = () => {
  if (!active || gl.isContextLost()) return;
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);
  gl.uniform2f(uniforms.iResolution, canvas.width, canvas.height);
  gl.uniform1f(uniforms.iTime, reduce.matches ? 0 : elapsed);
  gl.uniform2f(uniforms.uMouse, reduce.matches ? 0.5 : mouse[0], reduce.matches ? 0.5 : mouse[1]);
  gl.uniform1i(uniforms.uEnableMouse, reduce.matches ? 0 : 1);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
};
const loop = now => {
  raf = 0;
  if (!active || document.hidden || reduce.matches || isPaused()) return;
  elapsed += Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  mouse[0] += 0.05 * (targetMouse[0] - mouse[0]);
  mouse[1] += 0.05 * (targetMouse[1] - mouse[1]);
  draw();
  raf = requestAnimationFrame(loop);
};
const start = () => {
  if (!active || raf || document.hidden || reduce.matches || isPaused()) return;
  last = performance.now();
  raf = requestAnimationFrame(loop);
};
const stop = () => {
  cancelAnimationFrame(raf);
  raf = 0;
};
const resize = () => {
  if (!active) return;
  const rect = root.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  draw();
};
new ResizeObserver(resize).observe(root);
window.addEventListener('resize', resize);
window.addEventListener('pointermove', event => {
  if (reduce.matches || isPaused() || event.pointerType === 'touch') return;
  const rect = root.getBoundingClientRect();
  targetMouse[0] = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  targetMouse[1] = 1 - Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
}, { passive: true });
const resetMouse = () => { targetMouse[0] = targetMouse[1] = 0.5; };
window.addEventListener('pointerout', event => { if (!event.relatedTarget) resetMouse(); }, { passive: true });
window.addEventListener('blur', resetMouse);
document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });
document.addEventListener('motionchange', () => { stop(); if (reduce.matches) draw(); start(); });
reduce.addEventListener('change', () => {
  stop();
  resetMouse();
  mouse[0] = mouse[1] = 0.5;
  draw();
  start();
});
canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  active = false;
  stop();
  root.removeAttribute('data-ready');
  // ponytail: the deep-blue fallback stays usable; reload rebuilds GPU resources.
});
resize();
root.dataset.ready = '';
start();

})();
