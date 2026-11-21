import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionValue, useSpring, useTransform, useVelocity } from 'framer-motion';
import { Grab, Pointer } from 'lucide-react';
import { publishableTestimonials } from '@/data/testimonials';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import type { Testimonial } from '@/types/content';
import { cn } from '@/utils/cn';

const RED = '#FF3831';
const CREAM = '#FFFDDB';
/** resting tilt per card (deg) and a little vertical scatter (px) */
const TILTS = [-4, 3, -2.5, 5, -3.5, 2, 4, -5];
const SCATTER = [0, 34, -18, 22, -6, 40, 12, -24];
/** stacking per card, interleaved between the rows so red and cream overlap both ways */
const Z = [[3, 6, 2, 5, 1, 4], [5, 2, 6, 1, 4, 3]];
/** row drift: px per second, row 0 to the left, row 1 to the right */
const SPEED = [-34, 26];

type Geo = { w: number; step: number; dy: number; count: number };
const geoFor = (width: number): Geo => {
  const md = width >= 768;
  const w = md ? 430 : 290;
  const step = w + (md ? 70 : 34);
  return { w, step, dy: md ? 255 : 235, count: Math.ceil(width / step) + 2 };
};

/** Grab, fling, spring back into the slot; leans into the direction it is thrown. */
function DraggableCard({ children, onGrab, onDrop }: { children: ReactNode; onGrab: () => void; onDrop: () => void }) {
  const [held, setHeld] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const vx = useVelocity(x);
  const rotate = useSpring(useTransform(vx, [-2000, 0, 2000], [-16, 0, 16], { clamp: true }), { stiffness: 300, damping: 20 });
  return (
    <motion.div
      drag
      dragSnapToOrigin
      dragElastic={0.35}
      dragTransition={{ bounceStiffness: 380, bounceDamping: 14 }}
      onDragStart={() => { setHeld(true); onGrab(); }}
      onDragEnd={() => { setHeld(false); onDrop(); }}
      whileHover={{ scale: 1.03 }}
      whileDrag={{ scale: 1.07 }}
      whileTap={{ scale: 1.04 }}
      style={{ x, y, rotate, touchAction: 'pan-y' }}
      className="select-none"
    >
      <div className={cn('rounded-[12px] transition-shadow duration-300', held ? 'shadow-[0_50px_100px_-25px_rgba(0,0,0,0.9)]' : 'shadow-[0_24px_60px_-24px_rgba(0,0,0,0.75)]')}>
        {children}
      </div>
    </motion.div>
  );
}

/** One confession: red on cream or cream on red, quote marks in opposite corners. */
function Card({ t, red, w }: { t: Testimonial; red: boolean; w?: number }) {
  return (
    <figure
      style={{ width: w, background: red ? RED : CREAM, color: red ? CREAM : RED }}
      className="relative flex w-[290px] flex-col items-center gap-6 rounded-[12px] px-8 pb-12 pt-14 text-center md:w-[430px] md:px-12"
    >
      <span aria-hidden="true" className="absolute right-6 top-3 font-sans text-[64px] font-black leading-none">&rdquo;</span>
      <span aria-hidden="true" className="absolute bottom-[-18px] left-6 font-sans text-[64px] font-black leading-none">&ldquo;</span>
      {t.placeholder && (
        <span className="absolute left-4 top-4 rounded-full border border-current px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide opacity-80">
          Placeholder — dev only
        </span>
      )}
      <blockquote className="font-sans text-[18px] leading-[1.35] tracking-[-0.005em] md:text-[22px]">{t.quote}</blockquote>
      <figcaption className="text-[14px] md:text-[15px]">
        <span className="block font-bold">{t.name}</span>
        {(t.role || t.organization) && <span className="mt-0.5 block opacity-90">{[t.role, t.organization].filter(Boolean).join(', ')}</span>}
      </figcaption>
    </figure>
  );
}

