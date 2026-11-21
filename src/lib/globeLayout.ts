/**
 * Where the home projects sit, in both of the home's states:
 *
 * - the gallery: one cluster (4 x 2 square cells) per project, laid out on a cell lattice
 *   (desktop 3 + 2, tablet 2 + 2 + 1, phone one column that scrolls);
 * - the globe: a ball of a controlled size in the middle of the free area, carrying each project
 *   exactly once, as a patch wrapped onto the sphere around its own centre direction.
 *
 * Shared by the WebGL scene (GlobeScene), the contact panel's little globe (WireGlobe) and the
 * panel's flight into the home globe (ContactBody), so they all agree on sizes and positions.
 * World units are CSS px, origin at the middle of the home section, y up.
 */

export type GlobeMode = 'gallery' | 'globe';
export type V3 = [number, number, number];

/** one grid cell of a cluster on the sphere, radians (a cluster spans 4 x 2 of them) */
export const CELL_ARC = (16 * Math.PI) / 180;
/** the ball's resting tilt: tipped a little towards the viewer, so the upper row reads best */
export const REST_PITCH = 0.12;
/** where the ball starts turned to: the first two projects either side of the front */
export const START_YAW = -0.5;
/** latitude of the two bands of patches, degrees */
const BAND = 22;

interface Pads { top: number; bottom: number; side: number }
const padsFor = (W: number): Pads =>
  W >= 1024 ? { top: 64, bottom: 100, side: Math.min(56, W * 0.04) } : W >= 600 ? { top: 56, bottom: 92, side: 24 } : { top: 52, bottom: 88, side: 16 };

export interface Gallery {
  /** one cell, px */
  step: number;
  /** each cluster's lower-left corner at scroll 0 */
  origins: [number, number][];
  /** a lattice point (the content's top-left) at scroll 0 */
  lattice: [number, number];
  /** how far the content scrolls (0 when it fits) */
  maxScroll: number;
  /** the visible band, world y: [bottom, top] */
  band: [number, number];
}

/** Rows of the gallery: column offsets (in cells) of the clusters in each row, and the lattice width. */
function rowsFor(W: number, n: number): { cols: number; rows: number[][] } {
  const rows: number[][] = [];
  if (W >= 1024) {
    // 3 + 2 + 3 + …, all on whole cells so the lattice runs through every gap
    const at: Record<number, number[]> = { 3: [0, 5, 10], 2: [2, 8], 1: [5] };
    for (let i = 0, r = 0; i < n; r++) {
      const c = Math.min(r % 2 ? 2 : 3, n - i);
      rows.push(at[c]);
      i += c;
    }
    return { cols: 14, rows };
  }
  if (W >= 600) {
    for (let i = 0; i < n; i += 2) rows.push(n - i >= 2 ? [0, 6] : [3]);
    return { cols: 10, rows };
  }
  for (let i = 0; i < n; i++) rows.push([0]);
  return { cols: 4, rows };
}

export function galleryFor(W: number, H: number, n: number): Gallery {
  const p = padsFor(W);
  const { cols, rows } = rowsFor(W, n);
  const cellsY = rows.length * 3 - 1; // 2 cells a row, 1 between rows
  const availW = W - 2 * p.side;
  const availH = Math.max(120, H - p.top - p.bottom);
  const phone = W < 600;
  const step = phone ? availW / cols : Math.min(availW / cols, availH / cellsY, 150);
  const content = cellsY * step;
  const top = H / 2 - p.top - Math.max(0, (availH - content) / 2);
  const left = (-cols * step) / 2;
  const origins: [number, number][] = [];
  rows.forEach((row, r) => row.forEach((c) => origins.push([left + c * step, top - (r * 3 + 2) * step])));
  return { step, origins, lattice: [left, top], maxScroll: Math.max(0, content - availH), band: [H / 2 - p.top - availH, H / 2 - p.top] };
}

/** The ball: centred in the free area between the top read-outs and the bottom bar. */
export function ballFor(W: number, H: number) {
  const p = padsFor(W);
  const availH = Math.max(120, H - p.top - p.bottom);
  const r = Math.max(90, Math.min(availH * 0.53, W * (W < 600 ? 0.44 : 0.32), 480));
  return { x: 0, y: (p.bottom - p.top) / 2, r };
}

export interface Patch { C: V3; E: V3; N: V3 }

function patchAt(latDeg: number, lonDeg: number): Patch {
  const f = (latDeg * Math.PI) / 180;
  const l = (lonDeg * Math.PI) / 180;
  return {
    C: [Math.cos(f) * Math.sin(l), Math.sin(f), Math.cos(f) * Math.cos(l)],
    E: [Math.cos(l), 0, -Math.sin(l)],
    N: [-Math.sin(f) * Math.sin(l), Math.cos(f), -Math.sin(f) * Math.cos(l)],
  };
}

/**
 * One patch per project, checkered on two bands: the upper band takes every other project
 * (0, 2, 4 …) evenly round the sphere, the lower band the rest, halfway between them.
 */
export function patchesFor(n: number): Patch[] {
  const up = Math.ceil(n / 2);
  return Array.from({ length: n }, (_, i) => {
    const k = Math.floor(i / 2);
    return i % 2 === 0 ? patchAt(BAND, (k * 360) / up) : patchAt(-BAND, (k * 360) / up + 180 / up);
  });
}

/**
 * A point of a cluster on the sphere (unit vector). (x, y) are cluster cells, x right 0..4,
 * y up 0..2. The cluster is wrapped round its centre with the exponential map, so tiles keep
 * their proportions instead of being stretched along latitude lines.
 */
export function patchDir(p: Patch, x: number, y: number): V3 {
  const ax = (x - 2) * CELL_ARC;
  const ay = (y - 1) * CELL_ARC;
  const r = Math.hypot(ax, ay);
  if (r < 1e-6) return [...p.C];
  const c = Math.cos(r);
  const s = Math.sin(r) / r;
  return [0, 1, 2].map((i) => c * p.C[i] + s * (ax * p.E[i] + ay * p.N[i])) as V3;
}

/** Rotation (row-major 3 x 3): yaw about the vertical axis, then pitch about the horizontal one. */
export function rotation(yaw: number, pitch: number): number[] {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  return [cy, 0, sy, sy * sp, cp, -cy * sp, -sy * cp, sp, cy * cp];
}

export const rotate = (m: number[], v: V3): V3 => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];
/** the inverse of a rotation is its transpose */
export const unrotate = (m: number[], v: V3): V3 => [
  m[0] * v[0] + m[3] * v[1] + m[6] * v[2],
  m[1] * v[0] + m[4] * v[1] + m[7] * v[2],
  m[2] * v[0] + m[5] * v[1] + m[8] * v[2],
];

/** Is the home (in its section) showing the globe right now? Read from the DOM, so anything can ask. */
export const homeShowsGlobe = () =>
  typeof document !== 'undefined' && Boolean(document.querySelector('section[data-phase][data-mode="globe"]'));
