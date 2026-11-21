import type { ThreeElements } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Laptop } from '@/components/three/Props';

/**
 * THE AVATAR — a full-body humanoid GLB, posed procedurally (no animation clips needed).
 *
 * Temporary model: the Ready Player Me sample avatar shipped with the three.js examples,
 * restyled in code (open grey hoodie over a white tee, black trousers, white trainers, curly hair,
 * full beard, glasses).
 *
 * To use YOUR avatar: create a full-body avatar (e.g. avaturn.me from a selfie, or any
 * Mixamo-rigged character), export GLB, save it as /public/models/avatar.glb.
 * Any rig with the standard humanoid bone names (Hips, Spine, LeftArm, LeftForeArm, LeftUpLeg,
 * LeftLeg, Head…, with or without the "mixamorig" prefix) works with every pose below.
 * Set ACCESSORIES = false if your avatar already has hair/glasses.
 */
export const AVATAR_URL = '/models/avatar.glb';
const ACCESSORIES = true;

export type AvatarPose = 'sit-laptop' | 'sit-desk' | 'stand' | 'wave';

type Dir = [number, number, number];
/** Target bone directions in the character's own frame: +X = character's left, +Y = up, +Z = facing. */
type PoseSpec = Partial<Record<string, Dir>>;

const SIT_LEGS: PoseSpec = {
  'LeftUpLeg>LeftLeg': [0.1, 0.02, 1], 'RightUpLeg>RightLeg': [-0.1, 0.02, 1],
  'LeftLeg>LeftFoot': [0.03, -1, 0.12], 'RightLeg>RightFoot': [-0.03, -1, 0.06],
  'LeftFoot>LeftToeBase': [0.05, -0.45, 1], 'RightFoot>RightToeBase': [-0.05, -0.45, 1],
};
const STAND_LEGS: PoseSpec = {
  'LeftUpLeg>LeftLeg': [0.04, -1, 0.02], 'RightUpLeg>RightLeg': [-0.04, -1, 0.02],
  'LeftLeg>LeftFoot': [0.0, -1, -0.04], 'RightLeg>RightFoot': [0.0, -1, -0.04],
  'LeftFoot>LeftToeBase': [0.06, -0.5, 1], 'RightFoot>RightToeBase': [-0.06, -0.5, 1],
};
/** Relative forward pitch (radians) per spine bone, applied on top of the rest pose. */
const LEAN: Record<AvatarPose, Partial<Record<string, number>>> = {
  'sit-laptop': { Spine: 0.06, Spine1: 0.08, Spine2: 0.08, Neck: 0.06, Head: 0.16 },
  'sit-desk': { Spine: 0.03, Spine1: 0.05, Spine2: 0.05, Neck: 0.04, Head: 0.06 },
  stand: { Spine1: -0.02, Neck: 0.04, Head: 0.04 },
  wave: { Spine1: -0.02, Neck: 0.04, Head: 0.02 },
};

