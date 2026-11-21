import { useRef } from 'react';
import { homeIntro } from '@/data/home';
import { gsap, useGSAP } from '@/lib/gsap';
import { prefersReducedMotion } from '@/utils/motion';
import { ButtonLink } from '@/components/ui/Button';

/** Large introduction whose words brighten in reading order as you scroll through it. */
export function Intro() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.fromTo('[data-iw]', { opacity: 0.16 }, {
        opacity: 1, stagger: 0.05, ease: 'none',
        scrollTrigger: { trigger: '[data-intro-text]', start: 'top 80%', end: 'bottom 45%', scrub: true },
      });
    },
    { scope: ref },
  );
  return (
    <section ref={ref} aria-labelledby="intro-title" className="page-wrap py-28 md:py-44">
      <div className="grid gap-10 lg:grid-cols-12">
        <h2 id="intro-title" className="t-label lg:col-span-3 lg:pt-4">Introduction</h2>
        <div className="lg:col-span-9">
          <p data-intro-text className="font-display text-[clamp(1.75rem,3.7vw,3.9rem)] font-medium leading-[1.12] tracking-[-0.035em]">
            {homeIntro.split(' ').map((w, i) => (
              <span key={i} data-iw>{w} </span>
            ))}
          </p>
          <div className="mt-12">
            <ButtonLink to="/about" variant="outline">More about me</ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
