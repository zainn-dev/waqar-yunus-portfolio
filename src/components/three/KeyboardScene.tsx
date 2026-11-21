import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BOARD_D, BOARD_W, KEYS, type KeyDef } from '@/lib/keyboard';

type Ref<T> = MutableRefObject<T>;
export interface KeyboardSceneProps {
  /** code → performance.now() of the last press */
  presses: Ref<Map<string, number>>;
  /** 0..1 while the hero scrolls away */
  progress: Ref<number>;
  /** keys drop in once this turns true */
  start: boolean;
  active: boolean;
  mobile: boolean;
  reduced: boolean;
  onKey: (code: string) => void;
}

const MINT = new THREE.Color('#3ddc97');
const CAP_H = 0.46;
const COLORS: Record<KeyDef['kind'], { cap: string; ink: string }> = {
  alpha: { cap: '#1c2128', ink: '#e6edf3' },
  mod: { cap: '#2d333b', ink: '#8b949e' },
  accent: { cap: '#3ddc97', ink: '#0d1117' },
  space: { cap: '#c9d1d9', ink: '#0d1117' },
};

/** Sculpted keycap: a rounded box whose top is pulled in, cached per width. */
const capCache = new Map<number, THREE.BufferGeometry>();
function capGeometry(w: number) {
  let g = capCache.get(w);
  if (g) return g;
  const bw = w - 0.12, bd = 0.88;
  g = new RoundedBoxGeometry(bw, CAP_H, bd, 3, 0.1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = THREE.MathUtils.clamp(p.getY(i) / (CAP_H / 2), 0, 1);
    p.setX(i, p.getX(i) * ((bw - 0.16 * t) / bw));
    p.setZ(i, p.getZ(i) * ((bd - 0.16 * t) / bd));
  }
  g.computeVertexNormals();
  capCache.set(w, g);
  return g;
}

/** All key legends drawn into one canvas texture (8×8 cells). */
function useLegendAtlas() {
  const atlas = useMemo(() => {
    const cells = new Map<string, number>();
    KEYS.forEach((k) => {
      const id = `${k.label}|${COLORS[k.kind].ink}`;
      if (k.label && !cells.has(id)) cells.set(id, cells.size);
    });
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1024;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const draw = () => {
      const g = canvas.getContext('2d')!;
      g.clearRect(0, 0, 1024, 1024);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      cells.forEach((i, id) => {
        const [label, ink] = id.split('|');
        const cx = (i % 8) * 128 + 64, cy = Math.floor(i / 8) * 128 + 64;
        g.fillStyle = ink;
        g.font = `600 ${label.length > 1 ? 30 : 58}px "JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace`;
        g.fillText(label, cx, cy + 2);
      });
      tex.needsUpdate = true;
    };
    draw();
    document.fonts?.ready.then(draw).catch(() => undefined);
    return { tex, cells };
  }, []);
  useEffect(() => () => atlas.tex.dispose(), [atlas]);
  return atlas;
}

function legendGeometry(cell: number, size: number) {
  const g = new THREE.PlaneGeometry(size, size);
  const u0 = (cell % 8) / 8, v1 = 1 - Math.floor(cell / 8) / 8;
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) / 8, v1 - (1 - uv.getY(i)) / 8);
  return g;
}

/** Soft radial sprite for the mint underglow. */
function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.45, 'rgba(255,255,255,0.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const easeOutBack = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

