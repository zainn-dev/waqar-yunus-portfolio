import { Suspense, type MutableRefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';
import { Avatar, type AvatarPose } from '@/components/three/Avatar';
import { GrassIsland, Workstation } from '@/components/three/Props';

function Lights() {
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[4, 8, 5]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} />
      <Environment resolution={64}>
        <Lightformer intensity={1.5} position={[0, 4, 4]} scale={[10, 3, 1]} />
        <Lightformer intensity={0.8} position={[-5, 1, -2]} scale={[3, 6, 1]} />
      </Environment>
    </>
  );
}

/** Creative Developer stage: the avatar turns with scroll progress (0..1). */
function Turner({ progress, children }: { progress: MutableRefObject<number>; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!g.current) return;
    const p = progress.current;
    g.current.rotation.y += ((-0.7 + p * 1.4) - g.current.rotation.y) * 0.08;
    g.current.position.x += ((p - 0.5) * 0.6 - g.current.position.x) * 0.08;
  });
  return <group ref={g}>{children}</group>;
}

export function CreativeScene({ progress, pose, active, reduced, mobile = false }: { progress: MutableRefObject<number>; pose: AvatarPose; active: boolean; reduced: boolean; mobile?: boolean }) {
  return (
    <Canvas shadows frameloop={active ? (reduced ? 'demand' : 'always') : 'never'} gl={{ alpha: true, antialias: true }} dpr={mobile ? 1 : [1, 1.6]} camera={{ position: [0, 1.55, mobile ? 9.5 : 8.4], fov: 32 }} onCreated={({ camera }) => camera.lookAt(0, 1.45, 0)} aria-hidden="true">
      <Suspense fallback={null}>
        <Lights />
        <Turner progress={progress}>
          <Avatar pose={pose} scale={1.72} position={[0, -0.05, 0]} />
        </Turner>
        <ContactShadows position={[0, -0.04, 0]} opacity={0.35} scale={6} blur={2.6} far={3} />
      </Suspense>
    </Canvas>
  );
}

/** Workstation on a grass island, avatar seated at the desk. */
function Turntable({ children }: { children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  const pointer = useRef(0);
  useFrame((state) => {
    pointer.current += (state.pointer.x * 0.25 - pointer.current) * 0.05;
    if (g.current) g.current.rotation.y = -0.55 + pointer.current;
  });
  return <group ref={g}>{children}</group>;
}

export function StudioScene({ active, mobile, reduced }: { active: boolean; mobile: boolean; reduced: boolean }) {
  return (
    <Canvas shadows frameloop={active ? (reduced ? 'demand' : 'always') : 'never'} dpr={mobile ? 1 : [1, 1.6]} gl={{ alpha: true, antialias: true }} camera={{ position: [7.4, 5.2, 8.6], fov: 31 }} onCreated={({ camera }) => camera.lookAt(-0.3, 0.9, 0)} aria-hidden="true">
      <Suspense fallback={null}>
        <Lights />
        <Turntable>
          <GrassIsland radius={3.4} blades={mobile ? 1200 : 3000} />
          <Workstation position={[0.2, 0, -0.4]} />
          {/* seated on the chair, facing the monitor */}
          <group position={[-0.05, 1.1, 0.78]} rotation={[0, Math.PI, 0]}>
            <Avatar pose="sit-desk" anchor="hips" scale={1.8} look={false} />
          </group>
        </Turntable>
        <ContactShadows position={[0, 0.01, 0]} opacity={0.4} scale={9} blur={2.4} far={4} />
      </Suspense>
    </Canvas>
  );
}

/** The avatar perched on a letter (Work page title): seated, legs dangling, head follows the pointer. */
export function PerchScene({ active, reduced }: { active: boolean; reduced: boolean }) {
  return (
    <Canvas frameloop={active ? (reduced ? 'demand' : 'always') : 'never'} dpr={[1, 1.6]} gl={{ alpha: true, antialias: true }} camera={{ position: [0, 0.1, 4.6], fov: 24 }} onCreated={({ camera }) => camera.lookAt(0, 0.1, 0)} aria-hidden="true">
      <Suspense fallback={null}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 6, 5]} intensity={2.2} />
        <Environment resolution={64}>
          <Lightformer intensity={1.5} position={[0, 4, 4]} scale={[10, 3, 1]} />
          <Lightformer intensity={0.8} position={[-5, 1, -2]} scale={[3, 6, 1]} />
        </Environment>
        <group rotation={[0.08, 0, 0]}>
          <Avatar pose="sit-laptop" anchor="hips" scale={1} />
        </group>
      </Suspense>
    </Canvas>
  );
}

/** Header mascot: the avatar from the chest up, waving. */
export function MascotScene({ active }: { active: boolean }) {
  return (
    <Canvas frameloop={active ? 'always' : 'never'} dpr={[1, 1.6]} gl={{ alpha: true, antialias: true }} camera={{ position: [0, 1.0, 3.7], fov: 30 }} onCreated={({ camera }) => camera.lookAt(0, 1.0, 0)} aria-hidden="true">
      <Suspense fallback={null}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 6, 5]} intensity={2.2} />
        <pointLight position={[-2, 1.6, 1.5]} intensity={6} color="#FF3831" />
        <Environment resolution={64}>
          <Lightformer intensity={1.5} position={[0, 4, 4]} scale={[10, 3, 1]} />
          <Lightformer intensity={0.8} position={[-5, 1, -2]} scale={[3, 6, 1]} />
        </Environment>
        <Avatar pose="wave" scale={1} />
      </Suspense>
    </Canvas>
  );
}
