import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { Project } from '@/types/content';
import { useReducedMotion } from '@/hooks/useMediaQuery';

/** Tags shown in the marquee: categories + stack, de-duplicated. Data only. */
const tagsOf = (p: Project) => Array.from(new Set([...(p.categories ?? []), ...(p.stack ?? [])]));

/** Mono line under the card body: a verified result if one exists, else category / year / role. */
const metaOf = (p: Project) =>
  p.results?.[0] ?? [p.categories?.[0], p.year, p.role].filter(Boolean).join(' · ');

/* ---------- one shared store: a single pill/card for every gallery on the page ---------- */
type State = { project: Project | null; active: boolean; open: boolean; touch: boolean };
let state: State = { project: null, active: false, open: false, touch: false };
const subs = new Set<() => void>();
const set = (patch: Partial<State>) => {
  const next = { ...state, ...patch };
  if (next.project === state.project && next.active === state.active && next.open === state.open && next.touch === state.touch) return;
  state = next;
  subs.forEach((f) => f());
};
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const snap = () => state;
/** target pointer position; `jump` asks the layer to snap instead of lerping */
const ptr = { x: 0, y: 0, jump: true };
let host: HTMLElement | null = null;
const moveTo = (x: number, y: number, jump = false) => { ptr.x = x; ptr.y = y; if (jump) ptr.jump = true; };
/** marquee pill size (px); the card sits on the pill, flush with its left edge */
const PILL_W = 370;
const PILL_H = 46;

/**
 * Binds a project gallery to the shared glass cursor. Returns pointer handlers and an sr-only
 * description; the visual itself is rendered once by <GalleryCursorLayer />.
 */
export function useGalleryCursor(p: Project) {
  // gallery unmounting (route change) must not leave the shared pill behind
  useEffect(() => () => { if (state.project === p) set({ active: false, open: false }); }, [p]);
  const bind = {
    'data-cursor-hide': '',
    onPointerEnter: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType !== 'mouse') return;
      host = e.currentTarget;
      moveTo(e.clientX, e.clientY, !state.active);
      // a card pinned on another project never follows onto this one
      set({ project: p, active: true, open: state.project === p && state.open, touch: false });
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType !== 'mouse') return;
      moveTo(e.clientX, e.clientY);
      if (state.project !== p || !state.active) { host = e.currentTarget; set({ project: p, active: true, open: false, touch: false }); }
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      if (state.project === p) set({ active: false, open: false });
    },
    // click / tap pins the story card; it then rides along with the pointer until the
    // pointer leaves this project's tiles, or another click puts it away
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      if ((e.target as Element).closest('a, button')) return;
      const pe = e.nativeEvent as PointerEvent;
      const touch = pe.pointerType === 'touch' || pe.pointerType === 'pen';
      host = e.currentTarget;
      moveTo(e.clientX, e.clientY, touch || !state.active);
      const next = !(state.open && state.project === p);
      set(touch ? { project: p, active: next, open: next, touch: true } : { project: p, active: true, open: next, touch: false });
    },
  } as const;

  const tags = tagsOf(p);
  const srText = [p.title, p.summary ?? p.focus, metaOf(p), tags.join(', ')]
    .map((x) => x?.trim().replace(/[.\s]+$/, ''))
    .filter(Boolean)
    .join('. ') + '.';
  return { bind, overlay: null, srText };
}