const POSES: Record<AvatarPose, PoseSpec> = {
  'sit-laptop': {
    ...SIT_LEGS,
    'LeftArm>LeftForeArm': [0.3, -0.85, 0.42], 'RightArm>RightForeArm': [-0.3, -0.85, 0.42],
    'LeftForeArm>LeftHand': [-0.32, 0.12, 1], 'RightForeArm>RightHand': [0.32, 0.12, 1],
    'LeftHand>LeftHandMiddle1': [-0.1, -0.45, 1], 'RightHand>RightHandMiddle1': [0.1, -0.45, 1],
  },
  'sit-desk': {
    ...SIT_LEGS,
    'LeftLeg>LeftFoot': [0.06, -1, 0.0], 'RightLeg>RightFoot': [-0.06, -1, 0.0],
    'LeftArm>LeftForeArm': [0.28, -0.8, 0.55], 'RightArm>RightForeArm': [-0.28, -0.8, 0.55],
    'LeftForeArm>LeftHand': [-0.25, 0.08, 1], 'RightForeArm>RightHand': [0.25, 0.08, 1],
    'LeftHand>LeftHandMiddle1': [-0.1, -0.35, 1], 'RightHand>RightHandMiddle1': [0.1, -0.35, 1],
  },
  stand: {
    ...STAND_LEGS,
    'LeftArm>LeftForeArm': [0.17, -1, -0.02], 'RightArm>RightForeArm': [-0.17, -1, -0.02],
    'LeftForeArm>LeftHand': [0.06, -1, 0.22], 'RightForeArm>RightHand': [-0.06, -1, 0.22],
    'LeftHand>LeftHandMiddle1': [0.02, -1, 0.15], 'RightHand>RightHandMiddle1': [-0.02, -1, 0.15],
  },
  wave: {
    ...STAND_LEGS,
    'LeftArm>LeftForeArm': [0.17, -1, -0.02], 'LeftForeArm>LeftHand': [0.06, -1, 0.22], 'LeftHand>LeftHandMiddle1': [0.02, -1, 0.15],
    'RightArm>RightForeArm': [-0.9, 0.12, 0.25], 'RightForeArm>RightHand': [-0.12, 1, 0.12], 'RightHand>RightHandMiddle1': [-0.05, 1, 0.1],
  },
};

const clean = (n: string) => n.replace(/^mixamorig[:_]?/i, '').replace(/^.*:/, '');

/* ------------------------------ helpers ------------------------------ */
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const curl = (x: number, y: number, z: number, f: number) =>
  Math.sin(x * f + Math.sin(z * f * 0.55) * 2) * Math.sin(z * f * 0.9 + Math.sin(y * f * 0.45) * 2) * Math.sin(y * f * 0.8 + x * f * 0.25);

type Surface = { shell: THREE.BufferGeometry; pos: ArrayLike<number>; idx: ArrayLike<number> };

/** Scatter `count` points over a triangle soup (area weighted). */
function scatter({ pos, idx }: Surface, count: number, seed: number) {
  const tris = idx.length / 3;
  const area = new Float32Array(tris);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3();
  let total = 0;
  for (let t = 0; t < tris; t++) {
    a.fromArray(pos, idx[t * 3] * 3); b.fromArray(pos, idx[t * 3 + 1] * 3); c.fromArray(pos, idx[t * 3 + 2] * 3);
    total += ab.subVectors(b, a).cross(ac.subVectors(c, a)).length() / 2;
    area[t] = total;
  }
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const out: { p: THREE.Vector3; n: THREE.Vector3; r: number }[] = [];
  for (let i = 0; i < count && tris > 0; i++) {
    const x = rnd() * total;
    let lo = 0, hi = tris - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (area[m] < x) lo = m + 1; else hi = m; }
    a.fromArray(pos, idx[lo * 3] * 3); b.fromArray(pos, idx[lo * 3 + 1] * 3); c.fromArray(pos, idx[lo * 3 + 2] * 3);
    let u = rnd(), v = rnd();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const p = a.clone().multiplyScalar(1 - u - v).addScaledVector(b, u).addScaledVector(c, v);
    const n = ab.subVectors(b, a).cross(ac.subVectors(c, a)).normalize().clone();
    out.push({ p, n, r: rnd() });
  }
  return out;
}

/** Instanced little curl blobs over a surface: reads as tight curly hair. */
function curls(points: ReturnType<typeof scatter>, size: number, mat: THREE.Material) {
  const inst = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat, Math.max(1, points.length));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  points.forEach((pt, i) => {
    q.setFromUnitVectors(up, pt.n);
    const k = size * (0.7 + pt.r * 0.6);
    sc.set(k, k * 0.7, k);
    m4.compose(pt.p, q, sc);
    inst.setMatrixAt(i, m4);
  });
  inst.count = points.length;
  inst.castShadow = true;
  return inst;
}

