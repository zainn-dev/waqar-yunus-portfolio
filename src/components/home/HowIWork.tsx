import { useRef } from 'react';
import { processSteps } from '@/data/home';
import { gsap, useGSAP } from '@/lib/gsap';
import { prefersReducedMotion } from '@/utils/motion';

/** Sticky heading with steps that brighten as they reach the middle of the viewport. */
export function HowIWork() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.fromTo('[data-hiw-bar]', { scaleY: 0 }, {
        scaleY: 1, ease: 'none',
        scrollTrigger: { trigger: '[data-hiw-list]', start: 'top 60%', end: 'bottom 60%', scrub: true },
      });
      gsap.utils.toArray<HTMLElement>('[data-hiw-step]').forEach((el) => {
        gsap.fromTo(el, { opacity: 0.25 }, {
          opacity: 1, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 75%', end: 'top 50%', scrub: true },
        });
      });
    },
    { scope: ref },
  );

  return (
    <section ref={ref} aria-labelledby="hiw-title" className="border-t border-line py-24 md:py-36">
      <div className="page-wrap grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-32">
            <h2 id="hiw-title" className="t-section">How I work.</h2>
            <p className="mt-8 max-w-[38ch] text-lg text-bone/75">
              Four steps, no mystery. You always know what’s happening, what’s next and what it costs.
            </p>
          </div>
        </div>
        <ol data-hiw-list className="relative pl-10 lg:col-span-6 lg:col-start-7 md:pl-14">
          <span aria-hidden="true" className="absolute bottom-0 left-0 top-0 w-px bg-line" />
          <span data-hiw-bar aria-hidden="true" className="absolute bottom-0 left-0 top-0 w-px origin-top bg-lime" />
          {processSteps.map((s, i) => (
            <li key={s.title} data-hiw-step className="relative pb-16 last:pb-0 md:pb-24">
              <span aria-hidden="true" className="absolute -left-10 top-3 h-px w-6 bg-lime md:-left-14 md:w-9" />
              <p className="font-mono text-xs text-mute">Step {String(i + 1).padStart(2, '0')}</p>
              <h3 className="mt-3 font-display text-[clamp(2rem,4vw,3.75rem)] font-medium leading-none tracking-[-0.04em]">{s.title}</h3>
              <p className="mt-5 max-w-[44ch] text-lg text-mute">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
