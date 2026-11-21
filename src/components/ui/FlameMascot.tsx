import { useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';

/**
 * The header mascot: a little flame with a face. The tongues flicker, embers drift up, it blinks,
 * and the pupils follow the pointer. Pure SVG + CSS (see `.flame-*` in index.css), so it is
 * instant to load; reduced motion stops the animation.
 */
export function FlameMascot({ className }: { className?: string }) {
  const root = useRef<SVGSVGElement>(null);
  const eyes = useRef<SVGGElement>(null);

  useEffect(() => {
    const svg = root.current;
    const pupils = eyes.current;
    if (!svg || !pupils) return;
    let raf = 0;
    let px = 0;
    let py = 0;
    const move = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const b = svg.getBoundingClientRect();
        const dx = px - (b.left + b.width / 2);
        const dy = py - (b.top + b.height * 0.66);
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, d / 260) * 2.6;
        pupils.setAttribute('transform', `translate(${((dx / d) * k).toFixed(2)} ${((dy / d) * k).toFixed(2)})`);
      });
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, []);

  return (
    <svg ref={root} viewBox="0 0 100 124" className={cn('flame overflow-visible', className)} aria-hidden="true">
      <defs>
        <linearGradient id="flame-outer" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#FF3831" />
          <stop offset="0.55" stopColor="#FF6A1F" />
          <stop offset="1" stopColor="#FFB01F" />
        </linearGradient>
        <linearGradient id="flame-inner" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#FFB01F" />
          <stop offset="1" stopColor="#FFE873" />
        </linearGradient>
      </defs>

      {/* embers */}
      <g className="flame-embers" fill="#FFB01F">
        <circle cx="30" cy="40" r="2.2" />
        <circle cx="70" cy="30" r="1.8" />
        <circle cx="52" cy="14" r="1.6" />
      </g>

      <g className="flame-body">
        {/* outer flame: three tongues */}
        <path
          className="flame-outer"
          fill="url(#flame-outer)"
          d="M50 116C25 116 12 99 14 79c1.6-15 11-23 13-38 6 9 9 15 13 17-1-17 5-33 16-48 2 18 10 27 16 37 2-6 4-11 3-17 10 14 15 30 13 48-2 23-15 38-38 38z"
        />
        {/* inner core */}
        <path
          className="flame-inner"
          fill="url(#flame-inner)"
          d="M50 110c-15 0-24-10-23-23 1-10 7-15 10-24 4 6 6 9 9 10 0-11 4-20 11-29 1 12 6 18 10 25 1-4 2-6 2-10 6 9 8 18 7 29-1 14-11 22-26 22z"
        />
        {/* face */}
        <g className="flame-eyes">
          <ellipse cx="41" cy="84" rx="6.2" ry="7.6" fill="#FFFDDB" />
          <ellipse cx="59" cy="84" rx="6.2" ry="7.6" fill="#FFFDDB" />
          <g ref={eyes}>
            <circle cx="41.6" cy="85" r="3.3" fill="#181616" />
            <circle cx="59.6" cy="85" r="3.3" fill="#181616" />
          </g>
        </g>
        <path d="M45 97c3 3 7 3 10 0" fill="none" stroke="#181616" strokeWidth="2.4" strokeLinecap="round" />
        <ellipse cx="33" cy="94" rx="3.4" ry="2" fill="#FF3831" opacity="0.55" />
        <ellipse cx="67" cy="94" rx="3.4" ry="2" fill="#FF3831" opacity="0.55" />
      </g>
    </svg>
  );
}
