import { useEffect, useRef, useState } from 'react';

/**
 * Liquid hover for a button, after the reference CTA: a soft white liquid follows the mouse with a
 * springy lag, smears out behind it (a tail of drops chasing each other), keeps morphing (orbiting
 * lobes, a velocity stretch, an impact squash), splashes on the way in and drains out the way the
 * pointer left. Where it covers the label, the label reads in the button's own colour; elsewhere
 * the label keeps its colour.
 *
 * It is drawn in a small canvas over the label: a metaball field on a coarse grid (soft edged,
 * blobs melting into each other), scaled up smoothly, then a copy of the label (`[data-liquid-label]`
 * inside the button: its words, or the strokes of an svg icon) painted in the button colour only
 * where the liquid is. Drop it inside a `relative overflow-hidden` button. Only on a hover-capable
 * fine pointer without reduced motion; elsewhere it renders nothing and the plain button stays.
 */
const TRAIL = 6;
const LOBES = 3;
const DROPS = 10;
/** grid cell, CSS px */
const CELL = 2;
/** half-width of the edge's soft band, in field units (1 = the rim) */
const SOFT = 0.22;

type Drop = { x: number; y: number; vx: number; vy: number; r: number };
type Ball = { x: number; y: number; r: number; ax?: number; ay?: number; c?: number; s?: number };

