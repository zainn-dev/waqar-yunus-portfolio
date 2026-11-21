import { Link } from 'react-router-dom';
import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { socials, hasHref } from '@/data/socials';
import { brandIcons } from '@/lib/icons';
import { hasWebGL } from '@/utils/motion';
import { useIsDesktop, useReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/utils/cn';

const ParticleScene = lazy(() => import('@/components/social/ParticleScene'));

const AUTOPLAY = 6000;
/** Stable across renders: a new array here would rebuild the particle geometry on every render. */
const SHAPES = socials.map((s) => s.icon);

/** If the 3D chunk or its shaders fail, show the static icon rather than nothing. */
class SceneBoundary extends Component<{ fallback: ReactNode; onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function Arrow({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 80 14" className={cn('h-4 w-20', dir === 'left' && '-scale-x-100')} aria-hidden="true">
      <path d="M0 10H78L70 2" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function StaticIcon({ icon }: { icon: string }) {
  const data = brandIcons[icon];
  if (!data) return null;
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="so-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#dfe4ea" />
          <stop offset="1" stopColor="#6c7684" />
        </linearGradient>
      </defs>
      <path d={data.path} fill="url(#so-g)" />
    </svg>
  );
}

/**
 * The social carousel: a misty stage where each platform's icon is built from particles.
 * Arrows, keyboard (←/→ when focused), swipe and the labels switch platforms; selecting the
 * framed label opens the profile. Falls back to a static icon without WebGL or with reduced motion.
 */
export function SocialOrbit({ heading = true, fill = false }: { heading?: boolean; fill?: boolean }) {
  const root = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [near, setNear] = useState(false);
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);
  const [webgl] = useState(() => typeof window !== 'undefined' && hasWebGL());
  const reduced = useReducedMotion();
  const desktop = useIsDesktop();
  const swipe = useRef<number | null>(null);
  const n = socials.length;
  const [failed, setFailed] = useState(false);
  const onFail = useCallback(() => setFailed(true), []);
  const use3D = webgl && !reduced && !failed;

  const go = useCallback((step: number) => setIndex((i) => (i + step + n) % n), [n]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ioNear = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '400px' });
    const ioIn = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.15 });
    ioNear.observe(el);
    ioIn.observe(el);
    return () => { ioNear.disconnect(); ioIn.disconnect(); };
  }, []);

  useEffect(() => {
    if (paused || reduced || !inView) return;
    const id = window.setTimeout(() => go(1), AUTOPLAY);
    return () => window.clearTimeout(id);
  }, [index, paused, reduced, inView, go]);

  if (n === 0) return null;
  const cur = socials[index];
  const prev = socials[(index - 1 + n) % n];
  const next = socials[(index + 1) % n];
  const linked = hasHref(cur);

  return (
    <section
      ref={root}
      aria-roledescription="carousel"
      aria-label="Social profiles"
      className="relative isolate overflow-hidden text-ink"
      style={{ background: 'radial-gradient(120% 80% at 50% 30%, #dfe2e7 0%, #c3c8cf 55%, #aeb4bc 100%)' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      }}
      onPointerDown={(e) => { if (e.pointerType !== 'mouse') swipe.current = e.clientX; }}
      onPointerUp={(e) => {
        if (swipe.current === null) return;
        const dx = e.clientX - swipe.current;
        swipe.current = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      }}
    >
      {/* soft haze bands */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/40 to-transparent" />

      {heading && (
        <div className="page-wrap relative z-10 flex flex-wrap items-end justify-between gap-4 pt-16 md:pt-20">
          <h2 className="font-display text-[clamp(1.75rem,3.2vw,3rem)] font-medium leading-none tracking-[-0.035em] text-ink">Find me online.</h2>
          <p className="font-mono text-xs text-ink/60">{String(index + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</p>
        </div>
      )}

      <div className={cn('relative min-h-[440px]', fill ? 'h-[calc(100svh-7.5rem)] cursor-grab active:cursor-grabbing' : 'h-[min(78svh,760px)]')}>
        <div className="absolute inset-0">
          {use3D && near ? (
            <SceneBoundary onError={onFail} fallback={null}>
              <Suspense fallback={null}>
                <ParticleScene shapes={SHAPES} index={index} active={inView} dense={desktop} onFail={onFail} />
              </Suspense>
            </SceneBoundary>
          ) : (
            <div className="flex h-full items-center justify-center pb-24">
              <div key={cur.icon} className="h-[38%] w-[38%] max-w-[260px] animate-[fadein_.6s_ease]">
                <StaticIcon icon={cur.icon} />
              </div>
            </div>
          )}
        </div>

        <button type="button" onClick={() => go(-1)} aria-label={`Previous: ${prev.label}`} className="absolute left-2 top-1/2 z-10 flex h-14 -translate-y-1/2 items-center px-3 text-ink/70 transition-colors hover:text-ink md:left-[5%]">
          <Arrow dir="left" />
        </button>
        <button type="button" onClick={() => go(1)} aria-label={`Next: ${next.label}`} className="absolute right-2 top-1/2 z-10 flex h-14 -translate-y-1/2 items-center px-3 text-ink/70 transition-colors hover:text-ink md:right-[5%]">
          <Arrow dir="right" />
        </button>

        <div className="absolute inset-x-0 bottom-6 z-10 flex items-center justify-center gap-4 font-mono text-sm md:bottom-10 md:gap-16">
          <button type="button" onClick={() => go(-1)} className="hidden min-h-[44px] w-36 truncate text-right text-ink/40 transition-colors hover:text-ink/70 sm:block" tabIndex={-1} aria-hidden="true">
            {prev.label}
          </button>
          <div className="relative">
            {(['left-0 top-0 border-l border-t', 'right-0 top-0 border-r border-t', 'left-0 bottom-0 border-l border-b', 'right-0 bottom-0 border-r border-b'] as const).map((c) => (
              <span key={c} aria-hidden="true" className={cn('absolute h-3 w-3 border-ink transition-colors duration-300 [div:hover>&]:border-lime', c)} />
            ))}
            {linked ? (
              <a href={cur.href} target="_blank" rel="noopener noreferrer" className="flex min-h-[52px] min-w-[11rem] flex-col items-center justify-center px-7 py-2 text-ink" aria-live="polite">
                <span className="font-semibold">{cur.label}</span>
                <span className="text-[11px] text-ink/60">{cur.handle || 'Open profile'}<span className="sr-only"> (opens in a new tab)</span></span>
              </a>
            ) : (
              <Link to="/contact" className="group flex min-h-[52px] min-w-[11rem] flex-col items-center justify-center px-7 py-2 text-ink" aria-live="polite">
                <span className="font-semibold">{cur.label}</span>
                <span className="text-[11px] text-ink/55 transition-colors group-hover:text-lime">Coming soon — get in touch</span>
              </Link>
            )}
          </div>
          <button type="button" onClick={() => go(1)} className="hidden min-h-[44px] w-36 truncate text-left text-ink/40 transition-colors hover:text-ink/70 sm:block" tabIndex={-1} aria-hidden="true">
            {next.label}
          </button>
        </div>
      </div>

      {/* Plain list for screen readers and as a no-JS-friendly index */}
      <ul className="sr-only">
        {socials.map((s) => (
          <li key={s.label}>{hasHref(s) ? <a href={s.href}>{s.label}</a> : `${s.label} (link coming soon)`}</li>
        ))}
      </ul>
    </section>
  );
}
