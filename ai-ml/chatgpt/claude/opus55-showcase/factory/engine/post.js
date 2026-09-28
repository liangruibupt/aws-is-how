// post.js — 后期：MSAA 场景目标（带深度纹理）→ 景深 → 泛光（输入钳制）→ AgX + 调色 + 暗角 + 颗粒 + 闪白 / 叠化 → 屏幕或目标
// 分几次叠画（如玻璃折射）：每次 renderer.render 结束，three 把 sceneRT 的多重采样缓冲解析到 sceneRT.texture / depthTexture，
// 多重采样缓冲本身保留（three 只在 Oculus 浏览器上作废它）。所以下一遍可以关掉 autoClear 接着往 sceneRT 画，同时采样上一遍解析出的颜色和深度
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

export const POST_DEFAULTS = {
  exposure: 1,
  focus: 0.5, aperture: 0, maxBlur: 0.012,          // 对焦距离（米）；景深强度（0 = 关）；最大弥散圆半径（画面短边比例）
  bloom: { strength: 0.22, radius: 0.45, threshold: 0.85 },
  lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1, 1, 1], saturation: 1,
  vignette: 0.22, grain: 0.03, flashColor: [1, 0.98, 0.94],
};
/** 后期参数逐层覆盖：默认 → 世界 → 镜头；bloom 按字段合并 */
export const mergePost = (...xs) => xs.reduce((a, x) => (x ? { ...a, ...x, bloom: { ...a.bloom, ...x.bloom } } : a), POST_DEFAULTS);

const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const quad = (fragmentShader, uniforms) => new FullScreenQuad(new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false }));

const DOF = /* glsl */`
uniform sampler2D tColor, tDepth; uniform vec2 res; uniform float focus, aperture, maxR, near, far; uniform int taps;
varying vec2 vUv;
float lin(float d) { return near * far / (far - d * (far - near)); }
float coc(float z) { return clamp(aperture * abs(1.0 - focus / z), 0.0, 1.0) * maxR; }
void main() {
  float z0 = lin(texture2D(tDepth, vUv).x), c0 = coc(z0);
  vec3 acc = texture2D(tColor, vUv).rgb; float ws = 1.0;
  if (maxR > 0.5 && aperture > 0.0) for (int i = 0; i < 64; i++) {
    if (i >= taps) break;
    float fi = float(i) + 0.5, r = sqrt(fi / float(taps)) * maxR, a = fi * 2.39996323;    // 黄金角螺旋采样
    vec2 uv = vUv + vec2(cos(a), sin(a)) * r / res;
    float z = lin(texture2D(tDepth, uv).x), c = coc(z);
    if (z > z0) c = min(c, c0);                        // 背后的虚化不溢到清晰的前景上
    float w = clamp(c - r + 1.0, 0.0, 1.0);
    acc += texture2D(tColor, uv).rgb * w; ws += w;
  }
  gl_FragColor = vec4(acc / ws, 1.0);
}`;

// AgX 取自 three 0.170 的 tonemapping_pars_fragment（输入输出都是线性 sRGB）
const GRADE = /* glsl */`
uniform sampler2D tDiffuse, tPrev; uniform vec2 res;
uniform float exposure, saturation, vignette, grain, seed, flash, mixK;
uniform vec3 lift, gamma, gain, flashColor;
varying vec2 vUv;
const mat3 S2R = mat3(vec3(0.6274, 0.0691, 0.0164), vec3(0.3293, 0.9195, 0.0880), vec3(0.0433, 0.0113, 0.8956));
const mat3 R2S = mat3(vec3(1.6605, -0.1246, -0.0182), vec3(-0.5876, 1.1329, -0.1006), vec3(-0.0728, -0.0083, 1.1187));
const mat3 INSET = mat3(vec3(0.856627153315983, 0.137318972929847, 0.11189821299995), vec3(0.0951212405381588, 0.761241990602591, 0.0767994186031903), vec3(0.0482516061458583, 0.101439036467562, 0.811302368396859));
const mat3 OUTSET = mat3(vec3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826), vec3(-0.11060664309660323, 1.157823702216272, -0.11060664309660294), vec3(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405));
vec3 agx(vec3 c) {
  c = INSET * (S2R * c);
  c = clamp((log2(max(c, 1e-10)) + 12.47393) / 16.5, 0.0, 1.0);
  vec3 x2 = c * c, x4 = x2 * x2;
  c = 15.5 * x4 * x2 - 40.14 * x4 * c + 31.96 * x4 - 6.868 * x2 * c + 0.4298 * x2 + 0.1191 * c - 0.00232;
  return clamp(R2S * pow(max(OUTSET * c, 0.0), vec3(2.2)), 0.0, 1.0);
}
vec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
float hash(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
void main() {
  vec3 c = agx(texture2D(tDiffuse, vUv).rgb * exposure);
  c = mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, saturation);
  c = pow(max(c * gain + lift * (1.0 - c), 0.0), 1.0 / gamma);
  float r = length(vUv - 0.5) * 1.4142;
  c *= 1.0 - vignette * smoothstep(0.3, 1.05, r);
  c = srgb(clamp(c, 0.0, 1.0));
  c += (hash(gl_FragCoord.xy + seed * 61.7) - 0.5) * grain;
  c = mix(c, flashColor, flash);
  c = mix(texture2D(tPrev, vUv).rgb, c, mixK);
  gl_FragColor = vec4(c, 1.0);
}`;

