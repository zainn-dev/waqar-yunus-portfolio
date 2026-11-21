/*
 * Sculpted stone hands, built from a signed distance field.
 *
 * A hand is a handful of tapered capsules (forearm, metacarpals, three phalanges per finger,
 * thumb) plus an ellipsoid palm, blended with smooth-min so the joints read as carved stone
 * rather than sausages. The field is polygonised with Surface Nets (indexed, smooth), then
 * every vertex gets an SDF-derived normal, ambient occlusion and a weathered bronze/moss colour.
 * Vines are traced over the surface by projecting a path onto the field.
 *
 * Pure TypeScript, no three.js — it runs inside a Web Worker (see hand.worker.ts).
 * Hand space: wrist near x = -0.45, fingers point +X, back of the hand faces +Y, thumb on -Z
 * (a right hand, palm down). `mirror` flips Z to make a left hand.
 */

export type Vec = [number, number, number];
export interface FingerPose { curl: [number, number, number]; spread?: number }
export interface HandPose {
  /** index, middle, ring, pinky */
  fingers: [FingerPose, FingerPose, FingerPose, FingerPose];
  thumb: { curl: [number, number]; tuck?: number };
  /** wrist bend, radians (+ lifts the fingers) */
  wrist?: number;
  mirror?: boolean;
  /** where the forearm is broken off (hand-space x) */
  cut?: number;
  seed?: number;
}

export interface HandMesh {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  /** vine centre-lines: flat xyz arrays */
  vines: Float32Array[];
  /** leaf anchors: px,py,pz,nx,ny,nz,size,kind (kind 0 = leaf, 1 = moss, 2 = flower) */
  decor: Float32Array;
}

/* ---------------- small vector helpers ---------------- */
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: Vec, s: number): Vec => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: Vec) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: Vec): Vec => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** Rodrigues rotation of v about unit axis k. */
function rotate(v: Vec, k: Vec, t: number): Vec {
  const c = Math.cos(t), s = Math.sin(t);
  const kxv = cross(k, v);
  const kd = dot(k, v) * (1 - c);
  return [v[0] * c + kxv[0] * s + k[0] * kd, v[1] * c + kxv[1] * s + k[1] * kd, v[2] * c + kxv[2] * s + k[2] * kd];
}
/** Rotate direction d towards w by angle t. */
function towards(d: Vec, w: Vec, t: number): Vec {
  const ax = cross(d, w);
  const l = len(ax);
  if (l < 1e-6) return d;
  return rotate(d, [ax[0] / l, ax[1] / l, ax[2] / l], t);
}

/* ---------------- noise ---------------- */
function makeNoise(seed: number) {
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = seed * 9301 + 49297;
  for (let i = 255; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const fade = (t: number) => t * t * (3 - 2 * t);
  const h = (x: number, y: number, z: number) => perm[perm[perm[x & 255] + (y & 255)] + (z & 255)] / 255;
  /** value noise in [-1, 1] */
  return (x: number, y: number, z: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
    const l = (a: number, b: number, t: number) => a + (b - a) * t;
    const v = l(
      l(l(h(xi, yi, zi), h(xi + 1, yi, zi), xf), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), xf), yf),
      l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), xf), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), xf), yf),
      zf,
    );
    return v * 2 - 1;
  };
}