/** Re-parent an object authored in the model's bind space onto `bone`, keeping it in place. */
function attach(bone: THREE.Object3D, obj: THREE.Object3D) {
  obj.applyMatrix4(new THREE.Matrix4().copy(bone.matrixWorld).invert());
  bone.add(obj);
}

/* -------------------- sample-avatar restyle (bind space) -------------------- */
/*
 * The bundled sample is a Ready Player Me avatar in a tailcoat. The helpers below turn it into
 * the hoodie / beard / curls look. They only run when that exact sample is loaded (vertex counts
 * match), so your own avatar.glb is left as it is.
 */
const SAMPLE_TOP_VERTS = 2251;
const SAMPLE_HEAD_VERTS = 2162;
const HEM = 0.9;
const HOODIE = '#8b8e94';
const NECKLINE = 1.535;
const HAIR = '#16110e';

function restyleTop(geo: THREE.BufferGeometry) {
  if (geo.userData.restyled) return;
  geo.userData.restyled = true;
  const P = geo.attributes.position as THREE.BufferAttribute;
  const n = P.count;
  // weld by position, then union-find over triangles → connected shells
  const keyOf = (i: number) => `${Math.round(P.getX(i) * 1e4)},${Math.round(P.getY(i) * 1e4)},${Math.round(P.getZ(i) * 1e4)}`;
  const ids = new Map<string, number>();
  const w = new Int32Array(n);
  for (let i = 0; i < n; i++) { const k = keyOf(i); if (!ids.has(k)) ids.set(k, ids.size); w[i] = ids.get(k)!; }
  const par = Array.from({ length: ids.size }, (_, i) => i);
  const find = (x: number) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  const index = geo.index!;
  for (let t = 0; t < index.count; t += 3) {
    const a = find(w[index.getX(t)]);
    par[find(w[index.getX(t + 1)])] = a;
    par[find(w[index.getX(t + 2)])] = a;
  }
  type Comp = { n: number; min: THREE.Vector3; max: THREE.Vector3; kind: 'hoodie' | 'tee' | 'drop' };
  const comps = new Map<number, Comp>();
  const rootOf = new Int32Array(n);
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const r = find(w[i]);
    rootOf[i] = r;
    let c = comps.get(r);
    if (!c) { c = { n: 0, min: new THREE.Vector3(1e9, 1e9, 1e9), max: new THREE.Vector3(-1e9, -1e9, -1e9), kind: 'drop' }; comps.set(r, c); }
    c.n++;
    v.fromBufferAttribute(P, i);
    c.min.min(v); c.max.max(v);
  }
  const biggest = [...comps.values()].sort((a, b) => b.n - a.n)[0];
  comps.forEach((c) => {
    const cx = (c.min.x + c.max.x) / 2, wx = c.max.x - c.min.x;
    if (c === biggest) c.kind = 'hoodie';
    else if (Math.abs(cx) > 0.37 && c.n >= 80) c.kind = 'hoodie'; // ribbed cuffs
    else if (wx >= 0.18) c.kind = 'tee'; // shirt front, collar, waistcoat → a plain tee
    // bow tie, buttonhole flower, buttons → dropped
  });
  // closed hoodie: the shirt/waistcoat shells take a slightly darker shade of the same fleece
  const hoodie = new THREE.Color(HOODIE), inner = new THREE.Color(HOODIE).multiplyScalar(0.93);
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) (comps.get(rootOf[i])!.kind === 'tee' ? inner : hoodie).toArray(col, i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  // new index: no trinkets, no coat tails
  const keep: number[] = [];
  for (let t = 0; t < index.count; t += 3) {
    const i0 = index.getX(t), i1 = index.getX(t + 1), i2 = index.getX(t + 2);
    const kind = comps.get(rootOf[i0])!.kind;
    if (kind === 'drop') continue;
    if (P.getY(i0) < HEM && P.getY(i1) < HEM && P.getY(i2) < HEM) continue;
    // the dress-shirt collar climbs the neck; a hoodie neckline sits low
    if (kind === 'tee' && P.getY(i0) > NECKLINE && P.getY(i1) > NECKLINE && P.getY(i2) > NECKLINE) continue;
    keep.push(i0, i1, i2);
  }
  for (let i = 0; i < n; i++) {
    if (P.getY(i) < HEM) P.setY(i, HEM);
    if (comps.get(rootOf[i])!.kind === 'tee' && P.getY(i) > NECKLINE) P.setY(i, NECKLINE);
  }
  geo.setIndex(keep);
  P.needsUpdate = true;
  geo.computeVertexNormals();
}

