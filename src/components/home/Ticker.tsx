import { useEffect, useRef, useState } from 'react';
import { projects } from '@/data/projects';
import { services } from '@/data/services';
import { skillGroups } from '@/data/skills';
import { profile } from '@/data/profile';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/utils/cn';

/** One rolling digit column (0–9 stacked, translated to the target). */
function Digit({ value, delay = 0, armed, fast }: { value: number; delay?: number; armed: boolean; fast?: boolean }) {
  const reduced = useReducedMotion();
  return (
    <span
      className="relative inline-block h-[1.1em] overflow-hidden leading-[1.1]"
      style={{ maskImage: 'linear-gradient(transparent, #000 18%, #000 82%, transparent)', WebkitMaskImage: 'linear-gradient(transparent, #000 18%, #000 82%, transparent)' }}
      aria-hidden="true"
    >
      <span
        className="block"
        style={{
          transform: `translateY(${armed ? -value * 10 : 0}%)`,
          transition: reduced ? 'none' : fast ? 'transform .55s cubic-bezier(.16,1,.3,1)' : `transform 1.6s cubic-bezier(.16,1,.3,1) ${delay}s`,
        }}
      >
        {Array.from({ length: 10 }, (_, d) => (
          <span key={d} className="block h-[1.1em]">{d}</span>
        ))}
      </span>
    </span>
  );
}

function Odometer({ text, armed, baseDelay = 0, fast }: { text: string; armed: boolean; baseDelay?: number; fast?: boolean }) {
  let n = 0;
  return (
    <span className="inline-flex tabular-nums">
      {text.split('').map((ch, i) =>
        /\d/.test(ch) ? (
          <Digit key={i} value={Number(ch)} armed={armed} fast={fast} delay={baseDelay + n++ * 0.08} />
        ) : (
          <span key={i} aria-hidden="true">{ch}</span>
        ),
      )}
    </span>
  );
}

function useDelhiClock() {
  const fmt = () =>
    new Intl.DateTimeFormat('en-GB', { timeZone: profile.timezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date());
  const [t, setT] = useState(fmt);
  useEffect(() => {
    const id = window.setInterval(() => setT(fmt()), 1000);
    return () => window.clearInterval(id);
     
  }, []);
  return t;
}

/**
 * Numbers here are derived from the site's own data — nothing is invented.
 * Edit the data files and these update automatically.
 */
export function Ticker() {
  const ref = useRef<HTMLElement>(null);
  const [armed, setArmed] = useState(false);
  const [settled, setSettled] = useState(false);
  const clock = useDelhiClock();
  const techCount = skillGroups.reduce((n, g) => n + g.skills.length, 0);

  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setArmed(true), { threshold: 0.4 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  // After the entrance roll, the clock switches to short per-second transitions.
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setSettled(true), 2600);
    return () => window.clearTimeout(id);
  }, [armed]);

  const stats = [
    { value: String(projects.length).padStart(2, '0'), label: 'Projects in the portfolio' },
    { value: String(services.length).padStart(2, '0'), label: 'Services, from sites to integrations' },
    { value: String(techCount).padStart(2, '0'), label: 'Technologies I work with' },
  ];

  return (
    <section ref={ref} aria-label="At a glance" className="border-y border-line">
      <dl className="page-wrap grid grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className={cn('py-8 md:py-12', i % 2 === 1 && 'border-l border-line pl-5 md:pl-8', i === 2 && 'border-t border-line lg:border-l lg:border-t-0 lg:pl-8')}>
            <dt className="sr-only">{s.label}</dt>
            <dd>
              <span className="block font-display text-[clamp(3rem,7vw,6.5rem)] font-medium leading-none tracking-[-0.05em]">
                <span className="sr-only">{Number(s.value)}</span>
                <Odometer text={s.value} armed={armed} baseDelay={i * 0.12} />
              </span>
              <span aria-hidden="true" className="mt-3 block max-w-[20ch] text-sm text-mute">{s.label}</span>
            </dd>
          </div>
        ))}
        <div className="border-l border-t border-line py-8 pl-5 md:py-12 md:pl-8 lg:border-t-0">
          <dt className="sr-only">Local time in Delhi</dt>
          <dd>
            <span className="block font-display text-[clamp(1.45rem,4.2vw,4rem)] font-medium leading-none tracking-[-0.05em] text-accent">
              <span className="sr-only">{clock}</span>
              <Odometer text={clock} armed={armed} baseDelay={0.36} fast={settled} />
            </span>
            <span aria-hidden="true" className="mt-3 block text-sm text-mute">Now in Delhi (IST)</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}
