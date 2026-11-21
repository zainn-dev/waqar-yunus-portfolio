import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { gsap } from '@/lib/gsap';
import { brandIcons } from '@/lib/icons';

/*
 * Social icons rebuilt from shaded particles.
 * Each icon's SVG path is rasterised once, sampled into N points and given depth.
 * All shapes share the same particle count, so switching platforms is a per-particle
 * morph (aFrom → aTo) with staggered timing: each particle leaves the old icon for the glass
 * tube around the stage, rides round the glass (lit up, like water on the inside of a jar),
 * then drops into the new icon.
 */

const SIZE = 3.4; // world units across
const DEPTH = 0.75;
/** the glass tube: radius, and its bottom / top in world y (it stands on the second tier) */
const GLASS_R = 2.3;
const GLASS_Y0 = 0.44;
const GLASS_Y1 = 5.2;
/** the particles' group sits this high; wall heights are local to it */
const GROUP_Y = 2.3;
const WALL_LO = GLASS_Y0 + 0.25 - GROUP_Y;
const WALL_HI = GLASS_Y1 - 0.9 - GROUP_Y;
/** morph timing: particle i starts at aRand·STAGGER of the way through and takes SPAN of it */
const STAGGER = 0.4;
const SPAN = 0.6;
const MORPH_S = 2.9;
const RIBBONS = 5;
/** cursor bursts: how many recent cursor spots the shader remembers, and how long one lasts (s) */
const HITS = 24;
const BURST_S = 2.4;

const smooth = (a: number, b: number, x: number) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
const fract = (x: number) => x - Math.floor(x);

/** Where a particle is at morph progress p (mirrors the vertex shader, without the idle wobble). */
function morphAt(from: ArrayLike<number>, to: ArrayLike<number>, i: number, r: number, p: number, out: number[]) {
  const t = Math.min(Math.max((p - r * STAGGER) / SPAN, 0), 1);
  const s = fract(r * 7.31 + 0.13);
  const o = smooth(0, 0.3, t);
  const n = smooth(0.66, 1, t);
  const th = s * Math.PI * 2 + t * 2.6;
  // RIBBONS wavy streams wind round the glass; each particle rides one of them
  const lane = Math.floor(fract(r * 3.17 + 0.41) * RIBBONS);
  const across = (fract(r * 13.7 + 0.29) - 0.5) * 0.32;
  const base = WALL_LO + ((lane + 0.5) / RIBBONS) * (WALL_HI - WALL_LO);
  const wy = Math.min(Math.max(base + Math.sin(th * 1.3 + lane * 1.7) * 0.85 + across, WALL_LO), WALL_HI);
  const wall = [Math.cos(th) * GLASS_R, wy, Math.sin(th) * GLASS_R];
  for (let a = 0; a < 3; a++) {
    const f = from[i * 3 + a];
    const m = f + (wall[a] - f) * o;
    out[a] = m + (to[i * 3 + a] - m) * n;
  }
}

