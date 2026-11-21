import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { gsap } from '@/lib/gsap';
import { useFinePointer, useReducedMotion } from '@/hooks/useMediaQuery';

const SIZE = { idle: 14, hover: 64, down: 10 } as const;

/**
 * Custom desktop cursor: a solid circle drawn with `mix-blend-mode: difference`, so it reads black
 * on light sections and white on dark ones. It swells over anything clickable. Elements can opt in
 * to a label with `data-cursor="View project"` — that shows a sage pill with the text instead.
 * Disabled on touch / coarse pointers and for reduced motion (native cursor stays).
 */
export function Cursor() {
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const enabled = fine && !reduced;
  const blob = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [hover, setHover] = useState(false);
  const [down, setDown] = useState(false);
  const [visible, setVisible] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => { setLabel(null); setHover(false); }, [pathname]);

  useEffect(() => {
    if (!enabled || !blob.current || !pill.current) return;
    document.documentElement.classList.add('has-cursor');
    const bx = gsap.quickTo(blob.current, 'x', { duration: 0.28, ease: 'power3' });
    const by = gsap.quickTo(blob.current, 'y', { duration: 0.28, ease: 'power3' });
    const px = gsap.quickTo(pill.current, 'x', { duration: 0.45, ease: 'power3' });
    const py = gsap.quickTo(pill.current, 'y', { duration: 0.45, ease: 'power3' });

    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      setVisible(true);
      bx(e.clientX); by(e.clientY); px(e.clientX); py(e.clientY);
    };
    let last: Element | null = null;
    const read = (t: Element | null) => {
      const labelled = t?.closest<HTMLElement>('[data-cursor]');
      setLabel(labelled?.dataset.cursor || null);
      setHidden(Boolean(t?.closest('[data-cursor-hide]')));
      setHover(Boolean(t?.closest('a, button, [role="button"], [role="radio"], label, summary, input[type="range"]')));
    };
    const over = (e: PointerEvent) => {
      last = e.target as Element | null;
      read(last);
    };
    // labels can change under a still pointer (e.g. hovering things inside a canvas)
    const mo = new MutationObserver(() => { if (last?.isConnected) read(last); });
    mo.observe(document.body, { attributes: true, attributeFilter: ['data-cursor'], subtree: true });
    const press = () => setDown(true);
    const release = () => setDown(false);
    const leave = () => setVisible(false);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerover', over, { passive: true });
    window.addEventListener('pointerdown', press, { passive: true });
    window.addEventListener('pointerup', release, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      mo.disconnect();
      document.documentElement.classList.remove('has-cursor');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerover', over);
      window.removeEventListener('pointerdown', press);
      window.removeEventListener('pointerup', release);
      document.documentElement.removeEventListener('pointerleave', leave);
    };
  }, [enabled]);

  if (!enabled) return null;

  const size = label ? 0 : down ? SIZE.down : hover ? SIZE.hover : SIZE.idle;
  return (
    <>
      {/* blend layer: must not sit inside anything that creates its own stacking context */}
      <div ref={blob} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[100] mix-blend-difference">
        <div
          className="-translate-x-1/2 -translate-y-1/2 rounded-full bg-white transition-[width,height,opacity] duration-500 ease-expo"
          style={{ width: size, height: size, opacity: visible && !hidden ? 1 : 0 }}
        />
      </div>
      <div ref={pill} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[101]">
        <div
          className="flex items-center justify-center rounded-full bg-lime text-center transition-[transform,opacity] duration-500 ease-expo"
          style={{ width: 104, height: 104, transform: `translate(-50%, -50%) scale(${label && visible && !hidden ? 1 : 0})`, opacity: label && visible && !hidden ? 1 : 0 }}
        >
          <span className="px-3 font-mono text-[11px] font-medium uppercase leading-tight tracking-[0.06em] text-onfill">{label}</span>
        </div>
      </div>
    </>
  );
}
