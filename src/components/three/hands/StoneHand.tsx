import type { ThreeElements } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { HandMesh, HandPose } from './handSdf';

/* ------------------------------------------------------------------ */
/* Geometry is generated off the main thread and cached per pose.      */
/* ------------------------------------------------------------------ */
const cache = new Map<string, Promise<HandMesh>>();
let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { pose: HandPose; h: number; resolve: (m: HandMesh) => void; reject: (e: unknown) => void }>();
let workerBroken = false;

/** Fallback when module workers are unavailable: build on the main thread. */
const buildHere = (pose: HandPose, h: number) => import('./handSdf').then((m) => m.buildHand(pose, h));

function generate(pose: HandPose, h: number): Promise<HandMesh> {
  const key = JSON.stringify([pose, h]);
  const hit = cache.get(key);
  if (hit) return hit;
  const p = new Promise<HandMesh>((resolve, reject) => {
    if (workerBroken) { buildHere(pose, h).then(resolve, reject); return; }
    try {
      if (!worker) {
        worker = new Worker(new URL('./hand.worker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (e: MessageEvent<{ id: number; mesh: HandMesh }>) => {
          pending.get(e.data.id)?.resolve(e.data.mesh);
          pending.delete(e.data.id);
        };
        worker.onerror = () => {
          workerBroken = true;
          worker?.terminate();
          worker = null;
          pending.forEach((j) => buildHere(j.pose, j.h).then(j.resolve, j.reject));
          pending.clear();
        };
      }
      const id = ++seq;
      pending.set(id, { pose, h, resolve, reject });
      worker.postMessage({ id, pose, h });
    } catch {
      workerBroken = true;
      buildHere(pose, h).then(resolve, reject);
    }
  });
  cache.set(key, p);
  return p;
}

const STEP = { high: 0.016, low: 0.024 } as const;
export type HandQuality = keyof typeof STEP;

/** Warm the cache early (e.g. while the loader is still on screen). Resolves once the mesh exists. */
export function preloadHand(pose: HandPose, quality: HandQuality = 'high') { return generate(pose, STEP[quality]).then(() => undefined); }

/* ------------------------------------------------------------------ */
/* Decoration geometry: leaves, moss tufts, little white flowers        */
/* ------------------------------------------------------------------ */
function leafGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.6, 0.45, 0, 1);
  s.quadraticCurveTo(-0.6, 0.45, 0, 0);
  const g = new THREE.ShapeGeometry(s, 6);
  g.scale(0.034, 0.05, 1);
  g.rotateX(-Math.PI / 2); // lies in XZ, faces +Y
  // slight cup so it catches light
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, Math.abs(p.getX(i)) * 0.35);
  g.computeVertexNormals();
  return g;
}
function flowerGeometry() {
  const s = new THREE.Shape();
  const petals = 5;
  for (let i = 0; i <= petals * 8; i++) {
    const a = (i / (petals * 8)) * Math.PI * 2;
    const r = 0.5 + 0.5 * Math.abs(Math.cos((a * petals) / 2));
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  const g = new THREE.ShapeGeometry(s);
  g.scale(0.03, 0.03, 1);
  g.rotateX(-Math.PI / 2);
  return g;
}

const up = new THREE.Vector3(0, 1, 0);
const LEAF_GREENS = ['#5f8a2f', '#6f9a35', '#4f7a26', '#86a83f', '#3f6420'].map((c) => new THREE.Color(c));
const MOSS_GREENS = ['#4c6a24', '#5c7d2b', '#41591e', '#6b8b33'].map((c) => new THREE.Color(c));

function Decor({ mesh, lite }: { mesh: HandMesh; lite: boolean }) {
  const built = useMemo(() => {
    const d = mesh.decor;
    const n = d.length / 8;
    const leaves: number[] = [], moss: number[] = [], flowers: number[] = [];
    for (let i = 0; i < n; i++) {
      const k = d[i * 8 + 7];
      if (lite && k === 1 && i % 3 !== 0) continue;
      (k === 0 ? leaves : k === 1 ? moss : flowers).push(i);
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qt = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), nrm = new THREE.Vector3();
    let seed = 1;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const place = (inst: THREE.InstancedMesh, list: number[], lift: number, size: number, tilt: number, palette?: THREE.Color[]) => {
      list.forEach((i, j) => {
        nrm.set(d[i * 8 + 3], d[i * 8 + 4], d[i * 8 + 5]).normalize();
        p.set(d[i * 8], d[i * 8 + 1], d[i * 8 + 2]).addScaledVector(nrm, lift);
        q.setFromUnitVectors(up, nrm);
        qt.setFromAxisAngle(up, rnd() * Math.PI * 2);
        q.multiply(qt);
        qt.setFromAxisAngle(new THREE.Vector3(1, 0, 0), (rnd() - 0.3) * tilt);
        q.multiply(qt);
        const sc = d[i * 8 + 6] * size;
        s.set(sc, sc * (0.7 + rnd() * 0.6), sc);
        m4.compose(p, q, s);
        inst.setMatrixAt(j, m4);
        if (palette) inst.setColorAt(j, palette[(rnd() * palette.length) | 0]);
      });
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    };
    const leafMat = new THREE.MeshStandardMaterial({ roughness: 0.6, side: THREE.DoubleSide });
    const leafI = new THREE.InstancedMesh(leafGeometry(), leafMat, Math.max(1, leaves.length));
    place(leafI, leaves, 0.004, 1, 1.1, LEAF_GREENS);
    leafI.count = leaves.length;

    const mossGeo = new THREE.IcosahedronGeometry(0.018, 0);
    const mossMat = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });
    const mossI = new THREE.InstancedMesh(mossGeo, mossMat, Math.max(1, moss.length));
    place(mossI, moss, 0.0, 1, 0.4, MOSS_GREENS);
    mossI.count = moss.length;

    const flowerMat = new THREE.MeshStandardMaterial({ color: '#f4f2ea', roughness: 0.55, side: THREE.DoubleSide, emissive: '#ffffff', emissiveIntensity: 0.08 });
    const flowerI = new THREE.InstancedMesh(flowerGeometry(), flowerMat, Math.max(1, flowers.length));
    place(flowerI, flowers, 0.02, 1, 0.5);
    flowerI.count = flowers.length;
    const centreMat = new THREE.MeshStandardMaterial({ color: '#e7c44a', roughness: 0.6 });
    const centreI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.007, 8, 6), centreMat, Math.max(1, flowers.length));
    place(centreI, flowers, 0.024, 1, 0);
    centreI.count = flowers.length;

    const vineMat = new THREE.MeshStandardMaterial({ color: '#4a6a22', roughness: 0.75 });
    const vines = mesh.vines
      .filter((v) => v.length >= 12)
      .map((v) => {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i < v.length; i += 3) pts.push(new THREE.Vector3(v[i], v[i + 1], v[i + 2]));
        const curve = new THREE.CatmullRomCurve3(pts);
        return new THREE.Mesh(new THREE.TubeGeometry(curve, pts.length * 3, 0.011, 5, false), vineMat);
      });
    return { objs: [leafI, mossI, flowerI, centreI, ...vines] };
  }, [mesh, lite]);

  useEffect(() => () => {
    built.objs.forEach((o) => { o.geometry.dispose(); (o.material as THREE.Material).dispose(); });
  }, [built]);

  return (
    <>
      {built.objs.map((o, i) => <primitive key={i} object={o} />)}
    </>
  );
}