/* ---------------- primitives ---------------- */
interface Cone { a: Vec; ba: Vec; l2: number; rr: number; a2: number; il2: number; r1: number; r2: number; lo: Vec; hi: Vec }
function cone(a: Vec, b: Vec, r1: number, r2: number): Cone {
  const ba = sub(b, a);
  const l2 = dot(ba, ba);
  const rr = r1 - r2;
  const m = Math.max(r1, r2);
  return {
    a, ba, l2, rr, a2: l2 - rr * rr, il2: 1 / l2, r1, r2,
    lo: [Math.min(a[0], b[0]) - m, Math.min(a[1], b[1]) - m, Math.min(a[2], b[2]) - m],
    hi: [Math.max(a[0], b[0]) + m, Math.max(a[1], b[1]) + m, Math.max(a[2], b[2]) + m],
  };
}
/** iq's round cone. */
function sdCone(px: number, py: number, pz: number, c: Cone) {
  const pax = px - c.a[0], pay = py - c.a[1], paz = pz - c.a[2];
  const y = pax * c.ba[0] + pay * c.ba[1] + paz * c.ba[2];
  const z = y - c.l2;
  const xvx = pax * c.l2 - c.ba[0] * y, xvy = pay * c.l2 - c.ba[1] * y, xvz = paz * c.l2 - c.ba[2] * y;
  const x2 = xvx * xvx + xvy * xvy + xvz * xvz;
  const y2 = y * y * c.l2;
  const z2 = z * z * c.l2;
  const k = Math.sign(c.rr) * c.rr * c.rr * x2;
  if (Math.sign(z) * c.a2 * z2 > k) return Math.sqrt(x2 + z2) * c.il2 - c.r2;
  if (Math.sign(y) * c.a2 * y2 < k) return Math.sqrt(x2 + y2) * c.il2 - c.r1;
  return (Math.sqrt(x2 * c.a2 * c.il2) + y * c.rr) * c.il2 - c.r1;
}
/** Cheap lower bound: distance to the cone's AABB. */
function boxDist(px: number, py: number, pz: number, c: { lo: Vec; hi: Vec }) {
  const dx = Math.max(c.lo[0] - px, 0, px - c.hi[0]);
  const dy = Math.max(c.lo[1] - py, 0, py - c.hi[1]);
  const dz = Math.max(c.lo[2] - pz, 0, pz - c.hi[2]);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
function smin(a: number, b: number, k: number) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/* ---------------- the hand ---------------- */
const FINGERS = [
  // knuckle, segment lengths, base radius, tip radius
  { k: [0.40, 0.0, -0.245] as Vec, l: [0.40, 0.25, 0.2], r0: 0.088, r1: 0.066 },
  { k: [0.43, 0.012, -0.08] as Vec, l: [0.44, 0.28, 0.21], r0: 0.09, r1: 0.067 },
  { k: [0.40, 0.0, 0.08] as Vec, l: [0.41, 0.26, 0.2], r0: 0.085, r1: 0.064 },
  { k: [0.33, -0.025, 0.225] as Vec, l: [0.32, 0.2, 0.17], r0: 0.074, r1: 0.058 },
];

export function createHandField(pose: HandPose) {
  const noise = makeNoise(pose.seed ?? 7);
  const wrist = pose.wrist ?? 0;
  const pivot: Vec = [-0.42, 0, 0];
  const bend = (v: Vec): Vec => add(rotate(sub(v, pivot), [0, 0, 1], wrist), pivot);
  const bendDir = (v: Vec): Vec => rotate(v, [0, 0, 1], wrist);

  const forearm = cone([-0.44, 0.0, 0.0], [-2.4, 0.03, 0.0], 0.225, 0.3);
  const meta: Cone[] = [];
  const fingers: Cone[][] = [];
  FINGERS.forEach((f, i) => {
    const kn = bend(f.k);
    meta.push(cone(bend([-0.32, 0.02, f.k[2] * 0.6]), kn, 0.075, 0.08));
    const fp = pose.fingers[i];
    let d: Vec = bendDir(norm([1, 0, (fp.spread ?? 0) + f.k[2] * 0.12]));
    let p = kn;
    const segs: Cone[] = [];
    for (let s = 0; s < 3; s++) {
      d = towards(d, bendDir([0, -1, 0]), fp.curl[s]);
      const q = add(p, mul(d, f.l[s]));
      const ra = f.r0 + (f.r1 - f.r0) * (s / 3);
      const rb = f.r0 + (f.r1 - f.r0) * ((s + 1) / 3);
      segs.push(cone(p, q, ra, rb * (s === 2 ? 0.92 : 1)));
      p = q;
    }
    fingers.push(segs);
  });
  // thumb: metacarpal from the wrist base, then two phalanges that fold in under the palm
  const t0 = bend([-0.3, -0.07, -0.2]);
  const t1 = bend([-0.04, -0.12, -0.4]);
  let td: Vec = bendDir(norm([0.8, -0.12, -0.4]));
  const inward = bendDir(norm([0.2, -0.45, 1]));
  td = towards(td, inward, pose.thumb.tuck ?? 0);
  const thumb: Cone[] = [cone(t0, t1, 0.12, 0.105)];
  let tp = t1;
  [0.3, 0.24].forEach((l, s) => {
    td = towards(td, inward, pose.thumb.curl[s]);
    const q = add(tp, mul(td, l));
    thumb.push(cone(tp, q, s === 0 ? 0.1 : 0.088, s === 0 ? 0.088 : 0.07));
    tp = q;
  });

  const palmC: Vec = [-0.01, -0.025, -0.005];
  const palmR: Vec = [0.45, 0.115, 0.34];
  const cut = pose.cut ?? -1.55;
  const mirror = pose.mirror ? -1 : 1;
  const all = [forearm, ...meta, ...fingers.flat(), ...thumb];
  const fBounds = fingers.map(groupBounds);

  const sdf = (x: number, y: number, zIn: number) => {
    const z = zIn * mirror;
    // palm ellipsoid in the (un-bent) palm frame
    const lx0 = x - pivot[0], ly0 = y - pivot[1];
    const cw = Math.cos(-wrist), sw = Math.sin(-wrist);
    const lx = lx0 * cw - ly0 * sw + pivot[0] - palmC[0];
    const ly = lx0 * sw + ly0 * cw + pivot[1] - palmC[1];
    const lz = z - palmC[2];
    const k0 = Math.sqrt((lx / palmR[0]) ** 2 + (ly / palmR[1]) ** 2 + (lz / palmR[2]) ** 2);
    const k1 = Math.sqrt((lx / palmR[0] ** 2) ** 2 + (ly / palmR[1] ** 2) ** 2 + (lz / palmR[2] ** 2) ** 2);
    let d = k1 > 0 ? (k0 * (k0 - 1)) / k1 : -0.1;

    for (const m of meta) d = smin(d, sdCone(x, y, z, m), 0.09);
    d = smin(d, sdCone(x, y, z, forearm), 0.18);

    let f = 1e9;
    for (let fi = 0; fi < 4; fi++) {
      if (boxDist(x, y, z, fBounds[fi]) > 0.25) continue;
      const segs = fingers[fi];
      let fd = sdCone(x, y, z, segs[0]);
      fd = smin(fd, sdCone(x, y, z, segs[1]), 0.025);
      fd = smin(fd, sdCone(x, y, z, segs[2]), 0.02);
      f = Math.min(f, fd);
    }
    d = smin(d, f, 0.075);
    let td2 = sdCone(x, y, z, thumb[0]);
    td2 = smin(td2, sdCone(x, y, z, thumb[1]), 0.03);
    td2 = smin(td2, sdCone(x, y, z, thumb[2]), 0.025);
    d = smin(d, td2, 0.11);

    // weathering: broad lumps + fine pitting
    d += 0.009 * noise(x * 4.2, y * 4.2, z * 4.2) + 0.004 * noise(x * 15, y * 15, z * 15);
    // broken-off forearm
    const plane = -(x - cut + 0.05 * noise(y * 5, z * 5, 3.1));
    return Math.max(d, plane);
  };

  // bounds
  const lo: Vec = [Infinity, Infinity, Infinity];
  const hi: Vec = [-Infinity, -Infinity, -Infinity];
  for (const c of all) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], c.lo[i]); hi[i] = Math.max(hi[i], c.hi[i]); }
  lo[0] = Math.max(lo[0], cut - 0.1);
  lo[1] = Math.min(lo[1], palmC[1] - palmR[1] - 0.05);
  hi[1] = Math.max(hi[1], palmC[1] + palmR[1] + 0.05);
  if (mirror < 0) { const a = -hi[2], b = -lo[2]; lo[2] = a; hi[2] = b; }
  for (let i = 0; i < 3; i++) { lo[i] -= 0.06; hi[i] += 0.06; }

  return { sdf, lo, hi, noise, mirror };
}