function Board({ presses, progress, start, mobile, reduced, onKey }: Omit<KeyboardSceneProps, 'active'>) {
  const group = useRef<THREE.Group>(null);
  const caps = useRef<(THREE.Group | null)[]>([]);
  const { camera, viewport } = useThree();
  const atlas = useLegendAtlas();
  const glow = useMemo(glowTexture, []);
  const caseGeo = useMemo(() => new RoundedBoxGeometry(BOARD_W + 0.8, 0.72, BOARD_D + 0.8, 4, 0.28), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.25), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const local = useRef(new THREE.Vector3(99, 0, 99));
  const t0 = useRef<number | null>(null);

  const keys = useMemo(
    () =>
      KEYS.map((k, i) => {
        const c = COLORS[k.kind];
        const mat = new THREE.MeshStandardMaterial({ color: c.cap, roughness: k.kind === 'accent' ? 0.4 : 0.62, metalness: 0.05, emissive: MINT, emissiveIntensity: 0 });
        const cell = atlas.cells.get(`${k.label}|${c.ink}`);
        const size = k.label.length > 1 ? 0.56 : 0.5;
        const legend = cell === undefined ? null : legendGeometry(cell, size);
        const top = k.w - 0.28;
        const lx = k.w > 1.3 ? -top / 2 + size / 2 + 0.02 : 0;
        return { k, i, mat, legend, lx, seed: rand(i) };
      }),
    [atlas],
  );
  const legendMat = useMemo(() => new THREE.MeshBasicMaterial({ map: atlas.tex, transparent: true, depthWrite: false, toneMapped: false }), [atlas]);
  useEffect(() => () => { keys.forEach((k) => { k.mat.dispose(); k.legend?.dispose(); }); legendMat.dispose(); glow.dispose(); caseGeo.dispose(); }, [keys, legendMat, glow, caseGeo]);

  useEffect(() => { if (start && t0.current === null) t0.current = performance.now(); }, [start]);

  // fit the 15-unit board to the screen
  const vp = viewport.getCurrentViewport(camera, new THREE.Vector3(0, 0, 0));
  const scale = mobile ? (vp.width * 0.96) / (BOARD_W + 0.8) : Math.min((vp.width * 0.5) / (BOARD_W + 0.8), (vp.height * 0.55) / (BOARD_D + 0.8));

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const now = performance.now();
    const time = state.clock.elapsedTime;
    const p = progress.current;
    const intro = reduced ? 10 : t0.current === null ? -1 : (now - t0.current) / 1000;

    // board tilt: pointer parallax + scroll
    const px = state.pointer.x, py = state.pointer.y;
    g.rotation.x += (0.08 - py * 0.05 + p * 0.5 - g.rotation.x) * 0.06;
    g.rotation.y += (px * 0.14 - g.rotation.y) * 0.06;
    g.rotation.z += (-px * 0.025 - g.rotation.z) * 0.06;

    // where the pointer is over the board (local units) for the hover swell
    state.raycaster.setFromCamera(state.pointer, state.camera);
    if (state.raycaster.ray.intersectPlane(plane, hit)) {
      g.worldToLocal(local.current.copy(hit));
    }
    const lx = local.current.x, lz = local.current.z;

    let animating = false;
    for (const { k, i, mat, seed } of keys) {
      const cap = caps.current[i];
      if (!cap) continue;
      // intro: keys rain down left → right
      const delay = (k.x + BOARD_W / 2) * 0.045 + (k.z + 2) * 0.05 + seed * 0.12;
      const it = THREE.MathUtils.clamp((intro - delay) / 0.75, 0, 1);
      const drop = intro < 0 ? 6 : (1 - easeOutBack(it)) * 6;
      if (it < 1) animating = true;

      // press: fast down, springy return
      const pt = presses.current.get(k.code);
      const dt = pt === undefined ? 9 : (now - pt) / 1000;
      const down = dt < 0.05 ? dt / 0.05 : Math.max(0, 1 - (dt - 0.05) / 0.22);
      const glowAmt = Math.max(0, 1 - dt / 0.7);
      if (dt < 0.7) animating = true;

      const d2 = (k.x - lx) ** 2 + (k.z - lz) ** 2;
      const hover = reduced ? 0 : Math.exp(-d2 / 2.2) * 0.16;
      const wave = reduced ? 0 : Math.sin(time * 1.4 - k.x * 0.45 + k.z * 0.3) * 0.025;
      const lift = p * p * (3 + seed * 7);

      cap.position.set(k.x, CAP_H / 2 + drop + wave + hover - down * 0.17 + lift, k.z);
      cap.rotation.set(p * p * (seed - 0.5) * 3, 0, p * p * (rand(i + 9) - 0.5) * 2.4);
      mat.emissiveIntensity = glowAmt * (k.kind === 'accent' ? 0.25 : 0.85) + hover * 1.4;
    }
    if (reduced && animating) state.invalidate();
  });

  const click = (code: string) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onKey(code);
  };

  return (
    <group ref={group} scale={scale} position={[0, 0, 0]}>
      {/* aluminium case */}
      <mesh geometry={caseGeo} position={[0, -0.32, 0]}>
        <meshStandardMaterial color="#161b22" metalness={0.75} roughness={0.32} />
      </mesh>
      {/* plate */}
      <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BOARD_W + 0.1, BOARD_D + 0.1]} />
        <meshStandardMaterial color="#0b0f14" roughness={0.9} />
      </mesh>
      {/* mint light strip on the front edge */}
      <mesh position={[0, -0.3, BOARD_D / 2 + 0.41]}>
        <boxGeometry args={[BOARD_W - 0.6, 0.05, 0.02]} />
        <meshBasicMaterial color="#3ddc97" toneMapped={false} />
      </mesh>
      {/* underglow */}
      <mesh position={[0, -0.75, 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BOARD_W * 1.9, BOARD_D * 3.2]} />
        <meshBasicMaterial map={glow} color="#3ddc97" transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>

      {keys.map(({ k, i, mat, legend, lx }) => (
        <group key={k.code} ref={(el) => { caps.current[i] = el; }} position={[k.x, 6, k.z]}>
          <mesh geometry={capGeometry(k.w)} material={mat} onPointerDown={click(k.code)} />
          {legend && <mesh geometry={legend} material={legendMat} position={[lx, CAP_H / 2 + 0.003, k.label.length > 1 ? 0.12 : 0]} rotation={[-Math.PI / 2, 0, 0]} />}
        </group>
      ))}
    </group>
  );
}

function Rig({ mobile }: { mobile: boolean }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, mobile ? 14 : 10.5, mobile ? 6.5 : 9.5);
    camera.lookAt(0, 0, mobile ? -0.6 : -1.5);
  }, [camera, mobile]);
  return null;
}

export default function KeyboardScene({ active, ...props }: KeyboardSceneProps) {
  return (
    <Canvas
      frameloop={active ? (props.reduced ? 'demand' : 'always') : 'never'}
      dpr={props.mobile ? [1, 1.5] : [1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 10.5, 9.5], fov: props.mobile ? 34 : 26, near: 0.1, far: 200 }}
      aria-hidden="true"
    >
      <Rig mobile={props.mobile} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[-5, 10, 6]} intensity={2.2} />
      <pointLight position={[0, 1.2, 6]} intensity={14} distance={16} color="#3ddc97" />
      <pointLight position={[7, 3, -6]} intensity={10} distance={18} color="#79c0ff" />
      <Environment resolution={64}>
        <Lightformer intensity={1.4} position={[0, 6, -4]} scale={[14, 3, 1]} />
        <Lightformer intensity={0.8} position={[-8, 2, 4]} scale={[4, 6, 1]} color="#79c0ff" />
        <Lightformer intensity={0.8} position={[8, 2, 4]} scale={[4, 6, 1]} color="#3ddc97" />
      </Environment>
      <Board {...props} />
    </Canvas>
  );
}
