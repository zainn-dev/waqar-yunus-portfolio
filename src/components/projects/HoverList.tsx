import { projectPath } from '@/data/projects';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Project } from '@/types/content';
import { gsap } from '@/lib/gsap';
import { useFinePointer, useReducedMotion } from '@/hooks/useMediaQuery';
import { ProjectCover } from '@/components/projects/ProjectCover';
import { primaryCategory } from '@/utils/project';

/** Large typographic rows; on desktop a cover preview follows the pointer. */
export function HoverList({ projects }: { projects: Project[] }) {
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const preview = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const enabled = fine && !reduced;

  useEffect(() => {
    if (!enabled || !preview.current) return;
    const xTo = gsap.quickTo(preview.current, 'x', { duration: 0.6, ease: 'power3' });
    const yTo = gsap.quickTo(preview.current, 'y', { duration: 0.6, ease: 'power3' });
    const move = (e: PointerEvent) => { xTo(e.clientX); yTo(e.clientY); };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, [enabled]);

  return (
    <div onPointerLeave={() => setActive(null)}>
      <ul className="border-t border-line">
        {projects.map((p, i) => (
          <li key={p.slug} className="border-b border-line">
            <Link
              to={projectPath(p.slug)}
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(null)}
              data-cursor="View project"
              className="group grid grid-cols-[auto_1fr] items-baseline gap-x-5 gap-y-1 py-6 md:grid-cols-[3rem_1fr_auto] md:py-8"
            >
              <span className="font-mono text-xs text-mute">{String(i + 1).padStart(2, '0')}</span>
              <span className="font-display text-[clamp(1.75rem,5vw,5rem)] font-normal leading-[0.95] tracking-[-0.05em] transition-[color,transform] duration-500 ease-expo group-hover:translate-x-3 group-hover:text-accent">
                {p.title}
              </span>
              <span className="col-start-2 text-sm text-mute md:col-start-3">{primaryCategory(p)}</span>
            </Link>
          </li>
        ))}
      </ul>
      {enabled && (
        <div ref={preview} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-30">
          <div
            className="aspect-[4/3] w-[22rem] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[4px] transition-[opacity,transform] duration-500 ease-expo"
            style={{ opacity: active === null ? 0 : 1, transform: `translate(-50%,-50%) scale(${active === null ? 0.8 : 1}) rotate(${active === null ? -4 : 0}deg)` }}
          >
            {projects.map((p, i) => (
              <div key={p.slug} className="absolute inset-0 transition-opacity duration-300" style={{ opacity: active === i ? 1 : 0 }}>
                <ProjectCover project={p} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