/* ------------------------------------------------------------------ */
export const ADAM_POSE: HandPose = {
  fingers: [
    { curl: [0.12, 0.22, 0.16], spread: -0.06 },
    { curl: [0.75, 0.95, 0.6], spread: -0.01 },
    { curl: [0.95, 1.05, 0.7], spread: 0.03 },
    { curl: [1.05, 1.05, 0.7], spread: 0.08 },
  ],
  thumb: { curl: [0.25, 0.35], tuck: 0.35 },
  wrist: -0.12,
  mirror: true,
  seed: 3,
};
export const CREATOR_POSE: HandPose = {
  fingers: [
    { curl: [0.02, 0.06, 0.06], spread: -0.05 },
    { curl: [0.45, 0.65, 0.45], spread: 0 },
    { curl: [0.62, 0.8, 0.55], spread: 0.04 },
    { curl: [0.78, 0.88, 0.6], spread: 0.1 },
  ],
  thumb: { curl: [0.15, 0.2], tuck: 0.15 },
  wrist: 0.05,
  seed: 11,
};

/**
 * A monumental weathered-bronze hand with vines, moss and small white flowers.
 * Renders nothing until the worker has delivered the mesh, then fades in.
 */
export function StoneHand({ pose, quality = 'high', ...props }: { pose: HandPose; quality?: HandQuality } & ThreeElements['group']) {
  const h = STEP[quality];
  const [mesh, setMesh] = useState<HandMesh | null>(null);
  useEffect(() => {
    let live = true;
    generate(pose, h).then((m) => live && setMesh(m));
    return () => { live = false; };
  }, [pose, h]);

  const geometry = useMemo(() => {
    if (!mesh) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(mesh.normals, 3));
    g.setAttribute('color', new THREE.BufferAttribute(mesh.colors, 3));
    g.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
    g.computeBoundingSphere();
    return g;
  }, [mesh]);
  useEffect(() => () => geometry?.dispose(), [geometry]);

  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.35, envMapIntensity: 1.1 }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  if (!mesh || !geometry) return <group {...props} />;
  return (
    <group {...props}>
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      <Decor mesh={mesh} lite={quality === 'low'} />
    </group>
  );
}
