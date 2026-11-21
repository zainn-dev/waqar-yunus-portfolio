import { Suspense, useEffect, useRef, type MutableRefObject, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Cloud, Clouds, Float, Stars, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { Avatar } from '@/components/three/Avatar';
import { ADAM_POSE, CREATOR_POSE, preloadHand, StoneHand } from '@/components/three/hands/StoneHand';
import type { SkyMode } from '@/lib/sky';

const presets: Record<SkyMode, { sun: [number, number, number]; fog: string; cloud: string; light: number; amb: number; warm: string }> = {
  day: { sun: [5, 8, 6], fog: '#cfdcef', cloud: '#ffffff', light: 2.6, amb: 1.15, warm: '#fff4e2' },
  sunset: { sun: [8, 3, 4], fog: '#e9c9c4', cloud: '#ffe1d6', light: 2.2, amb: 0.95, warm: '#ffc9a3' },
  night: { sun: [-4, 6, 5], fog: '#1d2433', cloud: '#7b86a0', light: 0.9, amb: 0.5, warm: '#b9c6ff' },
};

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
type Ref<T> = MutableRefObject<T>;

function Rig({ pointer, progress, intro }: { pointer: Ref<{ x: number; y: number }>; progress: Ref<number>; intro: Ref<number> }) {
  const { camera } = useThree();
  useFrame(() => {
    const p = progress.current;
    const i = ease(intro.current);
    // starts far away, glides in; scrolling lifts the camera up into the sky
    const z = 11 - p * 4 + (1 - i) * 9;
    const y = 0.2 + p * 3.2;
    camera.position.x += (pointer.current.x * 0.6 - camera.position.x) * 0.04;
    camera.position.y += (y + pointer.current.y * 0.3 - camera.position.y) * 0.05;
    camera.position.z += (z - camera.position.z) * 0.08;
    camera.lookAt(0, p * 2.6, 0);
  });
  return null;
}

/** Layout of the two hands: `from` = fingertips almost touching (intro), `to` = resting composition. */
type Place = { pos: [number, number, number]; rz: number };
const LAYOUT = {
  desktop: {
    scale: 2,
    adam: { from: { pos: [-2.45, -0.43, 0], rz: 0.16 }, to: { pos: [-3.5, -2.05, 0.3], rz: 0.34 } } as { from: Place; to: Place },
    creator: { from: { pos: [2.45, 0.43, 0], rz: -0.16 }, to: { pos: [3.95, 2.25, -0.6], rz: -0.34 } } as { from: Place; to: Place },
  },
  mobile: {
    scale: 1.3,
    adam: { from: { pos: [-1.6, -0.26, 0], rz: 0.2 }, to: { pos: [-0.55, -2.35, 0.2], rz: 0.42 } } as { from: Place; to: Place },
    creator: { from: { pos: [1.6, 0.26, 0], rz: -0.2 }, to: { pos: [1.9, 2.6, -0.4], rz: -0.5 } } as { from: Place; to: Place },
  },
};

/** One hand that travels from its intro placement to its resting one. */
function Mover({ place, intro, flip, children }: { place: { from: Place; to: Place }; intro: Ref<number>; flip?: boolean; children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!g.current) return;
    const i = ease(intro.current);
    const { from, to } = place;
    g.current.position.set(
      THREE.MathUtils.lerp(from.pos[0], to.pos[0], i),
      THREE.MathUtils.lerp(from.pos[1], to.pos[1], i),
      THREE.MathUtils.lerp(from.pos[2], to.pos[2], i),
    );
    // the creator hand is turned about Y so it points left; negative rz then tips it downward
    g.current.rotation.set(0.32, flip ? Math.PI : 0, THREE.MathUtils.lerp(from.rz, to.rz, i));
  });
  return <group ref={g}>{children}</group>;
}

