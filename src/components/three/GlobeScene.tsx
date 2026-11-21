import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { gsap } from '@/lib/gsap';
import type { Project } from '@/types/content';
import { buildAtlas, LAYOUTS, WIDE_ASPECT } from '@/lib/tiles';
import {
  HZ, ballBox, clamp01, clusterOrigin, fieldFor, horizon, lerpBox, p1o, p2io, p3io, projectAt, snappy,
  type Box, type Field,
} from '@/lib/horizon';

/*
 * The home globe (see lib/horizon for the projection). One WebGL canvas; world units are the
 * canvas's CSS px, y down, so what the shaders place is exactly what you see.
 *
 * - The lattice is a mesh over the visible part of the page, sphere-mapped per vertex; the lines
 *   are drawn in the fragment shader from the flat (pre-warp) page position, so the tiles and the
 *   grid are one function and cannot drift apart.
 * - The tiles are the page's clusters (4 x 2 cells, 10 per row, repeating) plastered onto the same
 *   sphere, per vertex. A cluster that is opened flies tile by tile to the boxes of the project
 *   sheet: the rect travels on a spring-like curve, the plaster releases mid-air, and a roll-front
 *   wave runs through the six tiles as one sheet (that wave IS the flip), with a climb and a sway.
 *   Meanwhile the rest of the world flattens, zooms about the click and dims. Closing runs it back.
 * - "Aim" shrinks the whole globe into a miniature (a ball of a given size whose crest sits at a
 *   point): the intro grows out of one, and the contact panel's dome is one.
 */

export interface GlobeInput {
  /** accumulated drag deltas (screen px), consumed every frame */
  dx: number;
  dy: number;
  /** accumulated wheel delta (px, + = down) */
  wheel: number;
  dragging: boolean;
  lastInput: number;
}

/** A box in CSS px, relative to the canvas. */
export interface TileBox { x: number; y: number; w: number; h: number }

export interface AimTarget { x: number; y: number; s: number }

/**
 * What the page can ask of the scene: fly the clicked cluster into the sheet's boxes (`open`), fly
 * the sheet's tiles back onto the globe (`close`), land a project coming back from its page
 * (`land`), and shrink into / grow out of the miniature (`aim`).
 */
export interface GlobeBridge {
  open: (dest: TileBox[], done: () => void) => void;
  close: (from: (TileBox | null)[] | null, done: () => void) => void;
  /** returns false when it cannot (unknown project, missing boxes); `onStart` fires on the frame the canvas takes over */
  land: (slug: string, from: (TileBox | null)[], onStart: () => void, done: () => void) => boolean;
  aim: (to: number, opts?: { duration?: number; ease?: string; delay?: number; tiles?: number; tileDelay?: number; tileDuration?: number; done?: () => void }) => void;
  /** the selected project's slug, if a cluster was clicked */
  selected: () => string | null;
}

export interface GlobeProps {
  projects: Project[];
  input: MutableRefObject<GlobeInput>;
  active: boolean;
  reduced: boolean;
  mobile: boolean;
  bridge?: MutableRefObject<GlobeBridge | null>;
  onHover?: (slug: string | null) => void;
  onSelect?: (slug: string) => void;
  /** take clicks / hovers */
  interactive?: boolean;
  /** drive the shared view (drift, drag, wheel); otherwise only follow it */
  drive?: boolean;
  /** grow in out of a small ball when it first shows */
  intro?: boolean;
  /** the field the globe is laid out for, canvas px (default: the whole canvas) */
  field?: () => Box | null;
  /** where the miniature goes (canvas px), read every frame */
  aimAt?: () => AimTarget | null;
  /** start shrunk into the miniature (1) */
  aimStart?: number;
  /** cut everything to this box (canvas px), read every frame */
  clip?: () => Box | null;
  /** start with the tiles hidden */
  tilesStart?: number;
  /** see-through canvas (drawn over a page) */
  transparent?: boolean;
  /** project index whose texture loads first */
  priority?: number;
  /** the bridge is ready */
  onReady?: () => void;
  /** the WebGL context was lost: fall back to the plain grid */
  onLost?: () => void;
  /** every project's pictures are on the GPU */
  onLoaded?: () => void;
}

const GROUND = '0.0941, 0.0863, 0.0863'; // #181616
const ACCENT = '1.0, 0.2196, 0.1922'; // #FF3831
const LAYOUT = LAYOUTS[0];
/** open: bottom row first (left to right), then the top row; closing runs the other way */
const OPEN_ORDER = [3, 4, 5, 0, 1, 2];
const INK_N = 16;

/* ---------------------------------------------------------------- shaders */

const COMMON = /* glsl */ `
  uniform vec2 uSize;
  uniform vec2 uPole;
  uniform float uR;
  uniform float uRa;
  uniform float uRot;
  uniform float uCell;
  uniform float uScroll;
  uniform vec4 uView;   // travel (raw clock), zoom target, pan x, pan y
  uniform vec4 uFocus;  // fx, fy, spread, dir (1 out, 0 home)
  uniform float uFlat;  // how much of the travel flattens the sphere

  const float PI = 3.14159265;

  vec3 sphere(vec2 q) {
    float u = q.x / uRa + uRot;
    float v = q.y / uRa;
    float cv = cos(v);
    return vec3(uPole.x + uR * cv * sin(u), uPole.y + uR * sin(v), cv * cos(u));
  }
  float easeT(float t) { return 1.0 - pow(1.0 - t, 2.8); }
  // a point's own clock: the nearer the click, the sooner it lands (both ways)
  float stag(vec2 flatMid) {
    float near = 1.0 - clamp(distance(flatMid, uFocus.xy) / max(uSize.x, uSize.y), 0.0, 1.0);
    float lag = near * uFocus.z;
    if (uFocus.w > 0.5) return easeT(clamp(uView.x / max(1.0 - lag, 1e-4), 0.0, 1.0));
    return 1.0 - easeT(clamp((1.0 - uView.x) / max(1.0 - lag, 1e-4), 0.0, 1.0));
  }
  float worldU() {
    if (uFocus.w > 0.5) return easeT(clamp(uView.x, 0.0, 1.0));
    return 1.0 - easeT(clamp(1.0 - uView.x, 0.0, 1.0));
  }
  vec3 ground(vec2 q, float u) {
    vec3 s = sphere(q);
    return vec3(mix(s.xy, uPole + q, u), mix(s.z, 1.0, u));
  }
  vec2 viewMap(vec2 p, float u) {
    float z = 1.0 + (uView.y - 1.0) * u;
    return uFocus.xy + (p - uFocus.xy) * z + uView.zw * u;
  }
  float flank(vec2 q) {
    float u = q.x / uRa + uRot;
    return mix(1.0 - ${HZ.flank.toFixed(2)}, 1.0, smoothstep(0.0, 1.0, cos(u)));
  }
  vec4 toClip(vec2 px) { return vec4(px / uSize * vec2(2.0, -2.0) + vec2(-1.0, 1.0), 0.0, 1.0); }
`;

