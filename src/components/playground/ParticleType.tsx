import { useRef } from 'react';
import { useCanvasLoop } from '@/hooks/useCanvasLoop';

interface P { x: number; y: number; hx: number; hy: number; vx: number; vy: number; lime: boolean }

/** Particles spring towards points sampled from the wordmark; the pointer pushes them away. */
export default function ParticleType({ text = 'WAQAR.' }: { text?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const parts = useRef<P[]>([]);

  useCanvasLoop(
    ref,
    ({ ctx, w, h, pointer, dt, reduced }) => {
      ctx.clearRect(0, 0, w, h);
      const k = dt * 60;
      const pale = new Path2D();
      const lime = new Path2D();
      for (const p of parts.current) {
        if (!reduced) {
          if (pointer) {
            const dx = p.x - pointer.x, dy = p.y - pointer.y;
            const d2 = dx * dx + dy * dy;
            const r = 90;
            if (d2 < r * r) {
              const f = (1 - Math.sqrt(d2) / r) * 6;
              const d = Math.sqrt(d2) || 1;
              p.vx += (dx / d) * f * k;
              p.vy += (dy / d) * f * k;
            }
          }
          p.vx += (p.hx - p.x) * 0.045 * k;
          p.vy += (p.hy - p.y) * 0.045 * k;
          p.vx *= Math.pow(0.84, k);
          p.vy *= Math.pow(0.84, k);
          p.x += p.vx * k;
          p.y += p.vy * k;
        }
        (p.lime ? lime : pale).rect(p.x, p.y, 1.8, 1.8);
      }
      ctx.fillStyle = '#E6EDF3';
      ctx.fill(pale);
      ctx.fillStyle = '#FF3831';
      ctx.fill(lime);
    },
    ({ w, h }) => {
      if (w < 2 || h < 2) return; // not laid out yet
      const off = document.createElement('canvas');
      off.width = Math.round(w);
      off.height = Math.round(h);
      const o = off.getContext('2d', { willReadFrequently: true })!;
      const size = Math.min(w / (text.length * 0.62), h * 0.62);
      o.font = `600 ${size}px "Space Grotesk Variable", "Space Grotesk", sans-serif`;
      o.textAlign = 'center';
      o.textBaseline = 'middle';
      o.fillStyle = '#fff';
      o.fillText(text, w / 2, h / 2);
      const data = o.getImageData(0, 0, off.width, off.height).data;
      const gap = w < 500 ? 3 : 5;
      const next: P[] = [];
      // x where the final character starts — the full stop is drawn in lime.
      const dotStart = w / 2 - o.measureText(text).width / 2 + o.measureText(text.slice(0, -1)).width;
      for (let y = 0; y < off.height; y += gap) {
        for (let x = 0; x < off.width; x += gap) {
          if (data[(y * off.width + x) * 4 + 3] > 128) {
            next.push({ x: Math.random() * w, y: Math.random() * h, hx: x, hy: y, vx: 0, vy: 0, lime: text.endsWith('.') && x > dotStart });
          }
        }
      }
      // Keep existing particles' current positions when re-seeding on resize.
      next.forEach((p, i) => { const old = parts.current[i]; if (old) { p.x = old.x; p.y = old.y; } });
      parts.current = next;
    },
  );

  return <canvas ref={ref} className="h-full w-full touch-none" aria-label={`Interactive particle wordmark reading ${text}`} role="img" />;
}
