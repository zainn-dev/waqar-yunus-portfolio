import { useRef } from 'react';
import { useCanvasLoop } from '@/hooks/useCanvasLoop';

/**
 * Canvas 2D "liquid" distortion: the source image is redrawn as 2px horizontal strips,
 * each shifted by a decaying wave centred on the pointer. Source art is generated in code,
 * so there's nothing to download (swap `paintSource` for a real image if you like).
 */
function paintSource(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#FF3831');
  grad.addColorStop(0.55, '#EFEDE6');
  grad.addColorStop(1, '#FF3831');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(17,17,17,.18)';
  for (let x = 0; x < w; x += 28) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  g.fillStyle = '#111';
  g.font = `400 ${Math.min(w * 0.22, h * 0.5)}px "Space Grotesk Variable", "Space Grotesk", sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('WAQAR.', w / 2, h / 2);
  g.beginPath();
  g.arc(w * 0.8, h * 0.25, Math.min(w, h) * 0.08, 0, Math.PI * 2);
  g.fill();
  return c;
}

export default function ImageDistort() {
  const ref = useRef<HTMLCanvasElement>(null);
  const src = useRef<HTMLCanvasElement | null>(null);
  const amp = useRef(0);
  const focus = useRef({ x: 0, y: 0 });

  useCanvasLoop(
    ref,
    ({ ctx, w, h, t, pointer, reduced }) => {
      const s = src.current;
      if (!s) return;
      const target = pointer && !reduced ? 1 : 0;
      amp.current += (target - amp.current) * 0.08;
      if (pointer) { focus.current.x += (pointer.x - focus.current.x) * 0.2; focus.current.y += (pointer.y - focus.current.y) * 0.2; }
      ctx.clearRect(0, 0, w, h);
      if (amp.current < 0.01) { ctx.drawImage(s, 0, 0, w, h); return; }
      const strip = 2;
      const sx = s.width / w, sy = s.height / h;
      for (let y = 0; y < h; y += strip) {
        const dy = y - focus.current.y;
        const fall = Math.exp(-(dy * dy) / (2 * 70 * 70));
        const off = Math.sin(dy * 0.06 - t * 6) * 28 * fall * amp.current;
        ctx.drawImage(s, 0, y * sy, s.width, strip * sy, off, y, w, strip);
      }
      void sx;
    },
    ({ w, h }) => { if (w >= 2 && h >= 2) src.current = paintSource(w, h); },
  );

  return <canvas ref={ref} className="h-full w-full touch-none" role="img" aria-label="Generated artwork that ripples where you move the pointer" />;
}