const CLIP = /* glsl */ `
  uniform vec4 uClip; // left, top, right, bottom (canvas px)
  uniform float uDpr;
  float clipMask() {
    vec2 f = vec2(gl_FragCoord.x, uSize.y * uDpr - gl_FragCoord.y) / uDpr;
    vec2 d = max(uClip.xy - f, f - uClip.zw);
    return 1.0 - smoothstep(0.0, 1.0, max(d.x, d.y));
  }
`;

const FIELD_VS = /* glsl */ `
  ${COMMON}
  uniform vec4 uFR; // the page area the mesh covers: x, y, w, h
  varying vec2 vQ;
  varying float vFade;
  varying float vShade;
  void main() {
    vec2 q = uFR.xy + uv * uFR.zw;
    vec3 s = sphere(q);
    float wu = worldU();
    vec2 g = mix(s.xy, uPole + q, wu * uFlat);
    vQ = q;
    vFade = smoothstep(0.0, 0.05, mix(s.z, 1.0, uView.x));
    vShade = mix(flank(q), 1.0, wu * uFlat);
    gl_Position = toClip(viewMap(g, wu));
  }
`;

const FIELD_FS = /* glsl */ `
  ${COMMON}
  ${CLIP}
  uniform float uAlpha;
  uniform float uLimb;
  uniform float uHalfW;
  uniform vec4 uInk[${INK_N}]; // pointer trail: x, y, strength, radius
  varying vec2 vQ;
  varying float vFade;
  varying float vShade;

  float lines(float x, float w) {
    float d = abs(fract(x - 0.5) - 0.5);
    float width = fwidth(x);
    float a = clamp(w - d / max(width, 1e-5) + 0.5, 0.0, 1.0);
    return a * (1.0 - smoothstep(0.6, 1.8, width));
  }

  void main() {
    float x = vQ.x + uRot * uRa;
    float edge = PI * 0.5 * uRa;
    float inside = 1.0 - smoothstep(edge - uCell * 0.5, edge + uCell * 0.5, abs(x));
    float meridian = lines(vQ.x / uCell, uHalfW) * inside;
    float ring = lines((vQ.y - uScroll) / uCell, uHalfW);
    float cover = (1.0 - (1.0 - meridian) * (1.0 - ring)) * vShade;
    float face = vFade;

    vec2 frag = vec2(gl_FragCoord.x, uSize.y * uDpr - gl_FragCoord.y) / uDpr;
    if (uLimb > 0.0) {
      float rim = length(frag - uPole) - uR + uHalfW + 0.5;
      float limb = clamp(uHalfW - abs(rim) + 0.5, 0.0, 1.0) * uLimb;
      cover = 1.0 - (1.0 - cover * vFade) * (1.0 - limb);
      face = 1.0;
    }
    float alpha = cover * uAlpha * face;

    // the pointer's ink: the lines run red and lift to full strength where it has just been
    float ink = 0.0;
    for (int k = 0; k < ${INK_N}; k++) {
      vec4 p = uInk[k];
      if (p.z <= 0.0) continue;
      vec2 d = (frag - p.xy) / p.w;
      ink += p.z * exp(-dot(d, d));
    }
    ink = clamp(ink, 0.0, 1.0);
    vec3 rgb = mix(vec3(1.0), vec3(${ACCENT}), ink);
    alpha = mix(alpha, cover * face, ink * 0.85);

    alpha *= 1.0 - clamp(uView.x, 0.0, 1.0);
    alpha *= clipMask();
    gl_FragColor = vec4(rgb * alpha, alpha);
  }
`;

