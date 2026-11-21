import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { projects, projectPath } from '@/data/projects';
import { primaryCategory } from '@/utils/project';
import { gsap, useGSAP } from '@/lib/gsap';
import { prefersReducedMotion } from '@/utils/motion';

const initials = (t: string) => t.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/** Monochrome typographic mark — a generated monogram + name. Not a reproduction of any real logo. */
function Mark({ title, meta, to }: { title: string; meta: string; to: string }) {
  return (
    <li data-mark-item className="shrink-0">
      <Link to={to} className="group flex min-h-[44px] items-center gap-4 px-8 md:px-12">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line font-display text-sm font-medium transition-colors duration-500 group-hover:border-transparent group-hover:bg-neon group-hover:text-[#111]">
          {initials(title)}
        </span>
        <span>
          <span className="block font-display text-2xl font-normal tracking-[-0.03em] md:text-3xl">{title}</span>
          <span className="block font-mono text-[11px] uppercase tracking-[0.08em] text-mute">{meta}</span>
        </span>
      </Link>
    </li>
  );
}

function Row({ reverse, items }: { reverse?: boolean; items: typeof projects }) {
  const marks = items.map((p) => <Mark key={p.slug} title={p.title} meta={primaryCategory(p)} to={projectPath(p.slug)} />);
  return (
    <div className="marquee overflow-hidden py-5" style={{ ['--marquee-duration' as string]: '46s' }}>
      <ul className="marquee-track flex w-max" style={{ animationDirection: reverse ? 'reverse' : 'normal' }}>
        {marks}
        {items.map((p) => (
          <li key={`${p.slug}-dup`} aria-hidden="true" className="shrink-0">
            <span className="flex items-center gap-4 px-8 md:px-12 opacity-100">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line font-display text-sm font-medium">{initials(p.title)}</span>
              <span>
                <span className="block font-display text-2xl font-normal tracking-[-0.03em] md:text-3xl">{p.title}</span>
                <span className="block font-mono text-[11px] uppercase tracking-[0.08em] text-mute">{primaryCategory(p)}</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LogoWall() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from('[data-mark-item]', { opacity: 0, y: 20, duration: 0.65, stagger: 0.05, ease: 'power3.out', scrollTrigger: { trigger: ref.current, start: 'top 85%', once: true } });
    },
    { scope: ref },
  );
  const half = Math.ceil(projects.length / 2);
  return (
    <section ref={ref} aria-labelledby="wall-title" className="border-y border-line py-16 md:py-20">
      <div className="page-wrap mb-8 flex flex-wrap items-end justify-between gap-4">
        <h2 id="wall-title" className="font-mono text-xs uppercase tracking-[0.12em]">Organisations & products in my portfolio</h2>
        <p className="text-sm text-mute">Hover to pause. Select one to read about the project.</p>
      </div>
      <Row items={projects.slice(0, half)} />
      <Row items={projects.slice(half)} reverse />
    </section>
  );
}
