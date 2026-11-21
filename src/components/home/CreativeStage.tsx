import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { hasWebGL, prefersReducedMotion } from '@/utils/motion';
import { useIsDesktop, useReducedMotion } from '@/hooks/useMediaQuery';
import { useInView } from '@/components/three/useInView';
import { GridLines } from '@/components/ui/GridLines';
import type { AvatarPose } from '@/components/three/Avatar';

const CreativeScene = lazy(() => import('@/components/three/StageScenes').then((m) => ({ default: m.CreativeScene })));

const capabilities = [
  ['Websites', 'that turn visitors into enquiries'],
  ['Interactive & 3D', 'that people talk about'],
  ['Online stores', 'with checkouts people finish'],
  ['APIs & integrations', 'that keep everything running'],
];

/** White grid stage: giant "Creative Developer." with the 3D avatar overlapping the type. */
export function CreativeStage() {
  const ref = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [pose, setPose] = useState<AvatarPose>('stand');
  // a short wave whenever the section comes into view, then back to standing
  useEffect(() => {
    if (pose !== 'wave') return;
    const t = window.setTimeout(() => setPose('stand'), 2800);
    return () => window.clearTimeout(t);
  }, [pose]);
  const near = useInView(ref, '400px');
  const desktop = useIsDesktop();
  const reduced = useReducedMotion();
  const [webgl] = useState(() => typeof window !== 'undefined' && hasWebGL());

  useGSAP(
    () => {
      const st = ScrollTrigger.create({
        trigger: ref.current,
        start: 'top top',
        end: desktop && !prefersReducedMotion() ? '+=120%' : 'bottom top',
        pin: desktop && !prefersReducedMotion(),
        scrub: true,
        onUpdate: (s) => { progress.current = s.progress; },
        onEnter: () => setPose('wave'),
        onEnterBack: () => setPose('wave'),
      });
      if (!prefersReducedMotion()) {
        gsap.from('[data-cdl]', { yPercent: 105, stagger: 0.04, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: ref.current, start: 'top 75%', once: true } });
        gsap.from('[data-cap]', { opacity: 0, x: 24, stagger: 0.08, duration: 0.65, ease: 'power3.out', scrollTrigger: { trigger: ref.current, start: 'top 55%', once: true } });
      }
      return () => st.kill();
    },
    { scope: ref, dependencies: [desktop] },
  );

  const word = (w: string) => w.split('').map((c, i) => (
    <span key={i} className="inline-block overflow-hidden pb-[0.14em] -mb-[0.14em] align-top"><span data-cdl className="inline-block">{c}</span></span>
  ));

  return (
    <section ref={ref} aria-labelledby="cd-title" className="relative h-[100svh] min-h-[620px] overflow-hidden bg-white text-[#111]">
      <GridLines />
      <p className="absolute left-[7.5%] top-[calc(var(--header-h)+3rem)] max-w-[34rem] pr-6 text-[15px] font-bold leading-snug md:text-base">
        Looking good is the starting line, not the finish. I build sites that load fast, explain clearly, bring in enquiries — and keep working long after launch day.
      </p>

      <h2 id="cd-title" className="absolute inset-x-0 top-[40%] -translate-y-1/2 text-center font-display font-medium leading-none tracking-[-0.055em] md:top-1/2" style={{ fontSize: 'clamp(3.2rem, 11.5vw, 15rem)' }} aria-label="Creative Developer.">
        <span aria-hidden="true" className="block md:inline">{word('Creative')}</span>
        <span aria-hidden="true" className="md:ml-[0.25em]">{word('Developer.')}</span>
      </h2>

      {webgl && near && (
        <div className="absolute inset-x-[22%] bottom-[6%] top-[46%] md:inset-x-[28%] md:bottom-0 md:top-[10%]">
          <Suspense fallback={null}>
            <CreativeScene progress={progress} pose={pose} active={near} reduced={reduced} mobile={!desktop} />
          </Suspense>
        </div>
      )}

      <ul className="absolute bottom-24 right-[4%] hidden space-y-5 text-right text-[15px] font-bold leading-snug lg:block">
        {capabilities.map(([a, b]) => (
          <li key={a} data-cap>{a}<br /><span className="font-bold">{b}</span></li>
        ))}
      </ul>

      <div className="absolute inset-x-0 bottom-5 flex justify-between px-[2%] font-mono text-xs font-medium uppercase tracking-[0.06em]">
        <span>Independent</span>
        <span className="hidden sm:inline">Based in Delhi, India</span>
        <span>Open to remote work</span>
      </div>
    </section>
  );
}
