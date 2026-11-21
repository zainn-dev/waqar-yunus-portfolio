import { useRef } from 'react';
import { useCanvasLoop } from '@/hooks/useCanvasLoop';

// Small seeded value-noise (no dependencies).
const perm = new Uint8Array(512);
{ const p = Array.from({ length: 256 }, (_, i) => i); let s = 7; for (let i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) perm[i] = p[i & 255]; }
const fade = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function noise(x: number, y: number) {
  const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255, xf = x - Math.floor(x), yf = y - Math.floor(y);
  const h = (i: number, j: number) => perm[perm[xi + i] + yi + j] / 255;
  return lerp(lerp(h(0, 0), h(1, 0), fade(xf)), lerp(h(0, 1), h(1, 1), fade(xf)), fade(yf));
}

interface Q { x: number; y: number; life: number }

/** Particles trace a slowly evolving noise field, leaving fading trails. The pointer adds a swirl. */
export default function FlowField() {
  const ref = useRef<HTMLCanvasElement>(null);
  const qs = useRef<Q[]>([]);

  useCanvasLoop(
    ref,
    ({ ctx, w, h, t, pointer, reduced }) => {
      ctx.fillStyle = reduced ? '#0D1117' : 'rgba(13,17,23,0.08)';
      ctx.fillRect(0, 0, w, h);
      const steps = reduced ? 120 : 1;
      const pale = new Path2D();
      const lime = new Path2D();
      for (let s = 0; s < steps; s++) {
        for (const q of qs.current) {
          let a = noise(q.x * 0.004, q.y * 0.004 + t * 0.05) * Math.PI * 4;
          if (pointer) {
            const dx = q.x - pointer.x, dy = q.y - pointer.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 19600) a += (1 - Math.sqrt(d2) / 140) * Math.PI * 0.9;
          }
          const nx = q.x + Math.cos(a) * 1.4, ny = q.y + Math.sin(a) * 1.4;
          const path = q.life % 9 === 0 ? lime : pale;
          path.moveTo(q.x, q.y); path.lineTo(nx, ny);
          q.x = nx; q.y = ny; q.life++;
          if (q.x < 0 || q.x > w || q.y < 0 || q.y > h || q.life > 400 + (q.life % 7) * 60) {
            q.x = Math.random() * w; q.y = Math.random() * h; q.life = Math.floor(Math.random() * 9);
          }
        }
      }
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(245,245,240,0.35)';
      ctx.stroke(pale);
      ctx.strokeStyle = 'rgba(255,59,47,0.8)';
      ctx.stroke(lime);
    },
    ({ w, h, ctx }) => {
      ctx.fillStyle = '#0D1117';
      ctx.fillRect(0, 0, w, h);
      const n = Math.round((w * h) / 1400);
      qs.current = Array.from({ length: Math.min(n, 700) }, () => ({ x: Math.random() * w, y: Math.random() * h, life: Math.floor(Math.random() * 400) }));
    },
  );

  return <canvas ref={ref} className="h-full w-full touch-none" role="img" aria-label="Generative lines flowing through a noise field" />;
}