/** Beard region on the sample head (bind-space metres). Positive inside. */
function beardField(x: number, y: number, z: number) {
  const ax = Math.abs(x);
  const top = 1.668 + 0.05 * smooth(0.035, 0.075, ax); // rises into sideburns
  const zMin = 0.035 - 0.05 * smooth(0.04, 0.075, ax);
  const lips = Math.max(ax - 0.031, 1.641 - y, y - 1.667);
  const main = Math.min(top - y, y - 1.583, z - zMin, lips);
  const moustache = Math.min(1.678 - y, y - 1.664, 0.043 - ax, z - 0.11);
  return Math.max(main, moustache);
}

const beardCache = new WeakMap<THREE.BufferGeometry, Surface>();
function beardGeometry(head: THREE.BufferGeometry): Surface {
  const hit = beardCache.get(head);
  if (hit) return hit;
  const P = head.attributes.position as THREE.BufferAttribute;
  const N = head.attributes.normal as THREE.BufferAttribute;
  const n = P.count;
  const f = new Float32Array(n);
  for (let i = 0; i < n; i++) f[i] = beardField(P.getX(i), P.getY(i), P.getZ(i));
  const idx: number[] = [];
  const index = head.index!;
  const remap = new Map<number, number>();
  const pos: number[] = [];
  for (let t = 0; t < index.count; t += 3) {
    const tri = [index.getX(t), index.getX(t + 1), index.getX(t + 2)];
    if (tri.some((i) => f[i] <= 0)) continue;
    for (const i of tri) {
      let j = remap.get(i);
      if (j === undefined) {
        j = remap.size;
        remap.set(i, j);
        const soft = smooth(0, 0.012, f[i]);
        const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
        const off = 0.0012 + soft * (0.0035 + 0.0025 * Math.abs(curl(x, y, z, 260)));
        pos.push(x + N.getX(i) * off, y + N.getY(i) * off, z + N.getZ(i) * off);
      }
      idx.push(j);
    }
  }
  const shell = new THREE.BufferGeometry();
  const posArr = new Float32Array(pos);
  shell.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  shell.setIndex(idx);
  shell.computeVertexNormals();
  const out = { shell, pos: posArr, idx };
  beardCache.set(head, out);
  return out;
}

/** Curly hair: a fitted ellipsoid shell around the sample's skull, cut at a natural hairline. */
let hairCache: Surface | null = null;
function hairGeometry(): Surface {
  if (hairCache) return hairCache;
  const C = new THREE.Vector3(0, 1.745, 0.01);
  const R = new THREE.Vector3(0.084, 0.093, 0.101);
  const g = new THREE.SphereGeometry(1, 96, 64);
  const p = g.attributes.position as THREE.BufferAttribute;
  const keepV = new Uint8Array(p.count);
  const d = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    d.fromBufferAttribute(p, i).normalize();
    // hairline: high at the forehead, above the ears at the sides, low at the nape
    const front = smooth(0.15, 0.75, d.z), back = smooth(0.05, 0.7, -d.z);
    const yMin = 0.08 + front * 0.42 - back * 0.62;
    const inside = d.y - yMin;
    keepV[i] = inside > 0 ? 1 : 0;
    const edge = smooth(0, 0.18, inside);
    const c = Math.abs(curl(d.x, d.y, d.z, 26));
    const lift = 1.03 + edge * (0.07 + 0.06 * c + 0.05 * Math.max(0, d.y));
    p.setXYZ(i, C.x + d.x * R.x * lift, C.y + d.y * R.y * lift, C.z + d.z * R.z * lift);
  }
  const src = g.index!;
  const idx: number[] = [];
  for (let t = 0; t < src.count; t += 3) {
    const a = src.getX(t), b = src.getX(t + 1), c = src.getX(t + 2);
    if (keepV[a] && keepV[b] && keepV[c]) idx.push(a, b, c);
  }
  g.setIndex(idx);
  g.computeVertexNormals();
  hairCache = { shell: g, pos: p.array as Float32Array, idx };
  return hairCache;
}