/** The round hand that replaces the pointer over the cards; it closes into a grab while pressed. */
function HandCursor({ on, pressed, at }: { on: boolean; pressed: boolean; at: React.MutableRefObject<HTMLDivElement | null> }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div ref={at} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[103]" style={{ transform: 'translate3d(-999px,-999px,0)' }}>
      <div
        className={cn(
          'grid h-[92px] w-[92px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 bg-[#1b1717] shadow-[0_12px_30px_rgba(0,0,0,0.45)] transition-[transform,opacity] duration-300 ease-expo',
          on ? (pressed ? 'scale-[0.82] opacity-100' : 'scale-100 opacity-100') : 'scale-50 opacity-0',
        )}
        style={{ borderColor: RED, color: RED }}
      >
        {pressed ? <Grab className="h-10 w-10" strokeWidth={2.2} /> : <Pointer className="h-10 w-10 rotate-[100deg]" strokeWidth={2.2} />}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Client confessions: two loose rows of tilted cards (red above, cream below, overlapping both
 * ways) drifting in opposite directions. Scrolling the page pushes them along, they fly in when the
 * section arrives, sway a little while they travel, and each one can be grabbed and flung (it
 * springs back). A round hand follows the pointer over them. Reduced motion: a still, tilted grid.
 */
export function ClientConfessions() {
  const items = publishableTestimonials();
  const reduced = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const slots = useRef<(HTMLDivElement | null)[]>([]);
  const hand = useRef<HTMLDivElement | null>(null);
  const [geo, setGeo] = useState<Geo>(() => geoFor(typeof window === 'undefined' ? 1280 : window.innerWidth));
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  const held = useRef([0, 0]);
  const ptr = useRef({ x: -999, y: -999, in: false });

  // layout follows the stage width
  useEffect(() => {
    const el = stage.current;
    if (!el || reduced) return;
    const ro = new ResizeObserver(([e]) => setGeo((g) => {
      const n = geoFor(e.contentRect.width);
      return n.w === g.w && n.count === g.count ? g : n;
    }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [reduced]);

  // one rAF for every card: drift, scroll push, sway, the fly-in, and the hand cursor
  useEffect(() => {
    const el = stage.current;
    if (!el || reduced) return;
    let raf = 0, visible = false, t0 = -1, last = performance.now(), lastY = window.scrollY, kick = 0;
    const off = [0, geo.step * 0.45];
    const pace = [1, 1];
    let hx = -999, hy = -999;
    const L = geo.count * geo.step;
    const tick = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      if (t0 < 0) t0 = t;
      // page scroll gives the rows a push in their own direction (and back when scrolling up)
      const sy = window.scrollY;
      kick += (Math.max(-60, Math.min(60, sy - lastY)) - kick) * 0.2;
      lastY = sy;
      for (let r = 0; r < 2; r++) {
        // a held card stops its row; hovering slows things so the words can be read
        pace[r] += ((held.current[r] ? 0 : ptr.current.in ? 0.45 : 1) - pace[r]) * Math.min(1, dt * 4);
        off[r] += SPEED[r] * pace[r] * dt + Math.sign(SPEED[r]) * kick * 0.9 * pace[r];
      }
      slots.current.forEach((s, n) => {
        if (!s) return;
        const r = n < geo.count ? 0 : 1;
        const k = r ? n - geo.count : n;
        const x = ((((off[r] + k * geo.step) % L) + L) % L) - geo.step;
        const seed = k * 2 + r * 5;
        const e = Math.max(0, Math.min(1, (t - t0 - 0.12 - k * 0.07 - r * 0.18) / 1.1));
        const ease = 1 - Math.pow(1 - e, 3);
        const y = r * geo.dy + SCATTER[seed % SCATTER.length] + (1 - ease) * 240;
        const rot = TILTS[seed % TILTS.length] + Math.sin(t * 0.55 + k * 1.7 + r) * 1.2 + kick * 0.05 * (r ? -1 : 1) + (1 - ease) * (r ? 16 : -16);
        s.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg)`;
        s.style.opacity = String(Math.min(1, e * 1.8));
      });
      if (hand.current) {
        const p = ptr.current;
        if (hx < -900) { hx = p.x; hy = p.y; }
        hx += (p.x - hx) * 0.22; hy += (p.y - hy) * 0.22;
        hand.current.style.transform = `translate3d(${hx.toFixed(1)}px, ${hy.toFixed(1)}px, 0)`;
      }
      if (visible) raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && !raf) { last = performance.now(); lastY = window.scrollY; raf = requestAnimationFrame(tick); }
    }, { rootMargin: '0px 0px -15% 0px' });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [geo, reduced]);

  if (items.length === 0) return null;

  const heading = 'Confessions';
  const title = (
    <h2 id="kind-words-title" className="page-wrap mb-10 text-center font-serif text-[clamp(4rem,13vw,12rem)] italic leading-[0.95] tracking-[-0.01em] text-bone md:mb-14">
      <span className="sr-only">Client confessions</span>
      <span aria-hidden="true" className="inline-block overflow-hidden px-[0.1em] pb-[0.12em]">
        {heading.split('').map((c, i) => (
          <motion.span
            key={i}
            className="inline-block"
            initial={reduced ? false : { y: '105%', rotate: 8 }}
            whileInView={{ y: '0%', rotate: 0 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ duration: 0.9, delay: i * 0.045, ease: [0.16, 1, 0.3, 1] }}
          >
            {c}
          </motion.span>
        ))}
      </span>
    </h2>
  );

  if (reduced) {
    return (
      <section aria-labelledby="kind-words-title" className="overflow-hidden py-24 md:py-36">
        {title}
        <ul className="page-wrap flex flex-wrap justify-center gap-10">
          {items.map((t, i) => (
            <li key={i} style={{ transform: `rotate(${TILTS[i % TILTS.length]}deg)` }}>
              <Card t={t} red={i % 2 === 0} />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const total = geo.count * 2;
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    ptr.current.x = e.clientX; ptr.current.y = e.clientY;
  };

  return (
    <section aria-labelledby="kind-words-title" className="overflow-hidden py-24 md:py-36">
      {title}
      {/* every quote once, for screen readers; the moving cards below are decoration */}
      <ul className="sr-only">
        {items.map((t, i) => (
          <li key={i}><blockquote>{t.quote}</blockquote> — {t.name}{t.role || t.organization ? `, ${[t.role, t.organization].filter(Boolean).join(', ')}` : ''}</li>
        ))}
      </ul>
      <div
        ref={stage}
        aria-hidden="true"
        data-cursor-hide
        className="relative h-[620px] cursor-none md:h-[720px]"
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') { onMove(e); ptr.current.in = true; setHover(true); } }}
        onPointerMove={onMove}
        onPointerLeave={() => { ptr.current.in = false; setHover(false); setPressed(false); }}
        onPointerDown={(e) => { if (e.pointerType === 'mouse') setPressed(true); }}
        onPointerUp={() => setPressed(false)}
      >
        {Array.from({ length: total }, (_, n) => {
          const r = n < geo.count ? 0 : 1;
          const k = r ? n - geo.count : n;
          // the second row starts a couple of quotes further on, so neighbours differ
          const t = items[(k + r * 2) % items.length];
          return (
            <div
              key={`${r}-${k}`}
              ref={(el) => { slots.current[n] = el; }}
              className="absolute left-0 top-0 will-change-transform"
              style={{ zIndex: Z[r][k % Z[r].length], opacity: 0 }}
            >
              <DraggableCard
                onGrab={() => { held.current[r]++; }}
                onDrop={() => { held.current[r] = Math.max(0, held.current[r] - 1); }}
              >
                <Card t={t} red={r === 0 ? k % 4 !== 3 : k % 4 === 1} w={geo.w} />
              </DraggableCard>
            </div>
          );
        })}
      </div>
      <HandCursor on={hover} pressed={pressed} at={hand} />
    </section>
  );
}