const TILE_VS = /* glsl */ `
  ${COMMON}
  uniform vec2 uPeriod;   // PX, PY
  uniform float uYc;
  uniform vec2 uFadeWin;  // fade in, fade out (facing)
  uniform vec2 uSel;      // selected cluster (base j, i); -1 = none
  uniform vec4 uFrom[6];  // takeoff rects (page px, pole-relative)
  uniform vec4 uTo[6];    // destination rects (canvas px)
  uniform vec4 uFly[6];   // rect progress, plaster amount, spin clock, wave clock
  uniform vec2 uGroup[6]; // the tile's centre in the sheet (tile heights from the sheet's centre), the sheet's height (tile heights)
  attribute vec4 aTile;   // ta, tb (top-left origin), width, height (cells)
  attribute vec4 aLoc;    // tile x0, y0 (cells), tile index, 0
  attribute vec4 aInst;   // cluster j, i, 0, 0
  varying vec2 vTile;
  varying vec2 vSize;
  varying vec4 vLoc;
  varying float vFade;
  varying float vSide;
  varying float vShade;
  varying float vSel;
  varying float vRad;
  varying vec2 vCrop;
  varying float vBack;

  float curveFade(float face) { return smoothstep(uFadeWin.x, uFadeWin.y, face); }

  void main() {
    vec2 uv = aTile.xy;
    float inset = ${HZ.inset.toFixed(4)};
    vec2 tileSize = (aTile.zw - 2.0 * inset) * uCell;
    vec2 cl = vec2((aInst.x * ${HZ.pitchX.toFixed(1)} - 2.0) * uCell, aInst.y * ${HZ.pitchY.toFixed(1)} * uCell + uScroll);
    vec2 t0 = cl + (aLoc.xy + inset) * uCell;
    vec2 q = t0 + uv * tileSize;
    vec2 mid = t0 + tileSize * 0.5;
    vec2 cmid = cl + vec2(2.0, 1.0) * uCell;

    // the copy of this cluster nearest the front
    vec2 k = floor(vec2((cmid.x + uRot * uRa) / uPeriod.x, (cmid.y - uYc) / uPeriod.y) + 0.5);
    vec2 sh = k * uPeriod;
    q -= sh;
    mid -= sh;

    float sel = (abs(aInst.x - uSel.x) < 0.5 && abs(aInst.y - uSel.y) < 0.5) ? 1.0 : 0.0;
    int ti = int(aLoc.z + 0.5);
    vec4 fl = uFly[ti];
    float amt = mix(1.0, fl.y, sel);
    float t = fl.z * sel;
    vec4 rect = vec4(uPole + q - uv * tileSize, tileSize); // the tile's flat box on the page
    vec2 raw = q;

    if (sel > 0.5) {
      vec4 from = uFrom[ti];
      vec4 fromPage = vec4(uPole + from.xy, from.zw);
      rect = mix(fromPage, uTo[ti], fl.x);
      raw = rect.xy + uv * rect.zw;
      q = from.xy + uv * from.zw;
      mid = from.xy + from.zw * 0.5;
      // the takeoff slide: the tile first travels up along the surface, then the peel takes over
      float span = uGroup[ti].y * rect.w;
      float slide = 0.4 * span * sin(PI * t) * pow(1.0 - t, 1.6);
      q.y -= slide;
      mid.y -= slide;
    }

    float u = stag(uPole + mid);
    float uf = u * uFlat;
    // facing read at the top-centre (the leading edge is what must be gone at the rim)
    float topY = sel > 0.5 ? mid.y - uFrom[ti].w * 0.5 : mid.y - tileSize.y * 0.5;
    float cf = curveFade(ground(vec2(mid.x, topY), uf).z);
    float uw = abs(mid.x / uRa + uRot);
    cf *= 1.0 - smoothstep(1.62, 1.75, uw);
    cf = max(cf, smoothstep(0.08, 0.3, t));
    float lit = max(mix(flank(q), 1.0, uf), smoothstep(0.08, 0.3, t));

    vec2 px = viewMap(ground(q, uf).xy, u);
    vec2 pxRaw = raw;
    px = mix(pxRaw, px, amt);
    vFade = mix(1.0, cf, amt);
    vShade = mix(1.0, lit, amt);

    // the roll-front: a cylinder (radius r) enters at the sheet's top edge and runs down through
    // it; whatever it has passed is wrapped over toward the viewer and lies flipped below
    float side = 1.0;
    if (t > 1e-4) {
      float h = rect.w;
      float sUp = (0.5 - uv.y) * h - uGroup[ti].x * h * -1.0;
      float span = uGroup[ti].y * h;
      float m = span * 0.5 - sUp;
      float mC = span * 0.5;
      float gT = clamp(fl.w, 0.0, 1.0);
      float r = 0.3 * span;
      float piR = PI * r;
      float fe = 1.0 - pow(1.0 - gT, 1.7);
      float f = fe * (span + piR);
      float qq = f - m;
      float qC = f - mC;
      float d = m;
      float z = 0.0;
      if (qq >= piR) { d = 2.0 * f - m - piR; z = 2.0 * r; }
      else if (qq > 0.0) { d = f - r * sin(qq / r); z = r * (1.0 - cos(qq / r)); }
      float dC = mC;
      if (qC >= piR) { dC = 2.0 * f - mC - piR; }
      else if (qC > 0.0) { dC = f - r * sin(qC / r); }
      z *= 1.0 - smoothstep(0.78, 1.0, fe);
      vec2 pc = mix(rect.xy + rect.zw * 0.5, viewMap(ground(mid, uf).xy, u), amt);
      float focal = 1.6 * max(rect.z, span);
      float persp = focal / max(focal - z, focal * 0.25);
      float climb = -0.12 * span * sin(PI * t);
      float sway = 0.04 * span * sin(2.0 * PI * t);
      float wave = (d - m) - (dC - mC);
      px += vec2(sway + (px.x - pc.x) * (persp - 1.0), wave * persp + climb);
      side = cos(clamp(qq / r, 0.0, PI));
    }

    vTile = uv;
    vSize = rect.zw;
    vLoc = vec4(aLoc.xy + inset, aTile.zw - 2.0 * inset);
    vSide = side;
    // the back of the sheet is a shade darker while it is turned over; it has let go by the landing
    vBack = step(side, 0.0) * (1.0 - smoothstep(0.7, 1.0, t));
    vSel = sel;
    vRad = mix(${HZ.corner.toFixed(2)}, 8.0, sel * fl.x);
    // the picture is cut for the cell's shape; in a box of another shape it is cover-fitted (as the page does)
    float native = aTile.z > 1.5 ? ${WIDE_ASPECT.toFixed(3)} : 1.0;
    float cur = rect.z / max(rect.w, 1e-3);
    vCrop = cur < native ? vec2(cur / native, 1.0) : vec2(1.0, native / cur);
    gl_Position = toClip(px);
  }
`;

