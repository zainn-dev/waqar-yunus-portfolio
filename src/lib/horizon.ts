import { gsap } from '@/lib/gsap';

/*
 * The home "horizon" globe: one huge sphere seen square-on in orthographic projection, its crest
 * just above the top of the field, so the screen shows the upper front of it. The projects lie on
 * a flat page (clusters of 4 x 2 square cells) that is wrapped onto the sphere by arc length:
 *
 *   u = x / Ra + rot        v = y / Ra            (x, y: page px relative to the sphere's centre)
 *   X = pole.x + R cos v sin u                    Y = pole.y + R sin v        facing = cos v cos u
 *
 * Rows stay straight lines (latitudes), columns become meridian ellipses. R is the drawn radius
 * and Ra the one the angles are measured against: the same, except while the globe is shrunk into
 * a miniature (the contact dome, the intro), where the picture scales down but keeps its angles.
 *
 * Numbers come from labs.griflan.com (its globe config and motion table): radius 1.35 x the
 * field's half diagonal, crest -0.08 of its height, fade window, flank light, lattice weight.
 */

export const HZ = {
  /** R = half the field's diagonal x this */
  radius: 1.35,
  /** where the crest sits, as a share of the field height (negative: above the top edge) */
  crest: -0.08,
  /** how much the ball shrinks at full scroll speed */
  shrink: 0.12,
  /** scroll speed (px/s) that counts as "full" travel, and the in/out rates of that travel */
  velNorm: 900,
  velIn: 9,
  velOut: 3.5,
  /** tile fade window on the facing */
  fadeIn: -0.04,
  fadeOut: 0,
  /** lattice: line colour alpha, half width (px), limb outline strength in a miniature */
  lineAlpha: 0.2,
  halfW: 0.6,
  ringA: 0.9,
  /** how dark the flanks of the ball get */
  flank: 0.75,
  /** the page drifts up the ball on its own, px/s */
  drift: 33,
  /** clusters per row (a multiple of 5 so the five projects repeat in step round the seam) */
  cols: 10,
  /** cluster pitch in cells: 4 wide + 2 gap, 2 tall + 2 gap */
  pitchX: 6,
  pitchY: 4,
  /** half the gutter between tiles, in cells; tile corner radius, px */
  inset: 0.0213,
  corner: 5.33,
  /** motion table */
  stagger: 0.08,
  glide: 1.25,
  aim: 1.5,
  fade: 1,
  spread: 0.25,
} as const;

export const snappy = gsap.parseEase('snappy') as (t: number) => number;
export const p3io = gsap.parseEase('power3.inOut') as (t: number) => number;
export const p2io = gsap.parseEase('power2.inOut') as (t: number) => number;
export const p1o = gsap.parseEase('power1.out') as (t: number) => number;
/** the flight's in-shader ease (see the tile shader) */
export const easeT = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 2.8);
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** A cluster is 55rem wide on the reference (469px of a 1536px window); 25rem on phones. */
export const clusterWidth = (W: number) => (W >= 900 ? W * 0.3053 : Math.min(W * 0.58, 280));

/** Which project a cluster carries: neighbours always differ, repeats are kept as far apart as five allow. */
export const projectAt = (j: number, i: number, n: number) => (((j + 2 * i) % n) + n) % n;

export interface Box { left: number; top: number; w: number; h: number }

/** The layout every view of the globe shares, for one field box. */
export interface Field {
  box: Box;
  /** stable radius (no travel shrink) */
  R: number;
  cell: number;
  rows: number;
  /** wrap periods, px */
  PX: number;
  PY: number;
  /** centre of the visible band of page y (relative to the pole) */
  yc: number;
  /** the pole at rest (no shrink, no aim) */
  pole: [number, number];
}

export function fieldFor(box: Box): Field {
  const R = (Math.hypot(box.w, box.h) / 2) * HZ.radius;
  const cell = clusterWidth(box.w) / 4;
  const pole: [number, number] = [box.left + box.w / 2, box.top + box.h * HZ.crest + R];
  const bottom = Math.asin(Math.max(-1, Math.min(1, (box.top + box.h - pole[1]) / R))) * R;
  const top = (-Math.PI / 2) * R;
  // enough rows that a cluster never shows twice down the visible band (a multiple of 5, see projectAt)
  const span = bottom - top + 3 * cell;
  const rows = 20 * cell > span ? 5 : 10;
  return { box, R, cell, rows, PX: HZ.cols * HZ.pitchX * cell, PY: rows * HZ.pitchY * cell, yc: (top + bottom) / 2, pole };
}

/** The ball box of the reference's `ball(x, y, s)`: a sphere of diameter s whose crest is at (x, y). */
export function ballBox(x: number, y: number, s: number): Box {
  const n = s / (Math.SQRT2 * HZ.radius);
  return { left: x - n / 2, top: y + 0.08 * n, w: n, h: n };
}

export const lerpBox = (a: Box, b: Box, t: number): Box => ({
  left: a.left + (b.left - a.left) * t,
  top: a.top + (b.top - a.top) * t,
  w: a.w + (b.w - a.w) * t,
  h: a.h + (b.h - a.h) * t,
});

/** Shared view state, so every globe (home, the contact dome, a page coming back) picks up where the last left off. */
export const horizon = {
  rot: 0.09,
  /** page y of row 0's top, relative to the pole */
  scroll: -0.843 * 1107,
  scrollT: -0.843 * 1107,
  vel: 0,
  travel: 0,
  /** set while one globe drives the state (the others only read it) */
  owner: null as symbol | null,
  /** the first home globe of the session plays the intro */
  introDone: false,
  /** where the loader's ball was when it handed over (window px: centre, diameter) */
  introBall: null as { x: number; y: number; d: number } | null,
};

/** A cluster's top-left in page px (relative to the pole), unwrapped indices. */
export const clusterOrigin = (f: Field, j: number, i: number, scroll: number): [number, number] => [
  (j * HZ.pitchX - 2) * f.cell,
  i * HZ.pitchY * f.cell + scroll,
];

/** Wrap a page point to the copy nearest the front. */
export function wrapShift(f: Field, mx: number, my: number, rot: number, Ra: number): [number, number] {
  const kx = Math.round((mx + rot * Ra) / f.PX);
  const ky = Math.round((my - f.yc) / f.PY);
  return [kx * f.PX, ky * f.PY];
}
