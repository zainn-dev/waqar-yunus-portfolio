import type { ThreeElements } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { groundTexture, islandAlpha, screenTexture } from '@/components/three/textures';

export function Laptop({ open = 1.9, ...props }: { open?: number } & ThreeElements['group']) {
  const screen = useMemo(() => screenTexture('laptop'), []);
  return (
    <group {...props}>
      <RoundedBox args={[1, 0.05, 0.7]} radius={0.02} castShadow>
        <meshStandardMaterial color="#e9e9ec" metalness={0.6} roughness={0.35} />
      </RoundedBox>
      <group position={[0, 0.025, -0.35]} rotation={[-open + Math.PI / 2, 0, 0]}>
        <RoundedBox args={[1, 0.04, 0.68]} radius={0.02} position={[0, 0, 0.34]} castShadow>
          <meshStandardMaterial color="#e9e9ec" metalness={0.6} roughness={0.35} />
        </RoundedBox>
        <mesh position={[0, -0.022, 0.34]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.92, 0.6]} />
          <meshStandardMaterial map={screen} emissive="#ffffff" emissiveMap={screen} emissiveIntensity={0.9} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

/** Desk, monitor, PC tower, keyboard and chair — modelled from primitives. */
export function Workstation(props: ThreeElements['group']) {
  const screen = useMemo(() => screenTexture('monitor'), []);
  const wood = '#e8d3ad';
  const black = '#1a1b1e';
  return (
    <group {...props}>
      {/* desk */}
      <RoundedBox args={[3.4, 0.09, 1.6]} radius={0.02} position={[0, 1.5, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={wood} roughness={0.7} />
      </RoundedBox>
      {[[-1.6, -0.7], [1.6, -0.7], [-1.6, 0.7], [1.6, 0.7]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.73, z]} castShadow>
          <boxGeometry args={[0.08, 1.46, 0.08]} />
          <meshStandardMaterial color={black} roughness={0.5} />
        </mesh>
      ))}
      {/* monitor */}
      <group position={[-0.2, 1.55, -0.35]}>
        <mesh position={[0, 0.03, 0]} castShadow><boxGeometry args={[0.5, 0.04, 0.3]} /><meshStandardMaterial color={black} /></mesh>
        <mesh position={[0, 0.35, -0.05]} castShadow><boxGeometry args={[0.07, 0.6, 0.07]} /><meshStandardMaterial color={black} /></mesh>
        <RoundedBox args={[1.7, 1, 0.07]} radius={0.02} position={[0, 0.9, 0]} castShadow><meshStandardMaterial color="#121316" roughness={0.4} /></RoundedBox>
        <mesh position={[0, 0.9, 0.037]}>
          <planeGeometry args={[1.62, 0.92]} />
          <meshStandardMaterial map={screen} emissive="#ffffff" emissiveMap={screen} emissiveIntensity={0.85} />
        </mesh>
      </group>
      {/* keyboard + mouse */}
      <RoundedBox args={[0.9, 0.04, 0.3]} radius={0.015} position={[-0.2, 1.565, 0.25]} castShadow><meshStandardMaterial color="#2a2b30" /></RoundedBox>
      <RoundedBox args={[0.12, 0.04, 0.18]} radius={0.04} position={[0.5, 1.565, 0.28]} castShadow><meshStandardMaterial color="#2a2b30" /></RoundedBox>
      {/* PC tower with glowing fans */}
      <group position={[1.15, 1.55 + 0.55, -0.25]}>
        <RoundedBox args={[0.55, 1.1, 0.9]} radius={0.03} castShadow><meshStandardMaterial color={black} roughness={0.35} metalness={0.3} /></RoundedBox>
        {[0.25, -0.1].map((y) => (
          <mesh key={y} position={[-0.28, y, 0.15]} rotation={[0, -Math.PI / 2, 0]}>
            <torusGeometry args={[0.14, 0.02, 12, 40]} />
            <meshStandardMaterial color="#FF3831" emissive="#FF3831" emissiveIntensity={1.6} />
          </mesh>
        ))}
      </group>
      {/* chair */}
      <group position={[-0.25, 0, 1.15]}>
        <mesh position={[0, 0.95, 0]} castShadow><boxGeometry args={[0.85, 0.12, 0.8]} /><meshStandardMaterial color="#202125" roughness={0.6} /></mesh>
        <mesh position={[0, 1.65, 0.38]} rotation={[0.12, 0, 0]} castShadow><boxGeometry args={[0.8, 1.3, 0.12]} /><meshStandardMaterial color="#202125" roughness={0.6} /></mesh>
        <mesh position={[0, 1.65, 0.45]} rotation={[0.12, 0, 0]}><boxGeometry args={[0.35, 1.1, 0.02]} /><meshStandardMaterial color="#f2f2f2" roughness={0.6} /></mesh>
        <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.05, 0.05, 0.9, 12]} /><meshStandardMaterial color="#9a9ca2" metalness={0.8} roughness={0.3} /></mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[Math.cos((i / 5) * Math.PI * 2) * 0.32, 0.06, Math.sin((i / 5) * Math.PI * 2) * 0.32]} rotation={[0, -(i / 5) * Math.PI * 2, 0]} castShadow>
            <boxGeometry args={[0.65, 0.05, 0.07]} /><meshStandardMaterial color="#2a2b30" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Ragged grass-and-stone island with instanced grass blades. */
export function GrassIsland({ radius = 3.6, blades = 2600, ...props }: { radius?: number; blades?: number } & ThreeElements['group']) {
  const ground = useMemo(() => groundTexture(), []);
  const alpha = useMemo(() => islandAlpha(), []);
  const grass = useMemo(() => {
    const geo = new THREE.ConeGeometry(0.018, 0.22, 3);
    geo.translate(0, 0.11, 0);
    const mat = new THREE.MeshStandardMaterial({ color: '#6d8340', roughness: 0.9 });
    const mesh = new THREE.InstancedMesh(geo, mat, blades);
    const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const c = new THREE.Color();
    for (let i = 0; i < blades; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * radius * 0.86;
      q.setFromEuler(new THREE.Euler((Math.random() - 0.5) * 0.6, Math.random() * 6, (Math.random() - 0.5) * 0.6));
      const s = 0.6 + Math.random() * 1.1;
      m.compose(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r), q, new THREE.Vector3(s, s, s));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.setHSL(0.22 + Math.random() * 0.05, 0.35 + Math.random() * 0.2, 0.28 + Math.random() * 0.14));
    }
    mesh.receiveShadow = true;
    return mesh;
  }, [blades, radius]);
  return (
    <group {...props}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[radius, 64]} />
        <meshStandardMaterial map={ground} alphaMap={alpha} transparent alphaTest={0.4} roughness={1} />
      </mesh>
      <primitive object={grass} />
    </group>
  );
}