const TILE_FS = /* glsl */ `
  uniform vec2 uSize;
  ${CLIP}
  uniform sampler2D uMap;
  uniform float uMapOn;
  uniform float uAlpha;
  uniform float uDim;      // everything but the selected cluster sinks into the ground
  uniform float uLanded;   // the selected tiles' back-face shade lets go as they land
  uniform float uPass;     // 0: everything but the selected cluster, 1: only it (drawn last)
  varying vec2 vTile;
  varying vec2 vSize;
  varying vec4 vLoc;
  varying float vFade;
  varying float vSide;
  varying float vShade;
  varying float vSel;
  varying float vRad;
  varying vec2 vCrop;
  varying float vBack;

  void main() {
    if ((uPass > 0.5) != (vSel > 0.5)) discard;
    vec2 tuv = vTile;
    if (vSide < 0.0) tuv.y = 1.0 - tuv.y; // the roll is about the horizontal axis
    tuv = 0.5 + (tuv - 0.5) * vCrop;
    vec2 a = vec2((vLoc.x + tuv.x * vLoc.z) / 4.0, 1.0 - (vLoc.y + tuv.y * vLoc.w) / 2.0);
    vec3 rgb = mix(vec3(0.165, 0.153, 0.153), texture2D(uMap, a).rgb, uMapOn);
    rgb *= 1.0 - 0.22 * vBack;
    rgb *= vShade;
    rgb = mix(vec3(${GROUND}), rgb, 1.0 - uDim * 0.62 * (1.0 - vSel));

    vec2 p = (vTile - 0.5) * vSize;
    vec2 qd = abs(p) - (vSize * 0.5 - vRad);
    float d = length(max(qd, 0.0)) + min(max(qd.x, qd.y), 0.0) - vRad;
    float mask = clamp(0.5 - d / max(fwidth(d), 1e-4), 0.0, 1.0);
    float alpha = mask * vFade * uAlpha * clipMask();
    gl_FragColor = vec4(rgb * alpha, alpha);
  }
`;

/* ---------------------------------------------------------------- geometry */

/** All of one project's clusters on the page (cols x rows, every 5th), tiles diced for the bend. */
function projectGeometry(pi: number, n: number, rows: number, segs: number) {
  const pos: number[] = [];
  const tile: number[] = [];
  const loc: number[] = [];
  const inst: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < HZ.cols; j++) {
      if (projectAt(j, i, n) !== pi) continue;
      LAYOUT.forEach(([c, r, w], k) => {
        const sx = segs * w;
        const sy = segs;
        const base = pos.length / 3;
        for (let b = 0; b <= sy; b++) {
          for (let a = 0; a <= sx; a++) {
            pos.push(0, 0, 0);
            tile.push(a / sx, b / sy, w, 1);
            loc.push(c, r, k, 0);
            inst.push(j, i, 0, 0);
          }
        }
        for (let b = 0; b < sy; b++) {
          for (let a = 0; a < sx; a++) {
            const p = base + b * (sx + 1) + a;
            idx.push(p, p + 1, p + sx + 1, p + 1, p + sx + 2, p + sx + 1);
          }
        }
      });
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aTile', new THREE.Float32BufferAttribute(tile, 4));
  g.setAttribute('aLoc', new THREE.Float32BufferAttribute(loc, 4));
  g.setAttribute('aInst', new THREE.Float32BufferAttribute(inst, 4));
  g.setIndex(idx);
  return g;
}

function fieldGeometry(sx: number, sy: number) {
  const g = new THREE.PlaneGeometry(1, 1, sx, sy);
  // PlaneGeometry's uv has v up; the page runs y down
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let k = 0; k < uv.count; k++) uv.setY(k, 1 - uv.getY(k));
  return g;
}

const premul = {
  transparent: true,
  depthTest: false,
  depthWrite: false,
  side: THREE.DoubleSide,
  blending: THREE.CustomBlending,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneMinusSrcAlphaFactor,
  blendSrcAlpha: THREE.OneFactor,
  blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
} as const;

/* ---------------------------------------------------------------- scene */

interface Sel { j: number; i: number; jj: number; ii: number; pi: number }
interface Flight {
  T: number;
  dir: 'open' | 'close';
  delays: number[];
  from: TileBox[]; // takeoff rects, page px relative to the pole
  to: TileBox[]; // destination rects, canvas px
  group: [number, number][];
  done: () => void;
}

const sameBox = (a: Box | null, b: Box | null) => !!a && !!b && a.left === b.left && a.top === b.top && a.w === b.w && a.h === b.h;

