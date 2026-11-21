import { lazy, Suspense, useRef, useState, useSyncExternalStore } from 'react';
import { Moon, Sun, Sunset } from 'lucide-react';
import { profile } from '@/data/profile';
import { gsap, useGSAP } from '@/lib/gsap';
import { useIntro } from '@/app/intro';
import { sky, type SkyMode } from '@/lib/sky';
import { hasWebGL, prefersReducedMotion } from '@/utils/motion';
import { useIsDesktop, useReducedMotion } from '@/hooks/useMediaQuery';
import { useInView } from '@/components/three/useInView';
import { cn } from '@/utils/cn';

const SkyScene = lazy(() => import('@/components/three/SkyScene'));
const modes: { id: SkyMode; label: string; Icon: typeof Sun }[] = [
  { id: 'day', label: 'Day', Icon: Sun },
  { id: 'sunset', label: 'Sunset', Icon: Sunset },
  { id: 'night', label: 'Night', Icon: Moon },
];

/** Full-screen 3D sky hero: headline, annotation, intro, day/sunset/night switch. */
export function SkyHero() {
  const ref = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const { ready } = useIntro();
  const mode = useSyncExternalStore(sky.subscribe, sky.get, () => 'day' as SkyMode);
  const inView = useInView(ref, '0px');
  const desktop = useIsDesktop();
  const reduced = useReducedMotion();
  const [webgl] = useState(() => typeof window !== 'undefined' && hasWebGL());
  const night = mode === 'night';

  useGSAP(
    () => {
      ScrollTriggerProgress();
      function ScrollTriggerProgress() {
        gsap.to({}, { scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom top', scrub: true, onUpdate: (s) => { progress.current = s.progress; } } });
      }
      if (prefersReducedMotion()) return;
      if (!ready) { gsap.set('[data-sw]', { yPercent: 110 }); gsap.set('[data-sf]', { opacity: 0, y: 12 }); return; }
      gsap.timeline({ defaults: { ease: 'expo.out' } })
        .fromTo('[data-sw]', { yPercent: 110 }, { yPercent: 0, duration: 1.4, stagger: 0.06, delay: 0.3 })
        .fromTo('[data-sf]', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 1, stagger: 0.1 }, 1);
      gsap.to('[data-shead]', { yPercent: -40, opacity: 0, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top top', end: '60% top', scrub: true } });
    },
    { scope: ref, dependencies: [ready], revertOnUpdate: true },
  );

  const [l1, l2] = profile.heroHeadline;
  const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <section ref={ref} aria-labelledby="hero-title" className={cn('relative h-[100svh] min-h-[560px] overflow-hidden', night && 'theme-dark')}>
      <div className="absolute inset-0" style={{ background: night ? 'radial-gradient(120% 90% at 60% 20%, #26324d 0%, #121a2c 55%, #0a0f1c 100%)' : mode === 'sunset' ? 'linear-gradient(180deg,#6f86b8 0%,#b9a7c4 40%,#f2c3b3 72%,#f6ddd0 100%)' : 'linear-gradient(180deg,#5d8fdc 0%,#86aee6 38%,#bcd3f1 70%,#e8eef7 100%)' }}>
        {webgl && (
          <Suspense fallback={null}>
            <SkyScene mode={mode} progress={progress} active={inView} mobile={!desktop} reduced={reduced} />
          </Suspense>
        )}
      </div>
      {/* white mist veil at the top, fade to the white page at the bottom */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/35 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white to-transparent" />

      <div className="pointer-events-none relative flex h-full flex-col page-x pb-8 pt-[calc(var(--header-h)+env(safe-area-inset-top)+1.5rem)]">
        <h1 id="hero-title" data-shead className="mx-auto text-center font-display font-normal leading-[0.98] tracking-[-0.045em] text-bone" style={{ fontSize: 'clamp(2.4rem, 5.6vw, 6.4rem)' }} aria-label={profile.heroHeadline.join(' ')}>
          {[l1, l2].map((line) => (
            <span key={line} className="block overflow-hidden pb-[0.12em] -mb-[0.12em]" aria-hidden="true">
              <span data-sw className="block">{titleCase(line)}</span>
            </span>
          ))}
        </h1>

        {/* points at the little seated avatar on the bottom-left hand */}
        <p data-sf className="pointer-events-none absolute left-[29%] top-[55%] hidden max-w-[16rem] text-[15px] font-bold leading-snug text-bone md:block">
          <svg viewBox="0 0 60 40" className="absolute -left-16 top-3 h-10 w-14" aria-hidden="true"><path d="M58 8C42 2 20 6 6 26M6 26l1-10M6 26l9-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
          Yes, that’s me —
          <br />
          on my third chai.
        </p>

        <div className="mt-auto flex flex-col-reverse items-center gap-6 md:flex-row md:items-end md:justify-between">
          <div data-sf className="pointer-events-auto flex flex-col items-center gap-2" role="radiogroup" aria-label="Sky">
            <div className="flex items-center gap-5">
              {modes.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={mode === id}
                  aria-label={label}
                  onClick={() => sky.set(id)}
                  className={cn('flex h-11 w-11 items-center justify-center rounded-full border transition-colors duration-300', mode === id ? 'border-bone/50' : 'border-transparent opacity-60 hover:opacity-100')}
                >
                  <Icon className="h-4 w-4 text-bone" aria-hidden="true" />
                </button>
              ))}
            </div>
            <div className="relative h-px w-36 bg-bone/30" aria-hidden="true">
              <span className="absolute -top-[3px] h-[7px] w-[7px] rounded-full bg-bone transition-all duration-500" style={{ left: `${modes.findIndex((m) => m.id === mode) * 50}%` }} />
            </div>
          </div>
          <p data-sf className="max-w-[26rem] text-center text-[14px] font-bold leading-snug text-bone md:text-right md:text-[15px]">
            I’m Waqar, a creative developer in Delhi. I design and build websites, online stores and web apps, and wire up the payments and APIs behind them — fast, clear and built to grow with you.
          </p>
        </div>
      </div>
    </section>
  );
}