function sampleIcon(key: string, n: number): Float32Array {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const icon = brandIcons[key];
  ctx.fillStyle = '#fff';
  if (icon) {
    ctx.setTransform(S / 24, 0, 0, S / 24, 0, 0);
    ctx.fill(new Path2D(icon.path));
  } else {
    ctx.font = `700 ${S * 0.7}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(key.slice(0, 2).toUpperCase(), S / 2, S / 2);
  }
  const data = ctx.getImageData(0, 0, S, S).data;
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < S && y < S && data[(y * S + x) * 4 + 3] > 128;
  const filled: number[] = [];
  const edges: number[] = [];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (!on(x, y)) continue;
      const i = y * S + x;
      filled.push(i);
      if (!on(x - 2, y) || !on(x + 2, y) || !on(x, y - 2) || !on(x, y + 2)) edges.push(i);
    }
  }
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    // ~35% of particles trace the outline so strokes read crisply; the rest fill the body.
    const pool = edges.length && Math.random() < 0.35 ? edges : filled;
    const idx = pool[(Math.random() * pool.length) | 0] ?? 0;
    const px = (idx % S) + Math.random();
    const py = Math.floor(idx / S) + Math.random();
    out[i * 3] = (px / S - 0.5) * SIZE;
    out[i * 3 + 1] = -(py / S - 0.5) * SIZE;
    // Most particles sit near the front/back faces, giving the shape a solid, extruded volume.
    const face = Math.random() < 0.7 ? Math.sign(Math.random() - 0.5) : (Math.random() - 0.5) * 2;
    out[i * 3 + 2] = face * DEPTH * 0.5 * (0.85 + Math.random() * 0.15);
  }
  return out;
}

const vertex = /* glsl */ `
attribute vec3 aFrom; attribute vec3 aTo; attribute float aRand;
uniform float uProgress; uniform float uTime; uniform float uSize; uniform float uPixelRatio; uniform vec4 uHits[${HITS}];
varying float vRand; varying float vDepth; varying float vGlow;
void main(){
  // old icon → the glass wall → round the glass → new icon (morphAt() mirrors this)
  float t = clamp((uProgress - aRand * ${STAGGER.toFixed(3)}) / ${SPAN.toFixed(3)}, 0., 1.);
  float s = fract(aRand * 7.31 + 0.13);
  float o = smoothstep(0.0, 0.3, t);
  float n = smoothstep(0.66, 1.0, t);
  float th = s * 6.2831853 + t * 2.6;
  float lane = floor(fract(aRand * 3.17 + 0.41) * ${RIBBONS.toFixed(1)});
  float across = (fract(aRand * 13.7 + 0.29) - 0.5) * 0.32;
  float base = ${WALL_LO.toFixed(3)} + (lane + 0.5) / ${RIBBONS.toFixed(1)} * ${(WALL_HI - WALL_LO).toFixed(3)};
  float wy = clamp(base + sin(th * 1.3 + lane * 1.7) * 0.85 + across, ${WALL_LO.toFixed(3)}, ${WALL_HI.toFixed(3)});
  vec3 wall = vec3(cos(th) * ${GLASS_R.toFixed(3)}, wy, sin(th) * ${GLASS_R.toFixed(3)});
  vec3 pos = mix(mix(aFrom, wall, o), aTo, n);
  float fly = o * (1.0 - n);
  // on the glass the particles stream a little, like water
  pos.y += sin(uTime * 1.7 + s * 40.0) * 0.05 * fly;
  // breathing
  pos *= 1.0 + sin(uTime * 1.3) * 0.012;
  pos += vec3(sin(uTime*1.1+aRand*23.), cos(uTime*.9+aRand*31.), sin(uTime*.7+aRand*13.)) * 0.012;
  // a few loose particles drift off the edges and come back
  float loose = step(0.985, aRand);
  float ph = fract(uTime * 0.08 + aRand * 37.0);
  pos += loose * vec3(sin(aRand*91.)*0.9, 0.7 + cos(aRand*57.)*0.4, sin(aRand*13.)*0.6) * ph * (1.0 - fly);
  // the cursor bursts the icon: around each recent cursor spot (xyz, w = when; group-local) the
  // particles blow out onto the glass, away from the cursor, ride it lit up, then fall back in
  float burst = 0.0; vec2 bdir = vec2(0.0, 1.0); float bage = 0.0;
  for (int i = 0; i < ${HITS}; i++) {
    vec4 h = uHits[i];
    float age = uTime - h.w - aRand * 0.22;
    if (age < 0.0 || age > ${BURST_S.toFixed(2)}) continue;
    vec2 dv = pos.xy - h.xy;
    float f = smoothstep(1.7, 0.35, length(dv)) * smoothstep(0.0, 0.38, age) * (1.0 - smoothstep(1.0, ${BURST_S.toFixed(2)}, age));
    if (f > burst) { burst = f; bdir = normalize(dv + 1e-4); bage = age; }
  }
  float bglow = 0.0;
  if (burst > 0.0) {
    // the torn part is smeared onto the glass as a sheet: it wraps round the tube at about the
    // height it came from (so it still reads as a piece of the icon), then slides on sideways,
    // away from the cursor. A few go to the back of the tube.
    float side = sign(bdir.x + 1e-3);
    float bt = 1.5707963 - pos.x / ${GLASS_R.toFixed(3)} * 1.35 + (s - 0.5) * 0.35 - bage * 0.9 * side + (s < 0.18 ? 3.1415927 : 0.0);
    float by = clamp(pos.y * 0.8 + bdir.y * 0.5 + bage * 0.15 + sin(bt * 3.0 + s * 7.0) * 0.18, ${WALL_LO.toFixed(3)}, ${WALL_HI.toFixed(3)});
    vec3 bw = vec3(cos(bt) * ${GLASS_R.toFixed(3)}, by, sin(bt) * ${GLASS_R.toFixed(3)});
    float e = burst * burst * (3.0 - 2.0 * burst);
    pos = mix(pos, bw, e);
    // a mix of lit-up and still-dark particles on the glass
    bglow = e * (s > 0.42 ? 1.0 : 0.22);
  }
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.75 + aRand * 0.55) * (1.0 - fly * 0.3) * uPixelRatio * (8.0 / -mv.z);
  vRand = aRand; vDepth = pos.z * (1.0 - fly); vGlow = max(smoothstep(0.0, 0.4, fly), bglow);
}`;

const fragment = /* glsl */ `
uniform vec3 uFog;
varying float vRand; varying float vDepth; varying float vGlow;
void main(){
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(c, c);
  if (r2 > 1.0) discard;
  vec3 n = vec3(c.x, -c.y, sqrt(1.0 - r2));
  vec3 L = normalize(vec3(-0.45, 0.75, 0.55));
  float diff = max(dot(n, L), 0.0);
  float spec = pow(max(dot(reflect(-L, n), vec3(0,0,1)), 0.0), 24.0);
  vec3 dark = vec3(0.10, 0.11, 0.14);
  vec3 light = vec3(0.58, 0.62, 0.68);
  vec3 col = mix(dark, light, diff * (0.75 + vRand * 0.3));
  col += spec * 0.45;
  col *= 0.82 + clamp(vDepth * 1.4, -0.25, 0.25);   // back particles slightly darker
  col = mix(col, uFog, 0.05);
  // riding the glass: lit up, icy white
  col = mix(col, vec3(0.93, 0.97, 1.0) + spec * 0.08, vGlow);
  gl_FragColor = vec4(col, 1.0);
}`;

type PointerState = { x: number; y: number; inside: boolean; drag: number; dragging: boolean };

function Particles({ shapes, index, count, pointer }: {
  shapes: string[]; index: number; count: number; pointer: React.MutableRefObject<PointerState>;
}) {
  const ray = useMemo(() => ({ rc: new THREE.Raycaster(), plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit: new THREE.Vector3(), v: new THREE.Vector2(), inv: new THREE.Matrix4() }), []);
  const group = useRef<THREE.Group>(null);
  const { gl } = useThree();
  const targets = useMemo(() => shapes.map((s) => sampleIcon(s, count)), [shapes, count]);
  const rand = useMemo(() => Float32Array.from({ length: count }, () => Math.random()), [count]);
  // recent cursor spots on the icon (ring buffer), for the burst
  const hits = useMemo(() => Array.from({ length: HITS }, () => new THREE.Vector4(0, 0, 0, -99)), []);
  const hitAt = useRef(0);
  const spin = useRef(0);
  const spinSpeed = useRef(0.42);
  const overIcon = useRef(false);

  // The icon the particles fly to first: whatever is selected when the geometry is (re)built.
  const indexRef = useRef(index);
  indexRef.current = index;

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const shown = Math.min(indexRef.current, targets.length - 1);
    const start = targets[shown];
    // Start scattered so the first icon assembles itself.
    const scattered = new Float32Array(count * 3).map((_, i) => (i % 3 === 1 ? (Math.random() - 0.2) * 6 : (Math.random() - 0.5) * 9));
    g.setAttribute('position', new THREE.BufferAttribute(start.slice(), 3));
    g.setAttribute('aFrom', new THREE.BufferAttribute(scattered, 3));
    g.setAttribute('aTo', new THREE.BufferAttribute(start.slice(), 3));
    g.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6);
    g.userData.shown = shown; // which icon `aTo` currently holds
    return g;
  }, [targets, rand, count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: {
          uProgress: { value: 0 },
          uTime: { value: 0 },
          uSize: { value: 4.0 },
          uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
          uFog: { value: new THREE.Color('#c3c8cf') },
          uHits: { value: hits },
        },
      }),
    [gl, hits],
  );

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  // Fresh geometry always starts from the scattered cloud.
  useEffect(() => { material.uniforms.uProgress.value = 0; }, [geometry, material]);

  /*
   * Morph to the selected icon. This effect is idempotent: it retargets only when `aTo` holds a
   * different icon, and it (re)starts the tween whenever the morph isn't finished. That keeps it
   * correct under StrictMode's double-invoked effects and after any cleanup that killed a tween
   * mid-flight — previously either case could leave the particles scattered with no logo.
   */
  useEffect(() => {
    const u = material.uniforms.uProgress;
    if (geometry.userData.shown === index) {
      if (u.value >= 1) return;
      const first = u.value === 0;
      const tw = gsap.to(u, { value: 1, duration: (first ? 3.2 : MORPH_S) * (1 - u.value), ease: 'none', delay: first ? 0.2 : 0 });
      return () => { tw.kill(); };
    }
    const from = geometry.getAttribute('aFrom') as THREE.BufferAttribute;
    const to = geometry.getAttribute('aTo') as THREE.BufferAttribute;
    // Freeze where each particle is right now (mirrors the shader without the idle wobble).
    const p = u.value as number;
    const fa = from.array as Float32Array;
    const ta = to.array as Float32Array;
    const at = [0, 0, 0];
    for (let i = 0; i < count; i++) {
      morphAt(fa, ta, i, rand[i], p, at);
      fa[i * 3] = at[0]; fa[i * 3 + 1] = at[1]; fa[i * 3 + 2] = at[2];
    }
    (to.array as Float32Array).set(targets[index]);
    from.needsUpdate = true;
    to.needsUpdate = true;
    u.value = 0;
    geometry.userData.shown = index;
    const tw = gsap.to(u, { value: 1, duration: MORPH_S, ease: 'none' });
    return () => { tw.kill(); };
  }, [index, geometry, material, targets, rand, count]);

  useFrame((state, delta) => {
    material.uniforms.uTime.value += Math.min(delta, 1 / 30);
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const p = pointer.current;
    if (!p.dragging) p.drag *= 0.97;
    // the icon spins all the way round on its own (slower while the cursor is on it, so the burst
    // reads), leans toward the mouse and can be dragged round
    const dt = Math.min(delta, 1 / 30);
    spinSpeed.current += ((overIcon.current ? 0.12 : 0.42) - spinSpeed.current) * 0.04;
    spin.current += dt * spinSpeed.current;
    g.rotation.y += (spin.current + p.x * 0.45 + p.drag - g.rotation.y) * (p.dragging ? 0.2 : 0.06);
    g.rotation.x += (-0.06 - p.y * 0.14 - g.rotation.x) * 0.05;
    g.rotation.z = Math.sin(t * 0.27) * 0.03;
    g.position.y = GROUP_Y + Math.sin(t * 0.8) * 0.05;
    // Pointer → group-local point on the logo plane. Over the icon it drops a burst spot: a new
    // one every so often while it rests, and along the way as it moves.
    const now = material.uniforms.uTime.value as number;
    overIcon.current = false;
    if (p.inside && !p.dragging) {
      ray.v.set(p.x, p.y);
      ray.rc.setFromCamera(ray.v, state.camera);
      g.updateMatrixWorld();
      ray.plane.normal.set(0, 0, 1).applyQuaternion(g.quaternion);
      ray.plane.constant = -ray.plane.normal.dot(g.position);
      if (ray.rc.ray.intersectPlane(ray.plane, ray.hit)) {
        const h = ray.hit.applyMatrix4(ray.inv.copy(g.matrixWorld).invert());
        const last = hits[(hitAt.current + HITS - 1) % HITS];
        const since = now - last.w;
        const over = Math.abs(h.x) < SIZE * 0.62 && Math.abs(h.y) < SIZE * 0.62;
        overIcon.current = over;
        if (over && since > 0.06 && (since > 0.22 || Math.hypot(h.x - last.x, h.y - last.y) > 0.35)) {
          hits[hitAt.current].set(h.x, h.y, 0, now);
          hitAt.current = (hitAt.current + 1) % HITS;
        }
      }
    }
  });

  return (
    <group ref={group} position={[0, GROUP_Y, 0]}>
      <points geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}

const glassVert = /* glsl */ `
varying vec3 vN; varying vec3 vV; varying float vY;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vY = uv.y;
  gl_Position = projectionMatrix * mv;
}`;
const glassFrag = /* glsl */ `
varying vec3 vN; varying vec3 vV; varying float vY;
void main(){
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
  float fade = smoothstep(0.0, 0.08, vY) * smoothstep(1.0, 0.75, vY);
  gl_FragColor = vec4(vec3(1.0), (0.035 + f * 0.42) * fade);
}`;

/**
 * The glass tube the icon floats in: a faint triangulated mesh (vertices nudged so the facets
 * look hand-cut, not a grid), a fresnel sheen that brightens toward its edges, and a glowing
 * ring where it meets the pedestal.
 */
function GlassTube() {
  const h = GLASS_Y1 - GLASS_Y0;
  const { lines, shell } = useMemo(() => {
    const g = new THREE.CylinderGeometry(GLASS_R, GLASS_R, h, 40, 11, true);
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    // the same jitter for vertices that share a position (the seam), so the mesh stays closed
    const hash = (x: number, y: number) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const a = Math.atan2(z, x);
      const key = Math.round(x * 1000) + Math.round(z * 1000) * 0.37;
      const edge = Math.abs(Math.abs(y) - h / 2) < 1e-3;
      const da = (hash(key, y) - 0.5) * 0.09;
      const dy = edge ? 0 : (hash(y, key) - 0.5) * 0.28;
      pos.setXYZ(i, Math.cos(a + da) * GLASS_R, y + dy, Math.sin(a + da) * GLASS_R);
    }
    g.computeVertexNormals();
    return { lines: new THREE.WireframeGeometry(g), shell: g };
  }, [h]);
  const mats = useMemo(() => ({
    line: new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.16, depthWrite: false }),
    shell: new THREE.ShaderMaterial({ vertexShader: glassVert, fragmentShader: glassFrag, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
  }), []);
  useEffect(() => () => { lines.dispose(); shell.dispose(); mats.line.dispose(); mats.shell.dispose(); }, [lines, shell, mats]);
  return (
    <group position={[0, GLASS_Y0 + h / 2, 0]}>
      <lineSegments geometry={lines} material={mats.line} renderOrder={2} />
      <mesh geometry={shell} material={mats.shell} renderOrder={3} />
      <group position={[0, -h / 2 + 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <torusGeometry args={[GLASS_R, 0.025, 8, 160]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
        <mesh>
          <torusGeometry args={[GLASS_R, 0.12, 8, 160]} />
          <meshBasicMaterial color="#eaf4ff" transparent opacity={0.3} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** Backs the camera off on narrow (portrait) viewports so the icon always fits with margin. */
function ResponsiveCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    const hHalf = Math.atan(Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * aspect);
    const needed = (SIZE * 0.62) / Math.tan(hHalf);
    const z = Math.max(8.2, needed);
    cam.position.set(0, 2.1 + (z - 8.2) * 0.12, z);
    cam.lookAt(0, 1.75, 0);
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

/** The glowing ring light hanging over the stage. */
function RingLight() {
  return (
    <group position={[0, 5.1, -3]} rotation={[Math.PI / 2.6, 0, 0]}>
      <mesh>
        <torusGeometry args={[2.6, 0.05, 12, 160]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh>
        <torusGeometry args={[2.6, 0.22, 12, 160]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.18} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Pedestal() {
  const tiers = [
    { r: 3.2, h: 0.32, y: 0.16 },
    { r: 2.55, h: 0.12, y: 0.38 },
    { r: 1.7, h: 0.08, y: 0.48 },
  ];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[40, 64]} />
        <meshStandardMaterial color="#9ea5ae" roughness={0.85} />
      </mesh>
      {tiers.map((t) => (
        <group key={t.r}>
          <mesh position={[0, t.y, 0]}>
            <cylinderGeometry args={[t.r, t.r, t.h, 96]} />
            <meshStandardMaterial color="#aab1ba" roughness={0.45} metalness={0.15} />
          </mesh>
          <mesh position={[0, t.y + t.h / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[t.r, 0.014, 8, 160]} />
            <meshBasicMaterial color="#f4f8ff" />
          </mesh>
        </group>
      ))}
      {[4.4, 5.6].map((r) => (
        <mesh key={r} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r, r + 0.03, 160]} />
          <meshBasicMaterial color="#e8edf3" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

export default function ParticleScene({ shapes, index, active, dense, onFail }: { shapes: string[]; index: number; active: boolean; dense: boolean; onFail?: () => void }) {
  const pointer = useRef<PointerState>({ x: 0, y: 0, inside: false, drag: 0, dragging: false });
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wrap.current?.parentElement;
    if (!el) return;
    let lastX = 0;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const p = pointer.current;
      p.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      p.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      p.inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom && e.pointerType === 'mouse';
      if (p.dragging) { p.drag += ((e.clientX - lastX) / r.width) * 5; lastX = e.clientX; }
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || (e.target as Element).closest('button,a')) return;
      pointer.current.dragging = true; lastX = e.clientX;
    };
    const up = () => { pointer.current.dragging = false; };
    window.addEventListener('pointermove', move, { passive: true });
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); el.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up); };
  }, []);

  return (
    <div ref={wrap} className="h-full w-full">
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 2.1, 8.2], fov: 38 }}
      onCreated={({ camera, gl }) => {
        camera.lookAt(0, 1.75, 0);
        // If the GPU drops the context (tab in background, driver reset, too many canvases),
        // hand over to the static icon instead of leaving an empty stage.
        gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onFail?.(); }, { once: true });
      }}
      aria-hidden="true"
    >
      <ResponsiveCamera />
      <fog attach="fog" args={['#c3c8cf', 8, 30]} />
      <hemisphereLight args={['#ffffff', '#8a929c', 1.6]} />
      <directionalLight position={[-3, 6, 4]} intensity={1.4} />
      <Particles shapes={shapes} index={index} count={dense ? 30000 : 11000} pointer={pointer} />
      <Pedestal />
      <GlassTube />
      <RingLight />
    </Canvas>
    </div>
  );
}
