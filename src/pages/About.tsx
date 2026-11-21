import { Suspense, lazy, useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { profile } from '@/data/profile';
import { services } from '@/data/services';
import { projects, projectPath } from '@/data/projects';
import { Seo } from '@/components/ui/Seo';
import { pageMeta } from '@/data/seo';
import { ClientConfessions } from '@/components/home/ClientConfessions';
import { useIsDesktop, useReducedMotion } from '@/hooks/useMediaQuery';
import { TechGlyph, TechGrid, findTech } from '@/components/about/TechIcons';
import type { GlobeInput } from '@/components/three/GlobeScene';

const GlobeScene = lazy(() => import('@/components/three/GlobeScene'));

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Dimmed, slowly turning project globe (the home's globe view); click opens a project. */
function AmbientGlobe() {
  const reduced = useReducedMotion();
  const desktop = useIsDesktop();
  const input = useRef<GlobeInput>({ dx: 0, dy: 0, wheel: 0, dragging: false, lastInput: 0 });
  const [gl, setGl] = useState(false);
  useEffect(() => setGl(hasWebGL()), []);

  const navigate = useNavigate();
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [shown, setShown] = useState(() => typeof document === 'undefined' || !document.hidden);

  // keep rendering while on screen and the tab is visible; the globe's own idle drift does the motion (same as home)
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const on = () => setShown(!document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  const onSelect = useCallback((slug: string) => navigate(projectPath(slug)), [navigate]);

  return (
    <div ref={box} aria-hidden="true" data-cursor="Open" className="relative h-full w-full overflow-hidden bg-ink opacity-[0.65]">
      {gl && !reduced && (
        <Suspense fallback={null}>
          <GlobeScene projects={projects} input={input} active={visible && shown} reduced={false} mobile={!desktop} onSelect={onSelect} />
        </Suspense>
      )}
      <div className="pointer-events-none absolute inset-0 bg-ink/15" />
    </div>
  );
}

export default function About() {
  const paras = useMemo(() => [profile.shortBio, ...profile.story.slice(0, 2)], []);
  return (
    <>
      <Seo title={pageMeta['/about'].title} description={pageMeta['/about'].description} type="profile" />

      <section aria-labelledby="about-title" className="border-t border-[var(--grid)] bg-ink lg:grid lg:grid-cols-[36%_64%]">
        <div className="px-4 py-10 sm:px-8 lg:border-r lg:border-[var(--grid)] lg:p-14">
          <h1 id="about-title" className="text-wave font-display text-[clamp(3rem,5vw,5.5rem)] uppercase leading-[0.9] text-bone">
            I am {profile.brand}
          </h1>
          <div className="mt-8 space-y-5 font-sans text-[1.15rem] leading-relaxed text-bone">
            {paras.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <div className="mt-12 space-y-10">
            {services.map((s, i) => (
              <div key={s.title}>
                <h2 className="text-wave mb-3 font-mono text-xs uppercase tracking-[0.14em] text-accent" style={{ '--wave-delay': `${i * 0.3}s` } as CSSProperties}>
                  {s.title}
                </h2>
                {s.technologies.some((t) => findTech(t)) && (
                  <div className="tech-row mb-3 flex items-center gap-3" aria-label={`Tools: ${s.technologies.join(', ')}`}>
                    {s.technologies.filter((t) => findTech(t)).map((t) => <TechGlyph key={t} name={t} size={16} />)}
                  </div>
                )}
                <ul>
                  {s.deliverables.map((d) => (
                    <li key={d} className="border-t border-[var(--grid)] py-2 font-sans text-mute">{d}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-14">
            <h2 className="text-wave mb-4 font-mono text-xs uppercase tracking-[0.14em] text-accent">Tools &amp; Languages</h2>
            <TechGrid />
          </div>
        </div>
        <div className="h-[60svh] lg:sticky lg:top-0 lg:h-[calc(100svh-var(--bar-h))] lg:self-start">
          <AmbientGlobe />
        </div>
      </section>

      <ClientConfessions />
    </>
  );
}
