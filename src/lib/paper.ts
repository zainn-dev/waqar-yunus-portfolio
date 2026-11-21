import { useEffect, type RefObject } from 'react';
import { gsap } from '@/lib/gsap';

/**
 * "Paper" motion for the project galleries (griflan-style). Cards are sheets on a curved stage:
 *
 * - entering at the bottom of the window a card hinges on its top edge and its bottom swings
 *   towards you; leaving at the top it hinges on its bottom edge. The perspective's vanishing point
 *   is the middle of the window, so the near edge flares *away from the centre*: left cards spread
 *   left, right cards spread right, like the page is rolling over a drum;
 * - the bend grows with scroll speed (in the direction the cards come from) and relaxes at rest;
 * - columns run at slightly different speeds, cards shrink a touch and round off near the edges;
 * - under the mouse the picture scales up a little and drifts with the pointer.
 *
 * Markup: `[data-paper]` is the card's layout box (never transformed here), `[data-paper-sheet]`
 * inside it is bent, `[data-paper-media]` inside that is the picture that scales on hover.
 * One gsap.ticker loop per root; only cards near the window are touched (IntersectionObserver),
 * every frame reads all rects first, then writes. Off for reduced motion.
 */

type Card = { sheet: HTMLElement | null; media: HTMLElement | null; h: number; mx: number; my: number; on: boolean };

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export interface PaperOptions {
  /** the scrolling element; null = the window */
  scroller?: RefObject<HTMLElement | null>;
  /** seconds before the effect fades in (lets an entrance animation finish first) */
  delay?: number;
  /** while true the effect eases out to flat and stays there */
  paused?: RefObject<boolean>;
}

