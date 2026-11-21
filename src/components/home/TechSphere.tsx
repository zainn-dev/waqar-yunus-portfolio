import { useEffect, useMemo, useRef, useState } from 'react';
import { technologies } from '@/data/home';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/utils/cn';

/**
 * Draggable 3D arrangement of technologies, built with DOM + CSS transforms (no WebGL).
 * Items sit on a Fibonacci sphere; drag/swipe rotates with inertia; hover reveals the name;
 * click/Enter selects and shows a description. A plain list view is one click away.
 */
export function TechSphere() {
  const stage = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const reduced = useReducedMotion();
  const [selected, setSelected] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [listView, setListView] = useState(false);
  const state = useRef({ rx: -0.25, ry: 0.4, vx: 0, vy: 0.0025, drag: false, lx: 0, ly: 0, moved: 0 });

  const points = useMemo(() => {
    const n = technologies.length;
    const golden = Math.PI * (3 - Math.sqrt(5));
    return technologies.map((_, i) => {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = golden * i;
      return { x: Math.cos(th) * r, y, z: Math.sin(th) * r };
    });
  }, []);

  useEffect(() => {
    if (listView) return;
    let raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!stage.current) return;
      // Skip work while off screen (checked per frame; cheaper and more reliable than an observer here).
      const box = stage.current.getBoundingClientRect();
      if (box.bottom < 0 || box.top > window.innerHeight) return;
      const s = state.current;
      if (!s.drag) {
        s.ry += s.vy;
        s.rx += s.vx;
        s.vx *= 0.94;
        s.vy = s.vy * 0.96 + (reduced ? 0 : 0.0025) * 0.04;
        s.rx = Math.max(-1.1, Math.min(1.1, s.rx));
      }
      const R = Math.min(stage.current.clientWidth, 520) * 0.4;
      const cx = Math.cos(s.rx), sx = Math.sin(s.rx), cy = Math.cos(s.ry), sy = Math.sin(s.ry);
      points.forEach((p, i) => {
        const el = items.current[i];
        if (!el) return;
        const x1 = p.x * cy + p.z * sy;
        const z1 = -p.x * sy + p.z * cy;
        const y2 = p.y * cx - z1 * sx;
        const z2 = p.y * sx + z1 * cx;
        const depth = (z2 + 1) / 2; // 0 back … 1 front
        el.style.transform = `translate(-50%,-50%) translate3d(${x1 * R}px, ${y2 * R}px, 0) scale(${0.6 + depth * 0.55})`;
        el.style.opacity = String(0.25 + depth * 0.75);
        el.style.zIndex = String(Math.round(depth * 100));
      });
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [points, reduced, listView]);

  const onDown = (e: React.PointerEvent) => {
    const s = state.current;
    s.drag = true; s.lx = e.clientX; s.ly = e.clientY; s.moved = 0;
  };
  const onMove = (e: React.PointerEvent) => {
    const s = state.current;
    if (!s.drag) return;
    const dx = e.clientX - s.lx, dy = e.clientY - s.ly;
    s.moved += Math.abs(dx) + Math.abs(dy);
    s.ry += dx * 0.006; s.rx += dy * 0.006;
    s.vy = dx * 0.006; s.vx = dy * 0.006;
    s.lx = e.clientX; s.ly = e.clientY;
  };
  const onUp = () => { state.current.drag = false; };

  const t = technologies[selected];

  return (
    <section aria-labelledby="tech-title" className="py-24 md:py-32">
      <div className="page-wrap grid gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-4">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-mute">Toolkit</p>
          <h2 id="tech-title" className="t-section mt-6">The stack.</h2>
          <p className="mt-6 max-w-[38ch] text-bone/75">Drag to spin it. Hover a tool for its name, select one to read how I use it.</p>
          <div className="mt-10 min-h-[11rem] border-t border-line pt-6" aria-live="polite">
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-mute">{t.category}</p>
            <h3 className="mt-2 flex items-center gap-3 font-display text-3xl font-normal tracking-[-0.03em]">
              <BrandIcon icon={t.icon} name={t.name} className="h-6 w-6" />{t.name}
            </h3>
            <p className="mt-3 max-w-[40ch] text-mute">{t.description}</p>
          </div>
          <button type="button" onClick={() => setListView((v) => !v)} className="link-underline mt-6 min-h-[44px] text-sm" aria-pressed={listView}>
            {listView ? 'Show 3D view' : 'Show as a list'}
          </button>
        </div>

        <div className="lg:col-span-7 lg:col-start-6">
          {listView ? (
            <ul className="grid grid-cols-2 border-t border-line sm:grid-cols-3">
              {technologies.map((tech, i) => (
                <li key={tech.name} className="border-b border-line">
                  <button type="button" onClick={() => setSelected(i)} aria-pressed={selected === i} className={cn('flex min-h-[52px] w-full items-center gap-3 py-3 text-left', selected === i && 'text-accent')}>
                    <BrandIcon icon={tech.icon} name={tech.name} className="h-4 w-4" />{tech.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div
              ref={stage}
              className="relative mx-auto aspect-square w-full max-w-[560px] cursor-grab touch-none select-none active:cursor-grabbing"
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerLeave={onUp}
              onPointerCancel={onUp}
            >
              <span aria-hidden="true" className="absolute inset-[10%] rounded-full border border-line" />
              <span aria-hidden="true" className="absolute inset-[30%] rounded-full border border-dashed border-line" />
              <ul aria-label="Technologies">
                {technologies.map((tech, i) => (
                  <li key={tech.name}>
                    <button
                      ref={(el) => { items.current[i] = el; }}
                      type="button"
                      onClick={(e) => { if (e.detail === 0 || state.current.moved < 8) setSelected(i); }}
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(i)}
                      onBlur={() => setHover(null)}
                      aria-pressed={selected === i}
                      className={cn(
                        'absolute left-1/2 top-1/2 flex items-center gap-2 rounded-full border px-3 py-2 font-display text-sm transition-colors duration-300 will-change-transform',
                        selected === i ? 'border-transparent bg-lime text-onfill' : 'border-line bg-ink hover:border-bone',
                      )}
                    >
                      <BrandIcon icon={tech.icon} name={tech.name} className="h-4 w-4" />
                      <span className={cn('whitespace-nowrap', hover === i || selected === i ? 'inline' : 'sr-only sm:not-sr-only')}>{tech.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