function Globe(props: GlobeProps) {
  const {
    projects, input, reduced, mobile, bridge, interactive = true, drive = true, intro = false,
    aimStart = 0, tilesStart = 1, priority = -1,
  } = props;
  const { gl, size } = useThree();
  const n = projects.length;
  const owner = useMemo(() => Symbol('globe'), []);
  // hand the shared view on when this globe goes away (or stops being shown)
  useEffect(() => () => { if (horizon.owner === owner) horizon.owner = null; }, [owner]);
  useEffect(() => { if (!props.active && horizon.owner === owner) horizon.owner = null; }, [props.active, owner]);

  const live = useRef(props);
  live.current = props;

  // the layout for the current field
  const fieldRef = useRef<Field>(fieldFor({ left: 0, top: 0, w: size.width, h: size.height }));
  const fieldBox = () => live.current.field?.() ?? { left: 0, top: 0, w: size.width, h: size.height };
  const fb0 = fieldBox();
  if (!sameBox(fieldRef.current.box, fb0)) fieldRef.current = fieldFor(fb0);
  const rows = fieldRef.current.rows;

  const segs = mobile ? 6 : 8;
  const geos = useMemo(() => projects.map((_, pi) => projectGeometry(pi, n, rows, segs)), [projects, n, rows, segs]);
  const field = useMemo(() => fieldGeometry(mobile ? 72 : 120, mobile ? 120 : 180), [mobile]);
  useEffect(() => () => { geos.forEach((g) => g.dispose()); }, [geos]);
  useEffect(() => () => field.dispose(), [field]);

  const U = useMemo(
    () => ({
      uSize: { value: new THREE.Vector2(1, 1) }, uPole: { value: new THREE.Vector2() }, uR: { value: 1 }, uRa: { value: 1 },
      uRot: { value: 0 }, uCell: { value: 1 }, uScroll: { value: 0 }, uView: { value: new THREE.Vector4(0, 1, 0, 0) },
      uFocus: { value: new THREE.Vector4(0, 0, HZ.spread, 1) }, uFlat: { value: 0 }, uClip: { value: new THREE.Vector4(-1e5, -1e5, 1e5, 1e5) },
      uDpr: { value: 1 },
    }),
    [],
  );
  const fieldMat = useMemo(
    () => new THREE.ShaderMaterial({
      ...premul,
      vertexShader: FIELD_VS,
      fragmentShader: FIELD_FS,
      uniforms: {
        ...U, uFR: { value: new THREE.Vector4() }, uAlpha: { value: HZ.lineAlpha }, uLimb: { value: 0 }, uHalfW: { value: HZ.halfW },
        uInk: { value: Array.from({ length: INK_N }, () => new THREE.Vector4(0, 0, 0, 1)) },
      },
    }),
    [U],
  );
  const tileU = useMemo(
    () => ({
      uPeriod: { value: new THREE.Vector2(1, 1) }, uYc: { value: 0 }, uFadeWin: { value: new THREE.Vector2(HZ.fadeIn, HZ.fadeOut) },
      uSel: { value: new THREE.Vector2(-1, -1) },
      uFrom: { value: Array.from({ length: 6 }, () => new THREE.Vector4()) },
      uTo: { value: Array.from({ length: 6 }, () => new THREE.Vector4()) },
      uFly: { value: Array.from({ length: 6 }, () => new THREE.Vector4(0, 1, 0, 0)) },
      uGroup: { value: Array.from({ length: 6 }, () => new THREE.Vector2(0, 2)) },
      uAlpha: { value: tilesStart }, uDim: { value: 0 }, uLanded: { value: 0 },
    }),
    [tilesStart],
  );
  const mats = useMemo(
    () => projects.map(() => new THREE.ShaderMaterial({
      ...premul,
      vertexShader: TILE_VS,
      fragmentShader: TILE_FS,
      uniforms: { ...U, ...tileU, uMap: { value: null }, uMapOn: { value: 0 }, uPass: { value: 0 } },
    })),
    [projects, U, tileU],
  );
  // the clicked project's tiles again, drawn after everything (its uMap / uMapOn are shared)
  const flyMats = useMemo(
    () => mats.map((m) => new THREE.ShaderMaterial({
      ...premul,
      vertexShader: TILE_VS,
      fragmentShader: TILE_FS,
      uniforms: { ...m.uniforms, uPass: { value: 1 } },
    })),
    [mats],
  );
  useEffect(() => () => flyMats.forEach((m) => m.dispose()), [flyMats]);
  const flyMesh = useRef<THREE.Mesh>(null);
  useEffect(() => () => { mats.forEach((m) => m.dispose()); fieldMat.dispose(); }, [mats, fieldMat]);

  // textures, the priority project first
  useEffect(() => {
    let alive = true;
    const texes: THREE.Texture[] = [];
    (async () => {
      const order = projects.map((_, i) => i).sort((a, b) => (b === priority ? 1 : 0) - (a === priority ? 1 : 0));
      for (const i of order) {
        const cv = await buildAtlas(projects[i], i, WIDE_ASPECT);
        if (!alive) return;
        const t = new THREE.CanvasTexture(cv);
        t.colorSpace = THREE.NoColorSpace;
        t.anisotropy = gl.capabilities.getMaxAnisotropy();
        t.generateMipmaps = true;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        texes.push(t);
        gl.initTexture(t);
        mats[i].uniforms.uMap.value = t;
        mats[i].uniforms.uMapOn.value = 1;
        await new Promise((r) => setTimeout(r, 16));
      }
      if (alive) live.current.onLoaded?.();
    })();
    return () => { alive = false; texes.forEach((t) => t.dispose()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, mats, gl]);

  useEffect(() => {
    const el = gl.domElement;
    const lost = (e: Event) => { e.preventDefault(); live.current.onLost?.(); };
    el.addEventListener('webglcontextlost', lost);
    return () => el.removeEventListener('webglcontextlost', lost);
  }, [gl]);

  const s = useRef({
    aim: intro && !reduced ? 1 : aimStart,
    tiles: intro && !reduced ? 0 : tilesStart,
    dim: 0,
    view: 0,
    dir: 1,
    zoom: 1,
    pan: [0, 0] as [number, number],
    focus: [0, 0] as [number, number],
    sel: null as Sel | null,
    selAt: 0,
    fly: null as Flight | null,
    landed: 0,
    hot: -1,
    pend: null as { pi: number; from: TileBox[]; onStart: () => void; done: () => void; t0: number } | null,
    vrot: 0,
    ink: [] as { x: number; y: number; a: number }[],
    // the frame's derived values, for picking and the bridge
    R: 1, Ra: 1, pole: [0, 0] as [number, number],
  });
  const introAim = useRef<AimTarget | null>(null);

  // the intro: grow out of the loader's ball (or a small ball in the upper middle of the field), the
  // tiles fading in after. It starts on the first frame drawn, not on mount: the canvas is mounted
  // (and its shaders and pictures readied) behind the loader, and only runs once that hands over.
  const introTw = useRef<gsap.core.Tween[]>([]);
  useEffect(() => () => introTw.current.forEach((t) => t.kill()), []);
  const introStarted = useRef(!intro || reduced);
  const { scene, camera } = useThree();
  useEffect(() => { try { gl.compile(scene, camera); } catch { /* compiled on first draw then */ } }, [gl, scene, camera, mats, fieldMat]);

  /* ---- the frame's sphere, on the CPU (picking, the bridge) ---- */

  const frame = () => {
    const st = s.current;
    const F = fieldRef.current;
    const fb = F.box;
    const shrink = 1 - HZ.shrink * horizon.travel;
    const Rfull = F.R * shrink;
    let R = Rfull;
    let pole: [number, number] = [fb.left + fb.w / 2, fb.top + HZ.crest * fb.h + Rfull];
    const e = st.aim;
    const target = e > 1e-4 ? live.current.aimAt?.() ?? (intro ? introAim.current : null) : null;
    if (target) {
      const b = lerpBox(fb, ballBox(target.x, target.y, target.s), e);
      R = (Math.hypot(b.w, b.h) / 2) * HZ.radius * shrink;
      pole = [b.left + b.w / 2, b.top + HZ.crest * b.h + R];
    }
    st.R = R;
    st.Ra = Rfull;
    st.pole = pole;
    return { F, R, Ra: Rfull, pole, aimed: Boolean(target) };
  };

  const sphereAt = (qx: number, qy: number) => {
    const st = s.current;
    const u = qx / st.Ra + horizon.rot;
    const v = qy / st.Ra;
    return [st.pole[0] + st.R * Math.cos(v) * Math.sin(u), st.pole[1] + st.R * Math.sin(v), Math.cos(v) * Math.cos(u)] as const;
  };

  /** canvas point -> the cluster under it (unwrapped and base indices), or null */
  const pick = (x: number, y: number): Sel | null => {
    const st = s.current;
    const F = fieldRef.current;
    if (st.aim > 0.02 || st.fly || st.sel) return null;
    const sv = (y - st.pole[1]) / st.R;
    if (sv < -1 || sv > 1) return null;
    const v = Math.asin(sv);
    const su = (x - st.pole[0]) / (st.R * Math.cos(v));
    if (su < -1 || su > 1) return null;
    const u = Math.asin(su);
    const qx = (u - horizon.rot) * st.Ra;
    const qy = v * st.Ra;
    const c = F.cell;
    const gx = qx + 2 * c;
    const jj = Math.floor(gx / (HZ.pitchX * c));
    if (gx - jj * HZ.pitchX * c > 4 * c) return null;
    const gy = qy - horizon.scroll;
    const ii = Math.floor(gy / (HZ.pitchY * c));
    if (gy - ii * HZ.pitchY * c > 2 * c) return null;
    const j = ((jj % HZ.cols) + HZ.cols) % HZ.cols;
    const i = ((ii % F.rows) + F.rows) % F.rows;
    // only what is actually drawn: facing us and inside the window
    const [, , z] = sphereAt((jj * HZ.pitchX) * c, ii * HZ.pitchY * c + horizon.scroll);
    if (z < 0.05) return null;
    return { j, i, jj, ii, pi: projectAt(j, i, n) };
  };

  /** a cluster copy's tile rects, page px relative to the pole */
  const takeoff = (sel: Sel): TileBox[] => {
    const F = fieldRef.current;
    const c = F.cell;
    const [ox, oy] = clusterOrigin(F, sel.jj, sel.ii, horizon.scroll);
    return LAYOUT.map(([cx, cy, w]) => ({
      x: ox + (cx + HZ.inset) * c,
      y: oy + (cy + HZ.inset) * c,
      w: (w - 2 * HZ.inset) * c,
      h: (1 - 2 * HZ.inset) * c,
    }));
  };

  /** the world's focus for the flight (the clicked cluster's middle on screen), and each tile's roll frame */
  const aimWorld = (_to: TileBox[], from: TileBox[]) => {
    const st = s.current;
    const fx0 = Math.min(...from.map((b) => b.x));
    const fx1 = Math.max(...from.map((b) => b.x + b.w));
    const fy0 = Math.min(...from.map((b) => b.y));
    const fy1 = Math.max(...from.map((b) => b.y + b.h));
    const c = sphereAt((fx0 + fx1) / 2, (fy0 + fy1) / 2);
    st.focus = [c[0], c[1]];
    // the reference keeps the world where it is (no zoom, no flattening): it only dims and drops its grid
    st.zoom = 1;
    st.pan = [0, 0];
    // each tile rolls over on its own (its own height is the roll's span)
    return from.map(() => [0, 1] as [number, number]);
  };

  const startFlight = (dir: 'open' | 'close', sel: Sel, to: TileBox[], done: () => void, from?: TileBox[]) => {
    const st = s.current;
    const fromRects = from ?? takeoff(sel);
    const group = aimWorld(to, fromRects);
    const order = dir === 'open' ? OPEN_ORDER : [...OPEN_ORDER].reverse();
    const delays = LAYOUT.map((_, k) => order.indexOf(k) * HZ.stagger);
    if (st.fly) gsap.killTweensOf(st.fly);
    st.fly = { T: 0, dir, delays, from: fromRects, to, group, done };
    st.dir = dir === 'open' ? 1 : 0;
    st.landed = 0;
    const total = HZ.glide + Math.max(...delays);
    gsap.to(st.fly, {
      T: total,
      duration: reduced ? 0.01 : total,
      ease: 'none',
      onComplete: () => {
        const f = st.fly;
        if (!f) return;
        if (f.dir === 'close') { st.fly = null; st.sel = null; st.view = 0; st.dim = 0; }
        f.done();
      },
    });
  };

  useEffect(() => {
    if (!bridge) return;
    bridge.current = {
      selected: () => (s.current.sel ? projects[s.current.sel.pi].slug : null),
      open: (dest, done) => {
        const st = s.current;
        if (!st.sel || dest.length !== LAYOUT.length) { done(); return; }
        startFlight('open', st.sel, dest, done);
      },
      close: (from, done) => {
        const st = s.current;
        const sel = st.sel;
        const f = st.fly;
        if (!sel || !f) { st.sel = null; st.fly = null; st.view = 0; st.dim = 0; done(); return; }
        // fly back from wherever the sheet's tiles are now; a tile scrolled out of sight drops in from above
        const to = f.to.map((b, k) => from?.[k] ?? { ...b, y: Math.min(b.y, -b.h - 24) });
        startFlight('close', sel, to, done, f.from);
      },
      land: (slug, from, onStart, done) => {
        const pi = projects.findIndex((p) => p.slug === slug);
        if (pi < 0 || from.length !== LAYOUT.length || from.some((b) => !b)) return false;
        // wait (a little) for the project's pictures, so it never lands as blank cards
        s.current.pend = { pi, from: from as TileBox[], onStart, done, t0: performance.now() };
        return true;
      },
      aim: (to, o = {}) => {
        const st = s.current;
        gsap.killTweensOf(st, 'aim,tiles');
        gsap.to(st, { aim: to, duration: reduced ? 0.01 : o.duration ?? HZ.aim, ease: o.ease ?? 'snappy', delay: o.delay ?? 0, onComplete: o.done });
        if (o.tiles !== undefined) gsap.to(st, { tiles: o.tiles, duration: reduced ? 0.01 : o.tileDuration ?? HZ.fade, delay: o.tileDelay ?? 0, ease: 'power1.out' });
      },
    };
    live.current.onReady?.();
    return () => { bridge.current = null; };
    // the bridge reads refs only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridge, projects]);

  /** a project page's tiles (at `to`, canvas px) fly back into one of its clusters */
  const doLand = (pi: number, to: TileBox[], done: () => void) => {
        const st = s.current;
        const F = fieldRef.current;
        frame();
        // the copy of one of its clusters nearest the middle of the front band
        let best: Sel | null = null;
        let bestD = Infinity;
        const c = F.cell;
        const yAim = F.yc * 0.55 + (F.box.top + F.box.h * 0.62 - st.pole[1]) * 0.45;
        for (let ii = -F.rows; ii <= F.rows; ii++) {
          for (let jj = -HZ.cols; jj <= HZ.cols; jj++) {
            const j = ((jj % HZ.cols) + HZ.cols) % HZ.cols;
            const i = ((ii % F.rows) + F.rows) % F.rows;
            if (projectAt(j, i, n) !== pi) continue;
            const [ox, oy] = clusterOrigin(F, jj, ii, horizon.scroll);
            const mx = ox + 2 * c + horizon.rot * st.Ra;
            const my = oy + c;
            const d = Math.hypot(mx, (my - yAim) * 1.4);
            if (d < bestD) { bestD = d; best = { j, i, jj, ii, pi }; }
          }
        }
        if (!best) { done(); return; }
        st.sel = best;
        st.selAt = performance.now();
        // start where the open would have ended: landed in the page's boxes, the world zoomed and dimmed
        st.fly = { T: 0, dir: 'open', delays: [0, 0, 0, 0, 0, 0], from: takeoff(best), to, group: aimWorld(to, takeoff(best)), done: () => {} };
        st.view = 1;
        st.dim = 1;
        startFlight('close', best, to, done);
  };

  // hover + click are picked on the CPU (the shader places the tiles)
  useEffect(() => {
    const el = gl.domElement;
    const local = (e: PointerEvent | MouseEvent) => {
      const b = el.getBoundingClientRect();
      return [e.clientX - b.left, e.clientY - b.top] as const;
    };
    const setHot = (k: Sel | null) => {
      const st = s.current;
      const key = k ? k.pi : -1;
      if (key === st.hot) return;
      st.hot = key;
      live.current.onHover?.(k ? projects[k.pi].slug : null);
    };
    const move = (e: PointerEvent) => {
      const [x, y] = local(e);
      const st = s.current;
      if (e.pointerType !== 'touch' && !reduced) {
        st.ink.push({ x, y, a: 1 });
        if (st.ink.length > INK_N) st.ink.shift();
      }
      if (!interactive || input.current.dragging) return;
      setHot(pick(x, y));
    };
    const leave = () => setHot(null);
    const click = (e: MouseEvent) => {
      if (!interactive || input.current.dragging) return;
      const [x, y] = local(e);
      const k = pick(x, y);
      if (!k) return;
      const st = s.current;
      st.sel = k;
      st.selAt = performance.now();
      st.vrot = 0;
      horizon.scrollT = horizon.scroll;
      setHot(null);
      live.current.onSelect?.(projects[k.pi].slug);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('click', click);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('click', click);
    };
    // pick reads refs only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, projects, input, interactive, reduced]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20);
    const st = s.current;
    const inp = input.current;
    const now = performance.now();

    const fb = fieldBox();
    if (!sameBox(fieldRef.current.box, fb)) fieldRef.current = fieldFor(fb);
    const F = fieldRef.current;
    if (!introStarted.current) {
      introStarted.current = true;
      const ball = horizon.introBall;
      const r = gl.domElement.getBoundingClientRect();
      introAim.current = ball
        ? { x: ball.x - r.left, y: ball.y - ball.d / 2 - r.top, s: ball.d }
        : { x: fb.left + fb.w / 2, y: fb.top + fb.h * 0.23, s: fb.h * 0.47 };
      introTw.current = [
        gsap.to(st, { aim: 0, duration: HZ.aim, ease: 'snappy', delay: 0.05 }),
        gsap.to(st, { tiles: 1, duration: 1, delay: 0.6, ease: 'power1.out' }),
      ];
    }

    // a click the page never followed up (the sheet failed to open): let it go
    if (st.sel && !st.fly && now - st.selAt > 2500) st.sel = null;

    // the shared view: one globe drives it, the others follow
    const busy = Boolean(st.sel || st.fly);
    if (drive && !busy && (horizon.owner === null || horizon.owner === owner)) {
      horizon.owner = owner;
      const R = F.R * (1 - HZ.shrink * horizon.travel);
      const before = horizon.scroll;
      horizon.rot += inp.dx / R;
      if (inp.dx) st.vrot = inp.dx / R / dt;
      if (!inp.dragging && st.vrot) {
        horizon.rot += st.vrot * dt * 0.12;
        st.vrot *= Math.pow(0.02, dt);
        if (Math.abs(st.vrot) < 0.002) st.vrot = 0;
      }
      horizon.scrollT += inp.dy - inp.wheel;
      const drift = reduced ? 0 : HZ.drift * dt;
      horizon.scroll -= drift;
      horizon.scrollT -= drift;
      horizon.scroll += (horizon.scrollT - horizon.scroll) * (1 - Math.pow(0.0009, dt));
      const vel = Math.abs(horizon.scroll - before) / Math.max(dt, 1e-3);
      const want = Math.min(1, Math.max(0, vel - HZ.drift * 1.5) / HZ.velNorm);
      horizon.travel += (want - horizon.travel) * (1 - Math.exp(-dt * (want > horizon.travel ? HZ.velIn : HZ.velOut)));
      // keep the numbers small: the page repeats every period
      if (Math.abs(horizon.scroll) > F.PY * 3) {
        const w = Math.round(horizon.scroll / F.PY) * F.PY;
        horizon.scroll -= w;
        horizon.scrollT -= w;
      }
      const rp = F.PX / F.R;
      if (Math.abs(horizon.rot) > rp * 2) horizon.rot -= Math.round(horizon.rot / rp) * rp;
    }
    inp.dx = 0;
    inp.dy = 0;
    inp.wheel = 0;

    const { R, Ra, pole, aimed } = frame();

    const pend = st.pend;
    if (pend && (mats[pend.pi].uniforms.uMapOn.value === 1 || now - pend.t0 > 1500)) {
      st.pend = null;
      doLand(pend.pi, pend.from, pend.done);
      pend.onStart();
    }

    // the flight's clocks
    const fly = st.fly;
    const tu = tileU;
    if (fly && st.sel) {
      const T = fly.T;
      const open = fly.dir === 'open';
      // the grid is gone ~0.3 s into the open, and back ~0.4 s into the close (as on the reference)
      st.view = open ? p1o(clamp01(T / 0.3)) : 1 - p1o(clamp01((T - 0.1) / 0.3));
      st.dim = open ? p1o(clamp01(T / 0.3)) : 1 - p1o(clamp01((T - 0.3) / 0.6));
      let landed = 1;
      for (let k = 0; k < 6; k++) {
        const tau = clamp01((T - fly.delays[k]) / HZ.glide);
        const f = fly.from[k];
        const to = fly.to[k];
        tu.uFrom.value[k].set(f.x, f.y, f.w, f.h);
        tu.uTo.value[k].set(to.x, to.y, to.w, to.h);
        tu.uGroup.value[k].set(fly.group[k][0], fly.group[k][1]);
        if (open) {
          const spin = p3io(tau);
          tu.uFly.value[k].set(snappy(tau), 1 - p2io(clamp01((tau * HZ.glide) / 0.5)), spin, spin);
          landed = Math.min(landed, clamp01((tau - 0.85) / 0.15));
        } else {
          const spin = 1 - p3io(tau);
          tu.uFly.value[k].set(1 - snappy(tau), snappy(tau), spin, spin);
          landed = Math.min(landed, 1 - clamp01(tau / 0.15));
        }
      }
      tu.uLanded.value = landed;
      tu.uSel.value.set(st.sel.j, st.sel.i);
    } else if (st.sel) {
      // clicked, waiting for the sheet's boxes: stay put
      tu.uSel.value.set(st.sel.j, st.sel.i);
      for (let k = 0; k < 6; k++) tu.uFly.value[k].set(0, 1, 0, 0);
      const fr = takeoff(st.sel);
      fr.forEach((b, k) => tu.uFrom.value[k].set(b.x, b.y, b.w, b.h));
      tu.uLanded.value = 0;
    } else {
      tu.uSel.value.set(-1, -1);
      for (let k = 0; k < 6; k++) tu.uFly.value[k].set(0, 1, 0, 0);
    }

    const fm = flyMesh.current;
    if (fm) {
      fm.visible = Boolean(st.sel);
      if (st.sel) { fm.geometry = geos[st.sel.pi]; fm.material = flyMats[st.sel.pi]; }
    }

    // uniforms
    U.uSize.value.set(size.width, size.height);
    U.uDpr.value = gl.getPixelRatio();
    U.uPole.value.set(pole[0], pole[1]);
    U.uR.value = R;
    U.uRa.value = Ra;
    U.uRot.value = horizon.rot;
    U.uCell.value = F.cell;
    U.uScroll.value = horizon.scroll;
    U.uView.value.set(st.view, st.zoom, st.pan[0], st.pan[1]);
    U.uFocus.value.set(st.focus[0], st.focus[1], HZ.spread, st.dir);
    const cb = live.current.clip?.();
    if (cb) U.uClip.value.set(cb.left, cb.top, cb.left + cb.w, cb.top + cb.h);
    else U.uClip.value.set(-1e5, -1e5, 1e5, 1e5);

    tu.uPeriod.value.set(F.PX, F.PY);
    tu.uYc.value = F.yc;
    tu.uAlpha.value = st.tiles;
    tu.uDim.value = st.dim;

    const fu = fieldMat.uniforms;
    const x0 = (-Math.PI / 2 - 0.1 - horizon.rot) * Ra;
    const y0 = (-Math.PI / 2 - 0.05) * Ra;
    // in the full view only the band down to the field's foot is on screen; a miniature shows the whole front
    const vb = aimed ? Math.PI / 2 : Math.min(Math.PI / 2, Math.asin(Math.max(-1, Math.min(1, (F.box.top + F.box.h - pole[1]) / R))) + 0.08);
    fu.uFR.value.set(x0, y0, (Math.PI + 0.2) * Ra, vb * Ra - y0);
    fu.uLimb.value = HZ.ringA * clamp01(st.aim * 1.5);
    // ink trail: fades over ~0.8 s
    const inkU = fu.uInk.value as THREE.Vector4[];
    for (let k = 0; k < INK_N; k++) {
      const p = st.ink[k];
      if (p) { p.a = Math.max(0, p.a - dt / 0.8); inkU[k].set(p.x, p.y, p.a * 0.55, mobile ? 60 : 90); }
      else inkU[k].set(0, 0, 0, 1);
    }
    while (st.ink.length && st.ink[0].a <= 0) st.ink.shift();
  });

  return (
    <>
      <mesh geometry={field} material={fieldMat} frustumCulled={false} renderOrder={0} />
      {geos.map((g, pi) => (
        <mesh key={projects[pi].slug} geometry={g} material={mats[pi]} frustumCulled={false} renderOrder={1} />
      ))}
      <mesh ref={flyMesh} geometry={geos[0]} material={flyMats[0]} frustumCulled={false} renderOrder={2} visible={false} />
    </>
  );
}

export default function GlobeScene(props: GlobeProps) {
  return (
    <Canvas
      flat
      orthographic
      frameloop={props.active ? 'always' : 'never'}
      dpr={props.mobile ? [1, 1.5] : [1, 1.75]}
      gl={{ antialias: true, alpha: Boolean(props.transparent), premultipliedAlpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 100], zoom: 1, near: 0.1, far: 1000 }}
      aria-hidden="true"
      style={props.transparent ? { background: 'transparent' } : undefined}
    >
      {!props.transparent && <color attach="background" args={['#181616']} />}
      <Globe {...props} />
    </Canvas>
  );
}
