import { useEffect, useRef } from 'react';
import { projects } from '@/data/projects';
import { buildAtlas, LAYOUTS } from '@/lib/tiles';
import { patchDir, patchesFor, START_YAW, type V3 } from '@/lib/globeLayout';
import { globeMemory } from '@/lib/morph';

const D = Math.PI / 180;
/** grid lines every 15 degrees, like the home globe */
const CELL = 15;
/** half the gap between tiles, cluster cells */
const INSET = 0.03;
/** sub-pieces per cell edge: the affine mapping of each stays close to the curve */
const SUB = 2;
/** downscaled atlas size (4 x 2 cells) */
const AW = 512;
const AH = 256;

/** corners in cluster cells (x right, y up) + the atlas rect it shows */
type Piece = { x0: number; x1: number; yb: number; yt: number; pi: number; sx: number; sy: number; sw: number; sh: number };

/** Every tile piece: each project once, on its own patch of the sphere (the same as the home globe). */
function buildPieces(n: number): Piece[] {
  const out: Piece[] = [];
  const cs = AW / 4;
  for (let pi = 0; pi < n; pi++) {
    for (const [c, r, w] of LAYOUTS[0]) {
      for (let a = 0; a < w * SUB; a++) {
        for (let b = 0; b < SUB; b++) {
          const x0 = c + a / SUB;
          const yt = 2 - r - b / SUB;
          out.push({
            x0: x0 + (a === 0 ? INSET : 0),
            x1: x0 + 1 / SUB - (a === w * SUB - 1 ? INSET : 0),
            yt: yt - (b === 0 ? INSET : 0),
            yb: yt - 1 / SUB + (b === SUB - 1 ? INSET : 0),
            pi,
            sx: c * cs + (a * cs) / SUB,
            sy: r * cs + (b * cs) / SUB,
            sw: cs / SUB,
            sh: cs / SUB,
          });
        }
      }
    }
  }
  return out;
}

/**
 * The contact panel's globe: a thin-line sphere carrying the same project tiles as the home globe,
 * seen a little from above and cut by its container into a dome. Turns slowly on its own; drag it
 * to spin with inertia and a springy tilt. Under prefers-reduced-motion it stays still (drag works).
 * A tap (press + release without dragging) calls `onTap`.
 */