/** Rendered once in App. Frosted tag pill that trails the pointer; a click/tap pins a tilting story card on it. */
export function GalleryCursorLayer() {
  const s = useSyncExternalStore(subscribe, snap, snap);
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLDivElement>(null);
  const place = useRef<HTMLDivElement>(null);
  const last = useRef<Project | null>(null);
  if (s.project) last.current = s.project;
  const p = s.project ?? last.current;
  // in the DOM from the first hover until the pill has faded out again
  const [shown, setShown] = useState(false);
  if (s.active && !shown) setShown(true);

  // mouse: Escape closes (leaving the gallery does too); touch: tap outside / scroll closes
  useEffect(() => {
    if (!s.open) return;
    if (!s.touch) {
      // capture + preventDefault: Escape puts the card away without also closing the project sheet
      const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); set({ open: false }); } };
      window.addEventListener('keydown', esc, true);
      return () => window.removeEventListener('keydown', esc, true);
    }
    const off = (e: PointerEvent) => { if (!host?.contains(e.target as Node)) set({ open: false, active: false }); };
    const sc = () => set({ open: false, active: false });
    window.addEventListener('pointerdown', off, { passive: true });
    window.addEventListener('scroll', sc, { passive: true });
    return () => { window.removeEventListener('pointerdown', off); window.removeEventListener('scroll', sc); };
  }, [s.open, s.touch]);

  // single rAF: lerp position, velocity-driven 3D tilt with spring back, and the pill's own fade.
  // Nothing above the glass ever animates opacity: in Chromium an ancestor with opacity < 1 (or
  // one being faded) cuts the backdrop off, so the glass shows flat grey, unblurred, until the
  // compositor catches up. Each glass box fades itself instead, which keeps its blur from frame 1.
  useEffect(() => {
    if (!shown) return;
    let raf = 0;
    let cx = ptr.x, cy = ptr.y, rx = 0, ry = 0, rz = 0, v = 0;
    let then = performance.now();
    ptr.jump = false;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - then) / 1000);
      then = now;
      const want = state.active ? 1 : 0;
      v = reduced ? want : v + (want - v) * (1 - Math.exp(-dt / 0.07));
      if (!want && v < 0.01) { setShown(false); return; }
      if (ptr.jump || reduced) { cx = ptr.x; cy = ptr.y; ptr.jump = false; }
      const px = cx, py = cy;
      cx += (ptr.x - cx) * 0.15;
      cy += (ptr.y - cy) * 0.15;
      const vx = cx - px, vy = cy - py;
      const clamp = (v: number) => Math.max(-8, Math.min(8, v));
      const k = reduced ? 0 : 1;
      rx += (clamp(-vy * 0.6) * k - rx) * 0.12;
      ry += (clamp(vx * 0.6) * k - ry) * 0.12;
      rz += (clamp(vx * 0.35) * k - rz) * 0.12;
      if (root.current) root.current.style.transform = `translate3d(${cx}px,${cy}px,0)`;
      // card: sits on top of the pill, left edges aligned; kept inside the viewport, and drops
      // below the pill when there is no room above
      const pl = place.current;
      if (pl) {
        const w = pl.offsetWidth, h = pl.offsetHeight;
        const left = Math.max(12 - cx, Math.min(-PILL_W / 2, window.innerWidth - 12 - w - cx));
        const above = cy - PILL_H / 2 - 10 - h > 8;
        pl.style.left = `${left}px`;
        pl.style.top = above ? `${-PILL_H / 2 - 10 - h}px` : `${PILL_H / 2 + 10}px`;
      }
      if (card.current) card.current.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`;
      if (pill.current) {
        pill.current.style.opacity = String(Math.min(1, v * 1.02));
        pill.current.style.transform = `translate(-50%,-50%) perspective(600px) rotateX(${rx * 0.4}deg) rotateY(${ry * 0.4}deg) rotateZ(${rz * 0.4}deg) scale(${0.9 + 0.1 * v})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [shown, reduced]);

  if (typeof document === 'undefined' || !p) return null;
  const tags = tagsOf(p);
  const body = p.summary ?? p.focus;
  // griflan-style frosted grey: reads on white screenshots and on dark tiles alike
  const glass = 'border border-white/25 bg-[rgba(118,118,118,0.62)] text-white backdrop-blur-[18px] backdrop-saturate-[1.2]';
  const mask = 'linear-gradient(90deg,transparent,#000 15%,#000 85%,transparent)';

  return createPortal(
    shown ? (
        <div data-gallery-cursor="" aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[102]">
          <div ref={root} className="absolute left-0 top-0 h-0 w-0">
            <div ref={place} className="absolute left-0 top-0 w-[min(540px,calc(100vw-24px))]">
              <AnimatePresence>
                {s.open && (
                  // the wrapper only moves (transform never cuts the backdrop off); the glass fades itself
                  <motion.div
                    key="card"
                    initial={{ y: reduced ? 0 : 18, scale: reduced ? 1 : 0.92 }}
                    animate={{ y: 0, scale: 1 }}
                    exit={{ y: reduced ? 0 : 12, scale: reduced ? 1 : 0.94 }}
                    transition={reduced ? { duration: 0.12 } : { type: 'spring', stiffness: 360, damping: 28 }}
                    style={{ transformOrigin: '20% 100%' }}
                  >
                    <motion.div
                      ref={card}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: reduced ? 0.12 : 0.18, ease: 'easeOut' }}
                      className={`rounded-[12px] px-6 py-7 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_24px_70px_rgba(0,0,0,0.35)] lg:px-10 lg:py-11 ${glass}`}
                      style={{ transformOrigin: '20% 100%' }}
                    >
                      <p className="text-[19px] font-bold leading-tight tracking-[-0.02em] lg:text-[21px]">{p.title}</p>
                      <p className="mt-5 text-[16px] leading-[1.42] lg:text-[19px]">{body}</p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div
              ref={pill}
              className={`absolute left-0 top-0 flex items-center overflow-hidden rounded-[10px] ${glass}`}
              style={{ transform: 'translate(-50%,-50%) scale(0.9)', opacity: 0, width: PILL_W, height: PILL_H }}
            >
              {/* mask lives on an inner box: mask + backdrop-filter on one element ghosts in Chromium */}
              <div className="h-full w-full overflow-hidden" style={{ WebkitMaskImage: mask, maskImage: mask }}>
              <div className={reduced ? 'flex h-full items-center whitespace-nowrap' : 'flex h-full w-max animate-[gc-marquee_12s_linear_infinite] items-center whitespace-nowrap'}>
                {[0, 1].map((k) => (
                  <span key={k} className="pr-3 font-mono text-[13px] font-bold uppercase tracking-[0.08em]">
                    {tags.join(' • ')} •
                  </span>
                ))}
              </div>
              </div>
            </div>
          </div>
        </div>
    ) : null,
    document.body,
  );
}