export function usePaper(root: RefObject<HTMLElement | null>, { scroller, delay = 0, paused }: PaperOptions = {}) {
  useEffect(() => {
    const host = root.current;
    if (!host) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const sc = scroller?.current ?? null;
    const scrollPos = () => (sc ? sc.scrollTop : window.scrollY);

    const cards = new Map<HTMLElement, Card>();
    const near = new Set<HTMLElement>();
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        const el = e.target as HTMLElement;
        if (e.isIntersecting) near.add(el);
        else {
          near.delete(el);
          // parked off-screen: flat again, so nothing is left bent if it comes back without a frame
          const c = cards.get(el);
          if (c?.sheet) { c.sheet.style.transform = ''; c.sheet.style.borderRadius = ''; c.on = false; }
        }
      }),
      { root: sc, rootMargin: '25% 0px 25% 0px' },
    );
    const scan = () => {
      host.querySelectorAll<HTMLElement>('[data-paper]').forEach((el) => {
        if (cards.has(el)) return;
        cards.set(el, { sheet: el.querySelector('[data-paper-sheet]'), media: el.querySelector('[data-paper-media]'), h: 0, mx: 0, my: 0, on: false });
        io.observe(el);
      });
      cards.forEach((_, el) => {
        if (!el.isConnected) { io.unobserve(el); cards.delete(el); near.delete(el); }
      });
    };
    scan();
    // galleries are added and recycled as the feed loops
    const mo = new MutationObserver(scan);
    mo.observe(host, { childList: true, subtree: true });

    const ptr = { x: -9999, y: -9999 };
    const onPtr = (e: PointerEvent) => { if (e.pointerType === 'mouse') { ptr.x = e.clientX; ptr.y = e.clientY; } };
    const offPtr = () => { ptr.x = -9999; ptr.y = -9999; };
    if (fine) {
      window.addEventListener('pointermove', onPtr, { passive: true });
      document.documentElement.addEventListener('pointerleave', offPtr);
    }

    let last = scrollPos();
    let vel = 0;
    let amp = 0;
    const t0 = performance.now();
    const k = fine ? 1 : 0.45; // touch screens: gentler, no parallax drift

    const tick = () => {
      const now = performance.now();
      const pos = scrollPos();
      const v = pos - last;
      last = pos;
      // smoothed scroll speed, −1 … 1 (px per frame)
      vel += (clamp(v / 38, -1, 1) - vel) * 0.12;
      const want = paused?.current ? 0 : smooth(delay, delay + 0.9, (now - t0) / 1000);
      amp += (want - amp) * 0.12;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cx = vw / 2;
      // read everything first…
      const rects: [HTMLElement, DOMRect][] = [];
      near.forEach((el) => rects.push([el, el.getBoundingClientRect()]));
      // …then write
      for (const [el, r] of rects) {
        const c = cards.get(el);
        if (!c?.sheet) continue;
        const mid = (r.top + r.height / 2) / vh; // 0 = top of the window, 1 = bottom
        const enter = smooth(0.52, 1.3, mid);
        const leave = smooth(0.42, -0.4, mid);
        // bend (deg): a little at rest, a lot while scrolling towards it
        const bendIn = enter * enter * (4.5 + 9 * Math.max(0, vel)) * k * amp;
        const bendOut = leave * leave * (3.5 + 8 * Math.max(0, -vel)) * k * amp;
        // columns drift at different speeds (always apart, never into each other)
        const col = r.left + r.width / 2 < vw * 0.36 ? 0 : r.left + r.width / 2 < vw * 0.64 ? 1 : 2;
        const drift = (mid - 0.5) * vh * [0.018, 0.034, 0.026][col] * (fine ? 1 : 0) * amp;
        const edge = Math.max(enter, leave);
        const scale = 1 - 0.05 * edge * amp;
        const rad = 8 + 18 * edge * amp;
        if (bendIn + bendOut < 0.01 && Math.abs(drift) < 0.1 && edge * amp < 0.002) {
          if (c.on) { c.sheet.style.transform = ''; c.sheet.style.borderRadius = ''; c.on = false; }
        } else {
          const hingeY = bendIn >= bendOut ? '0px' : `${r.height}px`;
          const ang = bendIn >= bendOut ? bendIn : -bendOut;
          // transform-origin doubles as the vanishing point of perspective(): x = window centre
          c.sheet.style.transformOrigin = `${(cx - r.left).toFixed(1)}px ${hingeY}`;
          c.sheet.style.transform = `perspective(1100px) translate3d(0,${drift.toFixed(2)}px,0) rotateX(${ang.toFixed(3)}deg) scale(${scale.toFixed(4)})`;
          c.sheet.style.borderRadius = `${rad.toFixed(1)}px`;
          c.on = true;
        }
        // hover: scale up a touch and drift with the pointer, eased
        if (c.media && fine) {
          const inside = ptr.x >= r.left && ptr.x <= r.right && ptr.y >= r.top && ptr.y <= r.bottom;
          const th = inside ? 1 : 0;
          const tx = inside ? ((ptr.x - r.left) / r.width - 0.5) * -14 : 0;
          const ty = inside ? ((ptr.y - r.top) / r.height - 0.5) * -10 : 0;
          if (Math.abs(th - c.h) > 0.001 || Math.abs(tx - c.mx) > 0.05 || Math.abs(ty - c.my) > 0.05) {
            c.h += (th - c.h) * 0.09;
            c.mx += (tx - c.mx) * 0.08;
            c.my += (ty - c.my) * 0.08;
            c.media.style.transform = c.h < 0.002 ? '' : `translate3d(${(c.mx * c.h).toFixed(2)}px,${(c.my * c.h).toFixed(2)}px,0) scale(${(1 + 0.045 * c.h).toFixed(4)})`;
          }
        }
      }
    };
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      io.disconnect();
      mo.disconnect();
      window.removeEventListener('pointermove', onPtr);
      document.documentElement.removeEventListener('pointerleave', offPtr);
      cards.forEach((c) => {
        if (c.sheet) { c.sheet.style.transform = ''; c.sheet.style.borderRadius = ''; c.sheet.style.transformOrigin = ''; }
        if (c.media) c.media.style.transform = '';
      });
    };
  }, [root, scroller, delay, paused]);
}