/** A hood resting behind the neck plus two drawstrings, authored in bind space. */
function hoodGroup() {
  const mat = new THREE.MeshStandardMaterial({ color: HOODIE, roughness: 1 });
  const grp = new THREE.Group();
  // rolled hood rim around the back of the neck
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.098, 0.042, 14, 40, Math.PI * 1.3), mat);
  rim.position.set(0, 1.545, -0.012);
  rim.rotation.set(Math.PI / 2 + 0.42, 0, Math.PI * 0.15 + Math.PI);
  rim.scale.set(1.15, 1.05, 0.85);
  grp.add(rim);
  // fabric of the hood lying on the upper back
  const back = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat);
  back.position.set(0, 1.5, -0.1);
  back.rotation.x = -Math.PI / 2 - 0.12;
  back.scale.set(0.135, 0.055, 0.12);
  grp.add(back);
  // drawstrings
  const cord = new THREE.MeshStandardMaterial({ color: '#f2f1ec', roughness: 0.7 });
  const aglet = new THREE.MeshStandardMaterial({ color: '#cfcfcb', metalness: 0.6, roughness: 0.3 });
  for (const s of [-1, 1]) {
    const a = new THREE.Vector3(s * 0.042, 1.5, 0.112), b = new THREE.Vector3(s * 0.05, 1.355, 0.158);
    const dir = b.clone().sub(a).normalize();
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, a.distanceTo(b), 6), cord);
    string.position.copy(a).add(b).multiplyScalar(0.5);
    string.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    grp.add(string);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.018, 8), aglet);
    tip.position.copy(b).addScaledVector(dir, 0.008);
    tip.quaternion.copy(string.quaternion);
    grp.add(tip);
  }
  grp.traverse((o) => { o.castShadow = true; });
  return grp;
}

/** Round black glasses, authored in bind space in front of the eye bones. */
function glasses(bones: Map<string, THREE.Bone>) {
  const le = bones.get('LeftEye'), re = bones.get('RightEye');
  if (!le || !re) return null;
  const L = le.getWorldPosition(new THREE.Vector3()), R = re.getWorldPosition(new THREE.Vector3());
  const mid = L.clone().add(R).multiplyScalar(0.5);
  const k = L.distanceTo(R) / 0.064; // authored for 64 mm eye spacing
  const frame = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.35, metalness: 0.4 });
  const lens = new THREE.MeshPhysicalMaterial({ color: '#dfe8f2', roughness: 0.05, transparent: true, opacity: 0.18, metalness: 0 });
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.0225, 0.0027, 10, 40), frame);
    rim.position.set(s * 0.034, 0, 0);
    rim.scale.set(1.08, 0.88, 1);
    g.add(rim);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.0222, 32), lens);
    glass.position.copy(rim.position);
    glass.scale.copy(rim.scale);
    g.add(glass);
    const temple = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.1), frame);
    temple.position.set(s * 0.058, 0.006, -0.05);
    temple.rotation.y = s * 0.06;
    g.add(temple);
  }
  const bridge = new THREE.Mesh(new THREE.TorusGeometry(0.0085, 0.0024, 8, 16, Math.PI), frame);
  bridge.position.set(0, 0.003, 0);
  g.add(bridge);
  g.scale.setScalar(k);
  g.position.copy(mid).add(new THREE.Vector3(0, 0.002, 0.03 * k));
  return g;
}