const canHover = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function LiquidFill({ color = '#ffffff' }: { color?: string }) {
  const [on] = useState(canHover);
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = cv.current;
    const btn = canvas?.parentElement;
    const g = canvas?.getContext('2d');
    if (!on || !canvas || !btn || !g) return;

    // the field, at grid resolution
    const field = document.createElement('canvas');
    const fg = field.getContext('2d')!;
    let img: ImageData | null = null;
    let w = 0, h = 0, gw = 0, gh = 0, dpr = 1;
    const fit = () => {
      w = btn.clientWidth;
      h = btn.clientHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      gw = Math.max(1, Math.ceil(w / CELL) + 1);
      gh = Math.max(1, Math.ceil(h / CELL) + 1);
      field.width = gw;
      field.height = gh;
      img = fg.createImageData(gw, gh);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(btn);
    const [lr, lg, lb] = (() => {
      fg.fillStyle = color;
      fg.fillRect(0, 0, 1, 1);
      const d = fg.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2]];
    })();

    // state, in the button's pixels
    const target = { x: w / 2, y: h / 2 };
    const pos = { x: w / 2, y: h / 2, vx: 0, vy: 0 };
    const tail = Array.from({ length: TRAIL }, () => ({ x: w / 2, y: h / 2, vx: 0, vy: 0 }));
    let r = 0, rv = 0; // radius + its velocity (underdamped: it overshoots, wobbles, settles)
    let squash = 0, sv = 0, sAng = 0; // impact squash along the entry/exit direction
    let inside = false;
    const pool: Drop[] = [];
    let raf = 0;
    let last = 0;
    let t = 0;

    const local = (e: PointerEvent) => {
      const b = btn.getBoundingClientRect();
      return { x: e.clientX - b.left, y: e.clientY - b.top };
    };
    const splash = (x: number, y: number, ang: number, n: number, speed: number) => {
      for (let i = 0; i < n; i++) {
        const a = ang + (Math.random() - 0.5) * 1.6;
        const s = speed * (0.45 + Math.random() * 0.75);
        if (pool.length >= DROPS) pool.shift();
        pool.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: Math.min(w, h) * (0.08 + Math.random() * 0.1) });
      }
    };
    /** the direction from the button's middle out to the nearest edge through (x, y) */
    const edgeAngle = (x: number, y: number) => {
      const dl = x, dr = w - x, dt = y, db = h - y;
      const m = Math.min(dl, dr, dt, db);
      return m === dl ? Math.PI : m === dr ? 0 : m === dt ? -Math.PI / 2 : Math.PI / 2;
    };
    const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };

    const onEnter = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const p = local(e);
      inside = true;
      target.x = p.x; target.y = p.y;
      const out = edgeAngle(p.x, p.y);
      // born at the edge it came in through, small, and springs open towards the cursor
      if (r < 2) {
        pos.x = p.x + Math.cos(out) * 10; pos.y = p.y + Math.sin(out) * 10; pos.vx = 0; pos.vy = 0;
        tail.forEach((d) => { d.x = pos.x; d.y = pos.y; d.vx = 0; d.vy = 0; });
      }
      sAng = out; sv += 9;
      splash(p.x, p.y, out + Math.PI, 5, Math.max(w, h) * 2.2);
      kick();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const p = local(e);
      target.x = p.x; target.y = p.y;
      inside = true;
      kick();
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const p = local(e);
      inside = false;
      const out = edgeAngle(Math.min(w, Math.max(0, p.x)), Math.min(h, Math.max(0, p.y)));
      // it slides out after the cursor and pinches off, throwing a few drops through the edge
      target.x = p.x + Math.cos(out) * r * 1.6; target.y = p.y + Math.sin(out) * r * 1.6;
      sAng = out; sv -= 7;
      splash(pos.x, pos.y, out, 4, Math.max(w, h) * 2.6);
      kick();
    };
    const onFocus = () => {
      if (!btn.matches(':focus-visible')) return;
      inside = true; target.x = w / 2; target.y = h / 2;
      if (r < 2) { pos.x = w / 2; pos.y = h / 2; }
      kick();
    };
    const onBlur = () => { if (inside) { inside = false; kick(); } };

    /** the label again, in the button's colour, wherever the liquid is */
    const paintLabel = () => {
      const label = btn.querySelector<HTMLElement>('[data-liquid-label]');
      if (!label) return;
      const b = btn.getBoundingClientRect();
      const cs = getComputedStyle(label);
      const ink = getComputedStyle(btn).backgroundColor;
      g.globalCompositeOperation = 'source-atop';
      g.globalAlpha = Math.min(1, parseFloat(cs.opacity) || 1);
      const icon = label.querySelector('svg');
      if (icon) {
        // an icon: its strokes (lines / paths), scaled from its viewBox into its box
        const ib = icon.getBoundingClientRect();
        const vb = icon.viewBox.baseVal;
        const sx = ib.width / (vb?.width || 24), sy = ib.height / (vb?.height || 24);
        const m = new DOMMatrix(getComputedStyle(icon).transform === 'none' ? undefined : getComputedStyle(icon).transform);
        g.save();
        g.translate(ib.left - b.left + ib.width / 2, ib.top - b.top + ib.height / 2);
        g.transform(m.a, m.b, m.c, m.d, 0, 0);
        g.translate(-ib.width / 2, -ib.height / 2);
        g.scale(sx, sy);
        g.strokeStyle = ink;
        g.lineWidth = parseFloat(getComputedStyle(icon).strokeWidth) || 1.5;
        g.lineCap = 'square';
        icon.querySelectorAll('path').forEach((p) => g.stroke(new Path2D(p.getAttribute('d') ?? '')));
        g.restore();
      } else {
        // words: each where the page laid it out (lines found from the words' boxes)
        g.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        g.fillStyle = ink;
        g.textBaseline = 'alphabetic';
        if ('letterSpacing' in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
        const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
        const range = document.createRange();
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const text = n.textContent ?? '';
          const re = /\S+/g;
          for (let m = re.exec(text); m; m = re.exec(text)) {
            range.setStart(n, m.index);
            range.setEnd(n, m.index + m[0].length);
            const rr = range.getBoundingClientRect();
            const fm = g.measureText(m[0]);
            g.fillText(m[0], rr.left - b.left, rr.bottom - b.top - fm.fontBoundingBoxDescent);
          }
        }
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    };

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      t += dt;
      const R = inside ? Math.max(w, h) * 0.24 : 0;

      // main blob: spring to the cursor
      pos.vx += ((target.x - pos.x) * 170 - pos.vx * 19) * dt;
      pos.vy += ((target.y - pos.y) * 170 - pos.vy * 19) * dt;
      pos.x += pos.vx * dt; pos.y += pos.vy * dt;
      // radius: underdamped, so it swells past its size and wobbles back; drains slower on the way out
      rv += ((R - r) * (inside ? 220 : 70) - rv * (inside ? 12 : 14)) * dt;
      r = Math.max(0, r + rv * dt);
      sv += (-squash * 260 - sv * 11) * dt;
      squash += sv * dt;

      // the smear: each drop chases the one in front, softer and softer
      let lead = pos;
      tail.forEach((d, i) => {
        const k = 70 - i * 8, c = 10 - i * 0.8;
        d.vx += ((lead.x - d.x) * k - d.vx * c) * dt;
        d.vy += ((lead.y - d.y) * k - d.vy * c) * dt;
        d.x += d.vx * dt; d.y += d.vy * dt;
        lead = d;
      });
      for (let i = pool.length - 1; i >= 0; i--) {
        const d = pool[i];
        const f = Math.exp(-dt * 6);
        d.vx *= f; d.vy *= f;
        d.x += d.vx * dt; d.y += d.vy * dt;
        d.r -= dt * Math.min(w, h) * 0.18;
        if (d.r <= 0) pool.splice(i, 1);
      }

      // the balls of the field
      const speed = Math.hypot(pos.vx, pos.vy);
      const st = Math.min(speed / (Math.max(w, h) * 9), 0.55);
      const vAng = speed > 1 ? Math.atan2(pos.vy, pos.vx) : sAng;
      const sq = Math.max(-0.45, Math.min(0.45, squash * 0.07));
      const ang = st > Math.abs(sq) ? vAng : sAng;
      const along = st > Math.abs(sq) ? 1 + st : 1 - sq;
      const balls: Ball[] = [];
      if (r > 0.3) {
        balls.push({ x: pos.x, y: pos.y, r, ax: r * along, ay: r / Math.max(0.55, along), c: Math.cos(ang), s: Math.sin(ang) });
        for (let i = 0; i < LOBES; i++) {
          const a = t * (1.1 + i * 0.43) * (i % 2 ? -1 : 1) + i * 2.1;
          const d = r * (0.6 + 0.18 * Math.sin(t * 1.6 + i * 1.9));
          balls.push({ x: pos.x + Math.cos(a) * d, y: pos.y + Math.sin(a) * d * 0.85, r: r * (0.36 + 0.1 * Math.sin(t * 2.1 + i * 1.3)) });
        }
        tail.forEach((d, i) => balls.push({ x: d.x, y: d.y, r: r * (0.62 - i * 0.07) }));
      }
      pool.forEach((d) => balls.push({ x: d.x, y: d.y, r: d.r }));

      // the field: sum of r^2 / d^2 (ellipse for the main blob), soft rim around 1
      if (img) {
        const px = img.data;
        for (let gy = 0; gy < gh; gy++) {
          const y = gy * CELL;
          for (let gx = 0; gx < gw; gx++) {
            const x = gx * CELL;
            let f = 0;
            for (const bl of balls) {
              const dx = x - bl.x, dy = y - bl.y;
              if (bl.ax !== undefined) {
                const u = (dx * bl.c! + dy * bl.s!) / bl.ax, v = (-dx * bl.s! + dy * bl.c!) / bl.ay!;
                f += 1 / (u * u + v * v + 1e-4);
              } else {
                f += (bl.r * bl.r) / (dx * dx + dy * dy + 1e-4);
              }
            }
            const a = Math.min(1, Math.max(0, (f - (1 - SOFT)) / (2 * SOFT)));
            const o = (gy * gw + gx) * 4;
            px[o] = lr; px[o + 1] = lg; px[o + 2] = lb;
            px[o + 3] = a * a * (3 - 2 * a) * 255;
          }
        }
        fg.putImageData(img, 0, 0);
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, canvas.width, canvas.height);
      if (balls.length) {
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.imageSmoothingEnabled = true;
        g.imageSmoothingQuality = 'high';
        g.drawImage(field, 0, 0, gw * CELL, gh * CELL);
        paintLabel();
      }

      const settled = !inside && r < 0.3 && Math.abs(rv) < 0.5 && pool.length === 0;
      if (settled) {
        r = 0; rv = 0;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, canvas.width, canvas.height);
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    btn.addEventListener('pointerenter', onEnter);
    btn.addEventListener('pointermove', onMove);
    btn.addEventListener('pointerleave', onLeave);
    btn.addEventListener('focus', onFocus);
    btn.addEventListener('blur', onBlur);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      btn.removeEventListener('pointerenter', onEnter);
      btn.removeEventListener('pointermove', onMove);
      btn.removeEventListener('pointerleave', onLeave);
      btn.removeEventListener('focus', onFocus);
      btn.removeEventListener('blur', onBlur);
    };
  }, [on, color]);

  if (!on) return null;
  return <canvas ref={cv} aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 h-full w-full" />;
}