export function WireGlobe({ className, onTap }: { className?: string; onTap?: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const tapRef = useRef(onTap);
  useEffect(() => { tapRef.current = onTap; });

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const REST_PITCH = 0.2; // tipped towards us, so the top of the dome shows
    // turned like the home globe (if it has been shown), so flights between the two line up
    let yaw = globeMemory.valid && globeMemory.mode === 'globe' ? globeMemory.yaw : START_YAW, pitch = REST_PITCH; // radians
    let vYaw = 0, vPitch = 0;
    const AUTO = reduced ? 0 : 0.07 / 60; // rad per frame (the home globe's idle turn)
    let dragging = false, lastX = 0, lastY = 0, lastT = 0;
    let startX = 0, startY = 0, startT = 0, travel = 0; // tap vs drag
    let glow = 0; // 0..1 brightness boost while interacting
    let raf = 0, w = 0, h = 0, dpr = 1, visible = true;

    const pieces = buildPieces(projects.length);
    const patches = patchesFor(projects.length);
    const atlases: (HTMLCanvasElement | null)[] = projects.map(() => null);
    let alive = true;
    (async () => {
      for (let i = 0; i < projects.length; i++) {
        const full = await buildAtlas(projects[i], i);
        if (!alive) return;
        const c = document.createElement('canvas');
        c.width = AW; c.height = AH;
        c.getContext('2d')?.drawImage(full, 0, 0, AW, AH);
        atlases[i] = c;
        draw();
      }
    })();

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      draw();
    };

    const color = () => getComputedStyle(cv).color || 'rgb(235,228,214)';

    function draw() {
      if (!ctx || !w) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const R = w / 2 - 1, cx = w / 2, cy = R + 1;
      const cy0 = Math.cos(yaw), sy0 = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const projV = ([x, y, z]: V3) => {
        const x1 = x * cy0 + z * sy0, z1 = -x * sy0 + z * cy0;
        const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
        return [cx + x1 * R, cy - y2 * R, z2] as const;
      };
      const proj = (lat: number, lon: number) => {
        const cl = Math.cos(lat);
        return projV([cl * Math.sin(lon), Math.sin(lat), cl * Math.cos(lon)]);
      };

      const base = color();
      ctx.strokeStyle = base;
      ctx.lineWidth = 1;
      const path = (pts: (readonly [number, number, number])[], front: boolean) => {
        ctx.beginPath();
        let pen = false;
        for (const [x, y, z] of pts) {
          if ((z >= 0) === front) { if (pen) ctx.lineTo(x, y); else ctx.moveTo(x, y); pen = true; } else pen = false;
        }
        ctx.stroke();
      };
      const lines: (readonly [number, number, number])[][] = [];
      for (let lat = -75; lat <= 75; lat += CELL) {
        const pts = []; const la = lat * D;
        for (let i = 0; i <= 120; i++) pts.push(proj(la, (i / 120) * Math.PI * 2));
        lines.push(pts);
      }
      for (let lon = 0; lon < 180; lon += CELL) {
        const pts = []; const lo = lon * D;
        for (let i = 0; i <= 120; i++) { const t = (i / 120) * Math.PI * 2; pts.push(proj(Math.asin(Math.sin(t)), Math.cos(t) >= 0 ? lo : lo + Math.PI)); }
        lines.push(pts);
      }
      ctx.globalAlpha = 0.05 + glow * 0.05;
      for (const l of lines) path(l, false);
      ctx.globalAlpha = 0.2 + glow * 0.25;
      for (const l of lines) path(l, true);

      // tiles on the front of the sphere: each piece affine-mapped onto its quad, clipped (slightly grown to hide seams)
      for (const pc of pieces) {
        const t = atlases[pc.pi];
        if (!t) continue;
        const P = patches[pc.pi];
        const tl = projV(patchDir(P, pc.x0, pc.yt)), tr = projV(patchDir(P, pc.x1, pc.yt));
        const bl = projV(patchDir(P, pc.x0, pc.yb)), br = projV(patchDir(P, pc.x1, pc.yb));
        const zc = (tl[2] + tr[2] + bl[2] + br[2]) / 4;
        if (zc <= 0.02) continue;
        const mx = (tl[0] + tr[0] + bl[0] + br[0]) / 4, my = (tl[1] + tr[1] + bl[1] + br[1]) / 4;
        const grow = (p: readonly [number, number, number]) => {
          const dx = p[0] - mx, dy = p[1] - my, l = Math.hypot(dx, dy) || 1;
          return [p[0] + (dx / l) * 0.6, p[1] + (dy / l) * 0.6] as const;
        };
        const [a, b, c, d] = [grow(tl), grow(tr), grow(br), grow(bl)];
        ctx.save();
        ctx.globalAlpha = 0.82 * Math.min(1, zc * 4) + glow * 0.1;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.clip();
        // map the atlas piece: (0,0)->tl, (sw,0)->tr, (0,sh)->bl
        const ax = (tr[0] - tl[0]) / pc.sw, ay = (tr[1] - tl[1]) / pc.sw;
        const bx = (bl[0] - tl[0]) / pc.sh, by = (bl[1] - tl[1]) / pc.sh;
        ctx.setTransform(ax * dpr, ay * dpr, bx * dpr, by * dpr, tl[0] * dpr, tl[1] * dpr);
        ctx.drawImage(t, pc.sx, pc.sy, pc.sw * 1.08, pc.sh * 1.08, 0, 0, pc.sw * 1.08, pc.sh * 1.08);
        ctx.restore();
      }
      // soft shading towards the rim
      const g = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R);
      g.addColorStop(0, 'rgba(24,22,22,0)');
      g.addColorStop(1, 'rgba(24,22,22,0.55)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = base;
      ctx.globalAlpha = 0.4 + glow * 0.3;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const tick = () => {
      raf = 0;
      if (!dragging) {
        yaw += AUTO + vYaw; pitch += vPitch;
        vYaw *= 0.95; vPitch *= 0.9;
        if (!reduced) pitch += (REST_PITCH - pitch) * 0.03; // spring tilt back
        glow *= 0.94;
      }
      draw();
      const moving = dragging || Math.abs(vYaw) > 1e-4 || Math.abs(vPitch) > 1e-4 || glow > 0.01 || AUTO > 0 || Math.abs(REST_PITCH - pitch) > 1e-3;
      if (visible && moving && !reduced) raf = requestAnimationFrame(tick);
      else if (reduced) { vYaw = vPitch = 0; }
    };
    const kick = () => { if (!raf && visible) raf = requestAnimationFrame(tick); };

    const down = (e: PointerEvent) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY; lastT = performance.now();
      startX = e.clientX; startY = e.clientY; startT = lastT; travel = 0;
      vYaw = vPitch = 0; glow = 1;
      cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing';
      kick();
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const R = Math.max(w / 2, 1);
      travel = Math.max(travel, Math.hypot(e.clientX - startX, e.clientY - startY));
      const dx = (e.clientX - lastX) / R, dy = (e.clientY - lastY) / R;
      const now = performance.now(), dt = Math.max(now - lastT, 1) / 16.7;
      yaw += dx; pitch = Math.max(-0.6, Math.min(0.9, pitch + dy));
      vYaw = dx / dt; vPitch = dy / dt;
      lastX = e.clientX; lastY = e.clientY; lastT = now;
      if (reduced) draw(); else kick();
    };
    const up = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false; cv.style.cursor = tapRef.current ? 'pointer' : '';
      try { cv.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      if (performance.now() - lastT > 80) vYaw = vPitch = 0;
      kick();
      if (e.type === 'pointerup' && travel < 6 && performance.now() - startT < 500) tapRef.current?.();
    };

    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    const ro = new ResizeObserver(resize); ro.observe(cv);
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) kick(); });
    io.observe(cv);
    resize(); kick();
    return () => {
      alive = false;
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      cv.removeEventListener('pointerdown', down); cv.removeEventListener('pointermove', move);
      cv.removeEventListener('pointerup', up); cv.removeEventListener('pointercancel', up);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className={className}
      aria-label={onTap ? 'Globe of project tiles — tap to open the home globe, drag to spin' : 'Globe of project tiles — drag to spin'}
      role="img"
      // tappable: the plain hand, like the floating W globe (the custom cursor steps aside)
      {...(onTap ? { 'data-cursor-hide': '' } : {})}
      style={{ touchAction: 'pan-y', cursor: onTap ? 'pointer' : undefined }}
    />
  );
}
