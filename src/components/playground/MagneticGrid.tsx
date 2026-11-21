import { useRef } from 'react';
import { useCanvasLoop } from '@/hooks/useCanvasLoop';

/** A grid of points that leans toward the pointer; points near it grow and turn lime. */
export default function MagneticGrid() {
  const ref = useRef<HTMLCanvasElement>(null);
  const ease = useRef<{ x: number; y: number; s: number } | null>(null);

  useCanvasLoop(ref, ({ ctx, w, h, pointer, t, reduced }) => {
    ctx.clearRect(0, 0, w, h);
    // Idle: an invisible "pointer" orbits so the piece is alive without interaction.
    const target = pointer ?? { x: w / 2 + Math.cos(t * 0.6) * w * 0.28, y: h / 2 + Math.sin(t * 0.9) * h * 0.25 };
    if (!ease.current) ease.current = { ...target, s: 0 };
    const e = ease.current;
    e.x += (target.x - e.x) * (reduced ? 1 : 0.12);
    e.y += (target.y - e.y) * (reduced ? 1 : 0.12);
    const gap = w < 500 ? 22 : 28;
    const R = Math.min(w, h) * 0.38;
    const BUCKETS = 6;
    const paths = Array.from({ length: BUCKETS }, () => new Path2D());
    const hot = new Path2D();
    for (let y = gap / 2; y < h; y += gap) {
      for (let x = gap / 2; x < w; x += gap) {
        const dx = e.x - x, dy = e.y - y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const f = Math.max(0, 1 - d / R);
        const px = x + dx * f * 0.35;
        const py = y + dy * f * 0.35;
        const r = 1.2 + f * 3.4;
        const path = f > 0.55 ? hot : paths[Math.min(BUCKETS - 1, Math.floor(f * BUCKETS))];
        path.moveTo(px + r, py);
        path.arc(px, py, r, 0, Math.PI * 2);
      }
    }
    paths.forEach((path, i) => {
      ctx.fillStyle = `rgba(245,245,240,${0.18 + (i / BUCKETS) * 0.8})`;
      ctx.fill(path);
    });
    ctx.fillStyle = '#FF3831';
    ctx.fill(hot);
  });

  return <canvas ref={ref} className="h-full w-full touch-none" role="img" aria-label="Interactive grid of points that bends towards the pointer" />;
}
