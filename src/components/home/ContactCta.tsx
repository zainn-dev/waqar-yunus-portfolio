import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { profile } from '@/data/profile';
import { gsap, useGSAP } from '@/lib/gsap';
import { prefersReducedMotion } from '@/utils/motion';
import { Magnetic } from '@/components/animations/Magnetic';
import { Availability } from '@/components/ui/StatusDot';
import { SocialList } from '@/components/social/SocialList';

export function ContactCta() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from('[data-cta-w]', {
        yPercent: 110, duration: 1.3, stagger: 0.05, ease: 'expo.out',
        scrollTrigger: { trigger: ref.current, start: 'top 70%', once: true },
      });
      gsap.fromTo('[data-cta-circle]', { scale: 0.6, rotate: -30 }, {
        scale: 1, rotate: 0, ease: 'none',
        scrollTrigger: { trigger: ref.current, start: 'top 90%', end: 'center center', scrub: true },
      });
    },
    { scope: ref },
  );
  const lines = ['Got a project', 'in mind?'];
  return (
    <section ref={ref} aria-labelledby="cta-title" className="border-t border-line bg-ink-3 py-28 md:py-44">
      <div className="page-wrap">
        <Availability className="mb-10" />
        <div className="grid items-end gap-12 lg:grid-cols-12">
          <h2 id="cta-title" className="t-hero uppercase lg:col-span-9" aria-label={lines.join(' ')}>
            {lines.map((l) => (
              <span key={l} className="block" aria-hidden="true">
                {l.split(' ').map((w, i, a) => (
                  <span key={i} className="inline-block overflow-hidden pb-[0.22em] -mb-[0.22em] align-top">
                    <span data-cta-w className="inline-block">{w}</span>
                    {i < a.length - 1 && <span>&nbsp;</span>}
                  </span>
                ))}
              </span>
            ))}
          </h2>
          <div className="lg:col-span-3 lg:justify-self-end">
            <Magnetic strength={0.4}>
              <Link
                to="/contact"
                data-cta-circle
                className="group flex aspect-square w-40 flex-col items-center justify-center gap-2 rounded-full bg-lime text-center font-display font-medium text-onfill transition-transform duration-500 ease-expo hover:scale-105 md:w-52"
              >
                <ArrowUpRight className="h-7 w-7 transition-transform duration-500 group-hover:rotate-45" aria-hidden="true" />
                Let’s talk
              </Link>
            </Magnetic>
          </div>
        </div>
        <div className="mt-16 flex flex-wrap items-center justify-between gap-6 border-t border-line pt-8 text-mute">
          <div className="space-y-4">
            <p>Tell me what you’re building — I reply to every message.</p>
            <SocialList variant="icons" />
          </div>
          {profile.email ? (
            <a href={`mailto:${profile.email}`} className="link-underline text-xl text-bone">{profile.email}</a>
          ) : (
            <Link to="/contact" className="link-underline text-xl text-bone">Use the contact form</Link>
          )}
        </div>
      </div>
    </section>
  );
}
