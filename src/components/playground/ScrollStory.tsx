import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { prefersReducedMotion } from '@/utils/motion';

const WORDS = ['Listen', 'Shape', 'Build', 'Launch'];

/**
 * Scroll demonstration: a pinned stage where scroll position drives a shape morph,
 * a counter and a word swap. Scrubbed (tied 1:1 to scroll) — nothing autoplays.
 */
export function ScrollStory() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: ref.current, start: 'top top', end: '+=220%', pin: '[data-ss-stage]', scrub: 0.5 },
      });
      tl.to('[data-ss-shape]', { borderRadius: '50%', rotate: 180, scale: 0.7, duration: 1 })
        .to('[data-ss-shape]', { borderRadius: '8%', rotate: 360, scale: 1.1, backgroundColor: '#FF3831', duration: 1 })
        .to('[data-ss-bar]', { scaleX: 1, duration: 2 }, 0)
        .to('[data-ss-words]', { yPercent: -75, duration: 2 }, 0);
    },
    { scope: ref },
  );
  return (
    <section ref={ref} id="scroll-story" aria-labelledby="ss-title" className="scroll-mt-20">
      <div data-ss-stage className="theme-dark flex min-h-[100svh] flex-col justify-center overflow-hidden bg-stage page-x py-16">
        <div className="mx-auto grid w-full max-w-page gap-10 md:grid-cols-2 md:items-center">
          <div>
            <p className="font-mono text-xs text-mute">Experiment — scroll</p>
            <h2 id="ss-title" className="mt-3 font-display text-[clamp(2rem,4vw,3.5rem)] font-normal leading-none tracking-[-0.04em]">Scroll-driven motion</h2>
            <p className="mt-5 max-w-[38ch] text-mute">Keep scrolling: the stage stays pinned while your scroll position drives the shape, the word and the progress bar. Scroll back and everything rewinds.</p>
            <div className="mt-10 h-[1.1em] overflow-hidden font-display text-[clamp(2.5rem,6vw,5rem)] leading-[1.1] tracking-[-0.05em]" aria-hidden="true">
              <div data-ss-words>{WORDS.map((w) => <div key={w} className="h-[1.1em]">{w}</div>)}</div>
            </div>
            <div className="mt-6 h-px bg-line"><div data-ss-bar className="h-px origin-left scale-x-0 bg-neon motion-reduce:scale-x-100" /></div>
          </div>
          <div className="flex items-center justify-center py-10">
            <div data-ss-shape className="aspect-square w-[min(60vw,320px)] rounded-[3px] border border-[#fff6] bg-[#ffffff14]" />
          </div>
        </div>
      </div>
    </section>
  );
}
