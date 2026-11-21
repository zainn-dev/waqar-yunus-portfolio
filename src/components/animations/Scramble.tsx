import { useEffect, useRef, useState, type ElementType } from 'react';
import { prefersReducedMotion } from '@/utils/motion';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#*+-';

/**
 * Decodes text character by character when `active` turns true (hover / focus / reveal).
 * The real text is always the accessible name; the scrambling layer is aria-hidden.
 */
export function Scramble({ text, active, as: Tag = 'span', className }: { text: string; active: boolean; as?: ElementType; className?: string }) {
  const [out, setOut] = useState(text);
  const raf = useRef(0);

  useEffect(() => {
    if (!active || prefersReducedMotion()) { setOut(text); return; }
    const start = performance.now();
    const total = 520 + text.length * 22;
    const tick = (now: number) => {
      const p = (now - start) / total;
      const revealed = Math.floor(p * text.length);
      setOut(
        text
          .split('')
          .map((ch, i) => (ch === ' ' || i < revealed ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join(''),
      );
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setOut(text);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [active, text]);

  return (
    <Tag className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{out}</span>
    </Tag>
  );
}
