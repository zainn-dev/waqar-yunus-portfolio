import { useCallback, useEffect, useState } from 'react';
import { motion, useReducedMotion, type PanInfo } from 'framer-motion';
import { publishableTestimonials } from '@/data/testimonials';

const DURATION = 8000;

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-xs text-mute" aria-label={`Rated ${rating} out of 5`}>
      <span aria-hidden="true">★</span> {rating.toFixed(1)}
    </span>
  );
}

/**
 * Horizontal testimonial carousel: swipe/drag, transparent arrow controls, counter, autoplay
 * (paused on hover, focus and hidden tabs). Hidden in production until a real testimonial exists.
 */
export function Testimonials() {
  const items = publishableTestimonials();
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = items.length;
  const go = useCallback((step: number) => setIndex((i) => (i + step + n) % n), [n]);

  useEffect(() => {
    if (paused || reduced || n < 2) return;
    const id = window.setTimeout(() => go(1), DURATION);
    return () => window.clearTimeout(id);
  }, [index, paused, reduced, n, go]);

  if (n === 0) return null;

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -400) go(1);
    else if (info.offset.x > 60 || info.velocity.x > 400) go(-1);
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-labelledby="testimonials-title"
      className="border-t border-line py-24 md:py-32"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="page-wrap grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 id="testimonials-title" className="font-mono text-xs uppercase tracking-[0.12em]">What clients say</h2>
          <span aria-hidden="true" className="mt-4 block h-px bg-line" />
          <div className="mt-4 flex items-center justify-between">
            <div className="flex">
              <button type="button" onClick={() => go(-1)} aria-label="Previous testimonial" className="min-h-[44px] px-2 text-2xl leading-none transition-opacity hover:opacity-60">←</button>
              <button type="button" onClick={() => go(1)} aria-label="Next testimonial" className="min-h-[44px] px-2 text-2xl leading-none transition-opacity hover:opacity-60">→</button>
            </div>
            <span className="font-mono text-xs tabular-nums text-mute">{String(index + 1).padStart(2, '0')}/{String(n).padStart(2, '0')}</span>
          </div>
        </div>

        <div className="overflow-hidden lg:col-span-8" aria-live={paused ? 'polite' : 'off'}>
          <motion.ul
            className="flex cursor-grab touch-pan-y active:cursor-grabbing"
            drag={n > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={onDragEnd}
            animate={{ x: `-${index * 100}%` }}
            transition={reduced ? { duration: 0 } : { type: 'tween', duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {items.map((t, i) => (
              <li
                key={i}
                className="w-full shrink-0 pr-2"
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${n}`}
                aria-hidden={i !== index}
              >
                {t.placeholder && (
                  <span className="mb-6 inline-block rounded-full border border-dashed border-line px-3 py-1 font-mono text-[11px] text-mute">
                    Placeholder — visible in development only
                  </span>
                )}
                <blockquote className="max-w-[30ch] font-display text-[clamp(1.6rem,3vw,3rem)] font-normal leading-[1.15] tracking-[-0.03em] transition-opacity duration-500" style={{ opacity: i === index ? 1 : 0.25 }}>
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-display text-lg">{t.name}</span>
                  {(t.role || t.organization) && <span className="text-mute">{[t.role, t.organization].filter(Boolean).join(', ')}</span>}
                  {typeof t.rating === 'number' && <Stars rating={t.rating} />}
                  {t.project && <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-mute">{t.project}</span>}
                </figcaption>
              </li>
            ))}
          </motion.ul>
        </div>
      </div>
    </section>
  );
}
