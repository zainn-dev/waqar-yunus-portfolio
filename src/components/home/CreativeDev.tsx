import { useRef } from 'react';
import { aboutAreas, creativeDev } from '@/data/home';
import { profile } from '@/data/profile';
import { gsap, useGSAP } from '@/lib/gsap';
import { prefersReducedMotion } from '@/utils/motion';
import { ClipImage } from '@/components/animations/ClipImage';
import { ButtonLink } from '@/components/ui/Button';
import { Monogram } from '@/components/ui/Brand';

function Portrait() {
  const p = profile.portrait;
  if (p) return <img src={p.src} alt={p.alt} width={p.width} height={p.height} loading="lazy" decoding="async" className="h-full w-full object-cover" />;
  return (
    <div className="theme-dark relative flex h-full w-full items-center justify-center bg-stage">
      <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {[60, 110, 160, 210].map((r, i) => <circle key={r} cx="200" cy="230" r={r} fill="none" stroke={i === 0 ? '#FF3831' : '#ffffff26'} />)}
      </svg>
      <Monogram className="relative h-14 text-bone" title="" />
      <span className="absolute bottom-4 left-4 right-4 rounded-full border border-line px-3 py-1.5 text-center font-mono text-[11px] text-mute">Photo placeholder — set profile.portrait</span>
    </div>
  );
}

/** "More than code" — character-masked headline, image reveal, staggered areas of work. */
export function CreativeDev() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from('[data-cdc]', { yPercent: 110, duration: 1, stagger: 0.012, ease: 'expo.out', scrollTrigger: { trigger: '[data-cd-title]', start: 'top 80%', once: true } });
      gsap.from('[data-area]', { opacity: 0, y: 24, duration: 0.65, stagger: 0.07, ease: 'power3.out', scrollTrigger: { trigger: '[data-areas]', start: 'top 85%', once: true } });
    },
    { scope: ref },
  );
  return (
    <section ref={ref} aria-labelledby="cd-title" className="page-wrap py-24 md:py-36">
      <div className="grid gap-14 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-mute">About</p>
          <h2 id="cd-title" data-cd-title className="t-section mt-6" aria-label={creativeDev.title.join(' ')}>
            {creativeDev.title.map((line) => (
              <span key={line} className="block" aria-hidden="true">
                {line.split(' ').map((w, wi, ws) => (
                  <span key={wi} className="inline-block whitespace-nowrap">
                    {w.split('').map((c, ci) => (
                      <span key={ci} className="inline-block overflow-hidden pb-[0.22em] -mb-[0.22em] align-top"><span data-cdc className="inline-block">{c}</span></span>
                    ))}
                    {wi < ws.length - 1 && <span className="inline-block w-[0.25em]" />}
                  </span>
                ))}
              </span>
            ))}
          </h2>
          <p className="mt-10 max-w-[48ch] text-lg leading-relaxed text-bone/80">{creativeDev.body}</p>
          <div className="mt-10"><ButtonLink to="/about" variant="outline">More about me</ButtonLink></div>
        </div>
        <div className="lg:col-span-4 lg:col-start-9">
          <ClipImage className="aspect-[4/5] rounded-[3px]" parallax={7}><Portrait /></ClipImage>
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.1em] text-mute">{profile.name} — {profile.location}</p>
        </div>
      </div>
      <ul data-areas className="mt-20 grid border-t border-line sm:grid-cols-2 lg:grid-cols-3">
        {aboutAreas.map((a, i) => (
          <li key={a.title} data-area className="group border-b border-line py-7 sm:pr-8">
            <p className="font-mono text-[11px] text-mute">{String(i + 1).padStart(2, '0')}</p>
            <h3 className="mt-3 font-display text-2xl font-normal tracking-[-0.03em] transition-transform duration-500 ease-expo group-hover:translate-x-1">{a.title}</h3>
            <p className="mt-2 max-w-[36ch] text-mute">{a.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