export function createPost(renderer) {
  const sceneRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(1, 1) });
  const dofRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  const prevRT = new THREE.WebGLRenderTarget(1, 1);                   // 叠化时上一镜头的成品（已编码 sRGB）
  const dof = quad(DOF, { tColor: { value: null }, tDepth: { value: null }, res: { value: new THREE.Vector2() }, focus: { value: 1 }, aperture: { value: 0 }, maxR: { value: 0 }, near: { value: 0.01 }, far: { value: 100 }, taps: { value: 32 } });
  const U = { tDiffuse: { value: dofRT.texture }, tPrev: { value: null }, res: { value: new THREE.Vector2() }, seed: { value: 0 }, flash: { value: 0 }, mixK: { value: 1 } };
  for (const k of ['exposure', 'saturation', 'vignette', 'grain']) U[k] = { value: 0 };
  for (const k of ['lift', 'gamma', 'gain', 'flashColor']) U[k] = { value: new THREE.Vector3() };
  const grade = quad(GRADE, U);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.2, 0.4, 0.85);
  // 泛光输入钳制：玻璃棱边与金属件的针尖高光可达上百倍 HDR，不钳制会被放大成整片光晕（同 02）
  const hp = bloom.materialHighPassFilter, TEX = 'vec4 texel = texture2D( tDiffuse, vUv );';
  if (!hp.fragmentShader.includes(TEX)) throw new Error('post: UnrealBloomPass high-pass shader changed');
  hp.fragmentShader = hp.fragmentShader.replace(TEX, `${TEX}\n\ttexel.rgb *= min( 1.0, 6.0 / max( 1e-4, max( texel.r, max( texel.g, texel.b ) ) ) );`);
  hp.needsUpdate = true;
  const black = new THREE.DataTexture(new Uint8Array(4), 1, 1); black.needsUpdate = true;

  const post = {
    sceneRT, prevRT, taps: 32, W: 1, H: 1,
    setSize(W, H) {
      post.W = W; post.H = H;
      for (const rt of [sceneRT, dofRT, prevRT]) rt.setSize(W, H);
      bloom.setSize(W, H); U.res.value.set(W, H); dof.material.uniforms.res.value.set(W, H);
    },
    /** sceneRT → 景深 → 泛光 → 调色 → target（null = 画布）；prev / k = 叠化；flash = 闪白 0..1；t 决定颗粒 */
    render({ camera, settings: P, t, target = null, prev = null, k = 1, flash = 0 }) {
      const d = dof.material.uniforms;
      d.tColor.value = sceneRT.texture; d.tDepth.value = sceneRT.depthTexture;
      d.focus.value = P.focus; d.aperture.value = P.aperture; d.maxR.value = P.maxBlur * Math.min(post.W, post.H);
      d.near.value = camera.near; d.far.value = camera.far; d.taps.value = post.taps;
      renderer.setRenderTarget(dofRT); dof.render(renderer);
      bloom.strength = P.bloom.strength; bloom.radius = P.bloom.radius; bloom.threshold = P.bloom.threshold;
      if (P.bloom.strength > 0) bloom.render(renderer, null, dofRT, 0, false);
      U.exposure.value = P.exposure; U.saturation.value = P.saturation; U.vignette.value = P.vignette; U.grain.value = P.grain;
      U.lift.value.fromArray(P.lift); U.gamma.value.fromArray(P.gamma); U.gain.value.fromArray(P.gain); U.flashColor.value.fromArray(P.flashColor);
      U.seed.value = Math.round(t * 60) % 997; U.flash.value = flash;
      U.tPrev.value = prev ?? black; U.mixK.value = prev ? k : 1;
      renderer.setRenderTarget(target); grade.render(renderer);
    },
  };
  return post;
}