function Scene({ mode, pointer, progress, intro, mobile }: { mode: SkyMode; pointer: Ref<{ x: number; y: number }>; progress: Ref<number>; intro: Ref<number>; mobile: boolean }) {
  const p = presets[mode];
  const { scene } = useThree();
  useEffect(() => { scene.fog = new THREE.Fog(p.fog, 30, 90); }, [scene, p.fog]);
  const L = mobile ? LAYOUT.mobile : LAYOUT.desktop;
  const quality = mobile ? 'low' : 'high';
  return (
    <>
      {mode === 'night' && <Stars radius={80} depth={40} count={mobile ? 800 : 2500} factor={3} fade speed={0.4} />}
      <ambientLight intensity={p.amb} />
      <directionalLight position={p.sun} intensity={p.light} color={p.warm} />
      <directionalLight position={[-6, -2, 4]} intensity={p.light * 0.25} color="#cfe0ff" />
      <Environment resolution={64}>
        <Lightformer intensity={1.2} position={[0, 5, -6]} scale={[12, 4, 1]} color={p.cloud} />
        <Lightformer intensity={0.7} position={[-6, 0, 4]} scale={[4, 8, 1]} />
        <Lightformer intensity={0.5} position={[6, -2, 4]} scale={[4, 6, 1]} color={p.warm} />
      </Environment>
      <Clouds material={THREE.MeshLambertMaterial} limit={mobile ? 90 : 200} texture="/textures/cloud.png">
        <Cloud seed={2} segments={mobile ? 10 : 18} bounds={[6, 1.6, 2]} volume={6} position={[-11, 4.5, -14]} color={p.cloud} opacity={0.75} speed={0.08} />
        <Cloud seed={5} segments={mobile ? 10 : 18} bounds={[8, 1.6, 2]} volume={7} position={[12, -1, -18]} color={p.cloud} opacity={0.65} speed={0.06} />
        <Cloud seed={9} segments={mobile ? 10 : 20} bounds={[18, 1.4, 4]} volume={9} position={[0, -8, -10]} color={p.cloud} opacity={0.9} speed={0.05} />
        <Cloud seed={13} segments={mobile ? 6 : 12} bounds={[5, 1, 2]} volume={4} position={[5, 6.5, -12]} color={p.cloud} opacity={0.55} speed={0.1} />
      </Clouds>

      {/* The gesture: two monumental bronze hands reaching for each other. */}
      <Mover place={L.adam} intro={intro}>
        <Float speed={0.7} rotationIntensity={0.05} floatIntensity={0.25}>
          <group scale={L.scale}>
            <StoneHand pose={ADAM_POSE} quality={quality} />
            {/* sitting on the wrist, laptop on lap, facing the viewer */}
            <group position={[-0.8, 0.25, 0.03]} rotation={new THREE.Euler(-0.32, 0.42, -L.adam.to.rz, 'ZXY')}>
              <Avatar pose="sit-laptop" laptop anchor="hips" scale={0.42} />
            </group>
          </group>
        </Float>
      </Mover>
      <Mover place={L.creator} intro={intro} flip>
        <Float speed={0.9} rotationIntensity={0.06} floatIntensity={0.35}>
          <group scale={L.scale}>
            <StoneHand pose={CREATOR_POSE} quality={quality} />
          </group>
        </Float>
      </Mover>
      <Rig pointer={pointer} progress={progress} intro={intro} />
    </>
  );
}

export default function SkyScene({ mode, progress, active, mobile, reduced }: { mode: SkyMode; progress: Ref<number>; active: boolean; mobile: boolean; reduced: boolean }) {
  const pointer = useRef({ x: 0, y: 0 });
  const intro = useRef(reduced ? 1 : 0);
  const quality = mobile ? 'low' : 'high';
  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', move, { passive: true });
    if (reduced) return () => window.removeEventListener('pointermove', move);
    // the intro waits for the hands' geometry (built in a worker) before the camera glides in
    let raf = 0, t0 = 0, started = false;
    const tick = (now: number) => {
      if (!t0) t0 = now;
      intro.current = Math.min(1, (now - t0) / 3200);
      if (intro.current < 1) raf = requestAnimationFrame(tick);
    };
    const start = () => { if (started) return; started = true; raf = requestAnimationFrame(tick); };
    const fallback = window.setTimeout(start, 3000);
    Promise.all([preloadHand(ADAM_POSE, quality), preloadHand(CREATOR_POSE, quality)]).then(() => window.setTimeout(start, 250), start);
    return () => { started = true; window.clearTimeout(fallback); window.removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, [reduced, quality]);
  return (
    <Canvas
      frameloop={active ? (reduced ? 'demand' : 'always') : 'never'}
      dpr={mobile ? 1 : [1, 1.6]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0.3, 20], fov: mobile ? 52 : 36, near: 0.1, far: 6000 }}
      aria-hidden="true"
    >
      <Suspense fallback={null}>
        <Scene mode={mode} pointer={pointer} progress={progress} intro={intro} mobile={mobile} />
      </Suspense>
    </Canvas>
  );
}