/* ------------------------------ component ------------------------------ */
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _t = new THREE.Vector3();
const _qp = new THREE.Quaternion(), _qr = new THREE.Quaternion(), _qi = new THREE.Quaternion(), _qm = new THREE.Quaternion();
const SPINE = ['Spine', 'Spine1', 'Spine2', 'Neck', 'Head'];

/** Rotate `bone` by world-space rotation `qr`, keeping its parent untouched. */
function rotateWorld(bone: THREE.Object3D, qr: THREE.Quaternion) {
  bone.parent!.getWorldQuaternion(_qp);
  _qi.copy(_qp).invert();
  bone.quaternion.premultiply(_qp).premultiply(qr).premultiply(_qi);
  bone.updateMatrixWorld(true);
}

export function Avatar({ pose = 'stand', scale = 1, laptop = false, anchor = 'feet', look = true, ...props }: {
  pose?: AvatarPose; scale?: number; laptop?: boolean; anchor?: 'feet' | 'hips'; look?: boolean;
} & ThreeElements['group']) {
  const { scene } = useGLTF(AVATAR_URL);
  const state = useMemo(() => {
    const model = cloneSkinned(scene);
    const bones = new Map<string, THREE.Bone>();
    let headGeo: THREE.BufferGeometry | null = null;
    let sample = false;
    model.traverse((o) => {
      if ((o as THREE.Bone).isBone) bones.set(clean(o.name), o as THREE.Bone);
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      const src = m.material as THREE.MeshStandardMaterial;
      const name = `${src.name || ''} ${m.name}`;
      if (/headwear|hat/i.test(name)) { m.visible = false; return; }
      const mat = src.clone();
      if (/Outfit_Top/i.test(name) && m.geometry.attributes.position.count === SAMPLE_TOP_VERTS) {
        restyleTop(m.geometry);
        sample = true;
        mat.map = null; mat.normalMap = null; mat.vertexColors = true; mat.color.set('#ffffff'); mat.roughness = 1; mat.metalness = 0;
      } else if (/Outfit_Bottom/i.test(name)) { mat.map = null; mat.color.set('#1a1a1d'); mat.roughness = 0.85; }
      else if (/Footwear/i.test(name)) { mat.map = null; mat.color.set('#f1f1ef'); mat.roughness = 0.55; }
      if (/Wolf3D_Head/i.test(name)) headGeo = m.geometry;
      mat.needsUpdate = true;
      m.material = mat;
    });
    const rest = new Map<THREE.Bone, THREE.Quaternion>();
    bones.forEach((b) => rest.set(b, b.quaternion.clone()));
    model.updateMatrixWorld(true);

    const head = bones.get('Head');
    if (ACCESSORIES && head) {
      const g = glasses(bones);
      if (g) attach(head, g);
      const hg = headGeo as THREE.BufferGeometry | null;
      if (sample && hg && hg.attributes.position.count === SAMPLE_HEAD_VERTS) {
        model.traverse((o) => { if (/Wolf3D_Beard/i.test(o.name)) o.visible = false; }); // swap the moustache for a full beard
        const hairMat = new THREE.MeshStandardMaterial({ color: HAIR, roughness: 0.95 });
        const beard = beardGeometry(hg);
        const bg = new THREE.Group();
        bg.add(new THREE.Mesh(beard.shell, hairMat), curls(scatter(beard, 1500, 7), 0.0022, hairMat));
        attach(head, bg);
        const hair = hairGeometry();
        const hairG = new THREE.Group();
        hairG.add(new THREE.Mesh(hair.shell, hairMat), curls(scatter(hair, 3200, 3), 0.0052, hairMat));
        attach(head, hairG);
        const spine2 = bones.get('Spine2');
        if (spine2) attach(spine2, hoodGroup());
      }
    }
    model.updateMatrixWorld(true);
    const hips = bones.get('Hips');
    const hipsY = hips ? hips.getWorldPosition(new THREE.Vector3()).y : 1;
    return { model, bones, rest, hipsY, dirs: new Map<string, THREE.Vector3>(), leans: new Map<string, number>() };
  }, [scene]);

  const group = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const poseRef = useRef(pose);
  poseRef.current = pose;
  const posed = useRef(false);

  useEffect(() => () => {
    state.model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) (m.material as THREE.Material).dispose();
    });
  }, [state]);

  useFrame((s, delta) => {
    const { model, bones, rest, dirs, leans } = state;
    const cur = poseRef.current;
    const spec = POSES[cur];
    const t = s.clock.elapsedTime;
    const k = posed.current ? 1 - Math.pow(0.002, Math.min(delta, 0.1)) : 1; // smooth pose blending
    posed.current = true;
    pointer.current.x += (s.pointer.x - pointer.current.x) * 0.06;
    pointer.current.y += (s.pointer.y - pointer.current.y) * 0.06;

    rest.forEach((q, b) => b.quaternion.copy(q));
    model.updateMatrixWorld(true);
    model.getWorldQuaternion(_qm);

    // spine: relative forward lean + breathing (rotation about the character's left axis)
    const breathe = Math.sin(t * 1.6) * 0.012;
    _t.set(1, 0, 0).applyQuaternion(_qm);
    for (const bn of SPINE) {
      const bone = bones.get(bn);
      if (!bone) continue;
      const target = (LEAN[cur][bn] ?? 0) + (bn === 'Spine2' ? breathe : 0);
      const prev = leans.get(bn);
      const v = prev === undefined ? target : prev + (target - prev) * k;
      leans.set(bn, v);
      if (Math.abs(v) < 1e-4) continue;
      _qr.setFromAxisAngle(_t, v);
      rotateWorld(bone, _qr);
    }

    const typing = cur.startsWith('sit');
    const typeL = typing ? Math.max(0, Math.sin(t * 13)) * 0.09 : 0;
    const typeR = typing ? Math.max(0, Math.sin(t * 13 + 2.1)) * 0.09 : 0;
    const wave = cur === 'wave' ? Math.sin(t * 7) * 0.4 : 0;

    for (const key of Object.keys(spec)) {
      const [bn, cn] = key.split('>');
      const bone = bones.get(bn), child = bones.get(cn);
      if (!bone || !child) continue;
      const target = spec[key]!;
      _t.set(target[0], target[1], target[2]);
      if (bn === 'LeftHand') _t.y -= typeL;
      if (bn === 'RightHand') _t.y -= typeR;
      if (bn === 'RightForeArm' && cur === 'wave') _t.x += wave;
      _t.normalize();
      let dir = dirs.get(key);
      if (!dir) { dir = _t.clone(); dirs.set(key, dir); }
      dir.lerp(_t, k).normalize();
      _d.copy(dir).applyQuaternion(_qm); // character frame → world
      bone.getWorldPosition(_a);
      child.getWorldPosition(_b);
      _b.sub(_a).normalize();
      _qr.setFromUnitVectors(_b, _d);
      rotateWorld(bone, _qr);
    }

    // head follows the pointer a little
    const head = bones.get('Head');
    if (head && look) {
      _d.set(0, 1, 0).applyQuaternion(_qm);
      _qr.setFromAxisAngle(_d, pointer.current.x * 0.45);
      rotateWorld(head, _qr);
      _d.set(1, 0, 0).applyQuaternion(_qm);
      _qr.setFromAxisAngle(_d, -pointer.current.y * 0.18);
      rotateWorld(head, _qr);
    }
  });

  const offset = anchor === 'hips' ? -state.hipsY : 0;
  return (
    <group ref={group} {...props} scale={scale} dispose={null}>
      <group position={[0, offset, 0]}>
        <primitive object={state.model} />
        {laptop && (
          <Laptop position={[0, state.hipsY + 0.11, 0.36]} rotation={[0, Math.PI, 0]} scale={0.34} open={1.75} />
        )}
      </group>
    </group>
  );
}

useGLTF.preload(AVATAR_URL);