// segment-group bounds cache
const boundCache = new WeakMap<Cone[], { lo: Vec; hi: Vec }>();
function groupBounds(segs: Cone[]) {
  let b = boundCache.get(segs);
  if (!b) {
    const lo: Vec = [Infinity, Infinity, Infinity], hi: Vec = [-Infinity, -Infinity, -Infinity];
    for (const c of segs) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], c.lo[i]); hi[i] = Math.max(hi[i], c.hi[i]); }
    b = { lo, hi };
    boundCache.set(segs, b);
  }
  return b;
}

/* ---------------- surface nets ---------------- */
export function buildHand(pose: HandPose, h = 0.016): HandMesh {
  const { sdf, lo, hi, noise, mirror } = createHandField(pose);
  const nx = Math.ceil((hi[0] - lo[0]) / h) + 1;
  const ny = Math.ceil((hi[1] - lo[1]) / h) + 1;
  const nz = Math.ceil((hi[2] - lo[2]) / h) + 1;
  const F = new Float32Array(nx * ny * nz);
  const idx = (x: number, y: number, z: number) => x + nx * (y + ny * z);

  // Sample, skipping work far from the surface with a coarse pre-pass.
  const C = 4;
  for (let z0 = 0; z0 < nz; z0 += C) {
    for (let y0 = 0; y0 < ny; y0 += C) {
      for (let x0 = 0; x0 < nx; x0 += C) {
        const cx = lo[0] + (x0 + C / 2) * h, cy = lo[1] + (y0 + C / 2) * h, cz = lo[2] + (z0 + C / 2) * h;
        const dc = sdf(cx, cy, cz);
        const far = Math.abs(dc) > C * h * 1.2 + 0.03;
        for (let z = z0; z < Math.min(z0 + C, nz); z++) {
          for (let y = y0; y < Math.min(y0 + C, ny); y++) {
            for (let x = x0; x < Math.min(x0 + C, nx); x++) {
              F[idx(x, y, z)] = far ? dc : sdf(lo[0] + x * h, lo[1] + y * h, lo[2] + z * h);
            }
          }
        }
      }
    }
  }

  const cell = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const cidx = (x: number, y: number, z: number) => x + (nx - 1) * (y + (ny - 1) * z);
  const pos: number[] = [];
  const corners = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const v = new Float32Array(8);
  for (let z = 0; z < nz - 1; z++) {
    for (let y = 0; y < ny - 1; y++) {
      for (let x = 0; x < nx - 1; x++) {
        let mask = 0;
        for (let i = 0; i < 8; i++) {
          v[i] = F[idx(x + corners[i][0], y + corners[i][1], z + corners[i][2])];
          if (v[i] < 0) mask |= 1 << i;
        }
        if (mask === 0 || mask === 255) continue;
        let sx = 0, sy = 0, sz = 0, n = 0;
        for (const [a, b] of edges) {
          if ((v[a] < 0) === (v[b] < 0)) continue;
          const t = v[a] / (v[a] - v[b]);
          sx += corners[a][0] + (corners[b][0] - corners[a][0]) * t;
          sy += corners[a][1] + (corners[b][1] - corners[a][1]) * t;
          sz += corners[a][2] + (corners[b][2] - corners[a][2]) * t;
          n++;
        }
        cell[cidx(x, y, z)] = pos.length / 3;
        pos.push(lo[0] + (x + sx / n) * h, lo[1] + (y + sy / n) * h, lo[2] + (z + sz / n) * h);
      }
    }
  }

  const vcount = pos.length / 3;
  const positions = new Float32Array(pos);
  const normals = new Float32Array(vcount * 3);
  const e = h * 0.5;
  const grad = (x: number, y: number, z: number): Vec => norm([
    sdf(x + e, y, z) - sdf(x - e, y, z),
    sdf(x, y + e, z) - sdf(x, y - e, z),
    sdf(x, y, z + e) - sdf(x, y, z - e),
  ]);
  for (let i = 0; i < vcount; i++) {
    // one Newton step pulls the vertex onto the true surface
    let px = positions[i * 3], py = positions[i * 3 + 1], pz = positions[i * 3 + 2];
    const g = grad(px, py, pz);
    const d = sdf(px, py, pz);
    px -= g[0] * d; py -= g[1] * d; pz -= g[2] * d;
    positions[i * 3] = px; positions[i * 3 + 1] = py; positions[i * 3 + 2] = pz;
    normals[i * 3] = g[0]; normals[i * 3 + 1] = g[1]; normals[i * 3 + 2] = g[2];
  }

  const tris: number[] = [];
  const quad = (a: number, b: number, c: number, d: number, outward: Vec) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    const pa: Vec = [positions[a * 3], positions[a * 3 + 1], positions[a * 3 + 2]];
    const pb: Vec = [positions[b * 3], positions[b * 3 + 1], positions[b * 3 + 2]];
    const pc: Vec = [positions[c * 3], positions[c * 3 + 1], positions[c * 3 + 2]];
    const fn = cross(sub(pb, pa), sub(pc, pa));
    if (dot(fn, outward) >= 0) tris.push(a, b, c, a, c, d);
    else tris.push(a, c, b, a, d, c);
  };
  for (let z = 0; z < nz - 1; z++) {
    for (let y = 0; y < ny - 1; y++) {
      for (let x = 0; x < nx - 1; x++) {
        const c0 = cell[cidx(x, y, z)];
        if (c0 < 0) continue;
        const f0 = F[idx(x, y, z)];
        // edge along +x from this cell's min corner — shared with cells at -y, -z
        if (y > 0 && z > 0) {
          const f1 = F[idx(x + 1, y, z)];
          if ((f0 < 0) !== (f1 < 0)) quad(c0, cell[cidx(x, y - 1, z)], cell[cidx(x, y - 1, z - 1)], cell[cidx(x, y, z - 1)], [f0 < 0 ? 1 : -1, 0, 0]);
        }
        if (x > 0 && z > 0) {
          const f1 = F[idx(x, y + 1, z)];
          if ((f0 < 0) !== (f1 < 0)) quad(c0, cell[cidx(x - 1, y, z)], cell[cidx(x - 1, y, z - 1)], cell[cidx(x, y, z - 1)], [0, f0 < 0 ? 1 : -1, 0]);
        }
        if (x > 0 && y > 0) {
          const f1 = F[idx(x, y, z + 1)];
          if ((f0 < 0) !== (f1 < 0)) quad(c0, cell[cidx(x - 1, y, z)], cell[cidx(x - 1, y - 1, z)], cell[cidx(x, y - 1, z)], [0, 0, f0 < 0 ? 1 : -1]);
        }
      }
    }
  }

  /* --- colour: weathered dark bronze, moss in the hollows facing the sky, AO --- */
  const colors = new Float32Array(vcount * 3);
  // moss grows in a few patches on sky-facing surfaces
  const mossAt = (x: number, y: number, z: number, ny2: number) =>
    Math.max(0, Math.min(1, (noise(x * 2.6 + 11, y * 2.6, z * 2.6) - 0.28 + (ny2 - 0.55) * 0.6) * 3.2));
  for (let i = 0; i < vcount; i++) {
    const px = positions[i * 3], py = positions[i * 3 + 1], pz = positions[i * 3 + 2];
    const n: Vec = [normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]];
    let occ = 0, sca = 1;
    for (let k = 1; k <= 4; k++) {
      const hh = 0.025 * k;
      occ += (hh - sdf(px + n[0] * hh, py + n[1] * hh, pz + n[2] * hh)) * sca;
      sca *= 0.7;
    }
    const ao = Math.max(0.2, Math.min(1, 1 - occ * 4.2));
    const v1 = noise(px * 6, py * 6, pz * 6) * 0.5 + 0.5;
    const v2 = noise(px * 22 + 5, py * 22, pz * 22) * 0.5 + 0.5;
    // bronze-stone base
    let r = 0.33 + v1 * 0.1 + v2 * 0.05;
    let g = 0.34 + v1 * 0.1 + v2 * 0.05;
    let b = 0.3 + v1 * 0.08 + v2 * 0.04;
    // verdigris streaks
    const streak = Math.max(0, noise(px * 2.2, py * 9, pz * 2.2) - 0.35) * 0.8;
    r -= streak * 0.06; g += streak * 0.02; b += streak * 0.01;
    // moss
    const m = mossAt(px, py, pz, n[1]) * (v2 > 0.35 ? 1 : 0.6);
    r = r + (0.3 - r) * m * 0.8; g = g + (0.42 - g) * m * 0.8; b = b + (0.16 - b) * m * 0.8;
    const shade = 0.25 + 0.75 * ao;
    // authored in sRGB, vertex colours are linear
    colors[i * 3] = Math.pow(r * shade, 2.2); colors[i * 3 + 1] = Math.pow(g * shade, 2.2); colors[i * 3 + 2] = Math.pow(b * shade, 2.2);
  }

  /* --- vines: helix around the forearm, then over the back of the hand --- */
  const project = (p: Vec, off: number): { p: Vec; n: Vec } => {
    let q = p;
    for (let k = 0; k < 8; k++) {
      const g = grad(q[0], q[1], q[2]);
      q = sub(q, mul(g, sdf(q[0], q[1], q[2])));
    }
    const g = grad(q[0], q[1], q[2]);
    return { p: add(q, mul(g, off)), n: g };
  };
  const vinePaths: Vec[][] = [];
  const cut = pose.cut ?? -1.55;
  const route = (phase: number, turns: number, tail: Vec[]) => {
    const pts: Vec[] = [];
    const x0 = cut + 0.08, x1 = -0.5;
    const steps = 90;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const a = phase + t * turns * Math.PI * 2;
      pts.push([x0 + (x1 - x0) * t, Math.cos(a) * 0.6, Math.sin(a) * 0.6 * mirror]);
    }
    for (const q of tail) pts.push([q[0], q[1], q[2] * mirror]);
    return pts;
  };
  vinePaths.push(route(0.4, 1.6, [[-0.32, 0.5, -0.06], [-0.12, 0.5, -0.14], [0.12, 0.5, -0.2], [0.34, 0.5, -0.24], [0.55, 0.45, -0.26], [0.75, 0.45, -0.27]]));
  vinePaths.push(route(2.6, 1.2, [[-0.3, 0.5, 0.14], [-0.05, 0.5, 0.2], [0.2, 0.5, 0.22]]));
  const vines: Float32Array[] = [];
  const decor: number[] = [];
  let rs = (pose.seed ?? 7) * 1013 + 17;
  const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
  for (const raw of vinePaths) {
    // densify so neighbouring points project onto the same part of the surface
    const path: Vec[] = [];
    raw.forEach((p, i) => {
      if (i === 0) { path.push(p); return; }
      const a = raw[i - 1];
      const n = Math.max(1, Math.ceil(len(sub(p, a)) / 0.035));
      for (let k = 1; k <= n; k++) path.push(add(a, mul(sub(p, a), k / n)));
    });
    const out: number[] = [];
    let prev: Vec | null = null;
    path.forEach((p) => {
      const s = project(p, 0.014);
      // drop points that snapped onto a different part of the surface
      if (prev && len(sub(s.p, prev)) > 0.12) return;
      out.push(...s.p);
      prev = s.p;
      // leaves along the vine, in little clusters
      const leaves = rnd() < 0.45 ? 1 + Math.floor(rnd() * 2) : 0;
      for (let l = 0; l < leaves; l++) {
        decor.push(s.p[0] + (rnd() - 0.5) * 0.05, s.p[1] + (rnd() - 0.5) * 0.02, s.p[2] + (rnd() - 0.5) * 0.05, s.n[0], s.n[1], s.n[2], 0.7 + rnd() * 0.7, 0);
      }
      if (rnd() < 0.04) decor.push(s.p[0], s.p[1], s.p[2], s.n[0], s.n[1], s.n[2], 0.8 + rnd() * 0.5, 2);
    });
    vines.push(new Float32Array(out));
  }
  // moss tufts and a few flowers on sky-facing, mossy vertices
  const vineDecor = decor.length;
  for (let k = 0; k < 6000 && decor.length < vineDecor + 8 * 260; k++) {
    const i = Math.floor(rnd() * vcount);
    const px = positions[i * 3], py = positions[i * 3 + 1], pz = positions[i * 3 + 2];
    const nyv = normals[i * 3 + 1];
    if (nyv < 0.25) continue;
    const m = mossAt(px, py, pz, nyv);
    if (m < 0.7) continue;
    const kind = rnd() < 0.03 ? 2 : rnd() < 0.35 ? 0 : 1;
    decor.push(px, py, pz, normals[i * 3], nyv, normals[i * 3 + 2], 0.6 + rnd() * 0.8, kind);
  }

  return { positions, normals, colors, indices: new Uint32Array(tris), vines, decor: new Float32Array(decor) };
}
