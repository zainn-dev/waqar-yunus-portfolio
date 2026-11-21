import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { motion, useAnimationControls, useIsPresent, useReducedMotion } from 'framer-motion';
import { gsap } from '@/lib/gsap';
import { profile } from '@/data/profile';
import { socials, hasHref } from '@/data/socials';
import { ContactForm } from '@/components/contact/ContactForm';
import { FlameMascot } from '@/components/ui/FlameMascot';
import { WireGlobe } from '@/components/contact/WireGlobe';
import { GlitchStrip } from '@/components/contact/GlitchStrip';
import { useLocation, useNavigate } from 'react-router-dom';
import { GLOBE_LEAVE, GLOBE_MODE, domeAim, panelExit, useContactPanel } from '@/app/panel';
import { ballFor, homeShowsGlobe } from '@/lib/globeLayout';

const EASE = [0.16, 1, 0.3, 1] as const;
const EASE_IN = [0.7, 0, 0.84, 0] as const;
const EASE_FLY = [0.65, 0, 0.35, 1] as const;
const NO_CLIP = 'inset(0px 0px 0px 0px)';
/** the grid's 1px seams, drawn by the columns themselves when the panel is see-through */
const SEAM = 'shadow-[-1px_0_0_var(--grid),0_-1px_0_var(--grid)]';
/** the panel's globe growing back out into the home globe (s); the panel uncovers it right after */
export const GROW = 1.1;
/** the panel's globe flying up into the home globe: how far, how big, from where */
type Flight = { x: number; y: number; s: number; origin: string; clip: string };
const slant = (l: number) => `polygon(${l}% 0%, 130% 0%, 130% 100%, ${l + 18}% 100%)`;

/** Panel-only stagger: each block of the pitch rises in from a dim, low start, and sinks out on close. */
const rise = (delay: number, on: boolean) =>
  on
    ? {
        initial: { opacity: 0.08, y: 28 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.9, delay, ease: EASE } },
        exit: { opacity: 0, y: 16, transition: { duration: 0.3, ease: EASE_IN } },
      }
    : {};

/** Shared three-column contact body (pitch + globe | form | BUILD strip), used by the panel and /contact. */
export function ContactBody({ id, titleId, presetType, page }: { id: string; titleId: string; presetType?: string | null; page?: boolean }) {
  const reduced = useReducedMotion();
  const linked = socials.filter(hasHref);
  const links: { label: string; href?: string }[] = [
    ...(profile.email ? [{ label: profile.email, href: `mailto:${profile.email}` }] : []),
    ...linked.map((s) => ({ label: s.label, href: s.href })),
  ];
  const facts = [profile.location, profile.availability.label, 'Replies in 1 working day'];

  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { setOpen } = useContactPanel();
  const domeBox = useRef<HTMLDivElement>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const flyCtl = useAnimationControls();
  const boxCtl = useAnimationControls();
  // panel only: the form wipes in on a slant. Over the home globe the globe itself shrinks down
  // from the middle of the screen into the dome (and grows back out on close); elsewhere the dome
  // just rises in from below.
  const wipe = !page && !reduced;
  // opened over the home globe: the panel is see-through behind the pitch column, where the home
  // globe itself shrinks into the dome (and grows back out on close)
  const [overGlobe] = useState(() => wipe && pathname === '/' && !search && homeShowsGlobe());
  // closing flies the little globe up into the home ball (opened over it, or its globe was tapped on home)
  const [intoBall, setIntoBall] = useState(overGlobe);
  const domeFrom = { y: '100%', scale: 0.9, opacity: 1 };
  const H = page ? 'h1' : 'h2';
  const present = useIsPresent();
  const pitchCol = useRef<HTMLDivElement>(null);
  const formCol = useRef<HTMLDivElement>(null);
  const markCol = useRef<HTMLDivElement>(null);
  const edge = useRef({ x: 0 });

  // over the home globe: the globe aims at the dome, and the panel's other columns wipe in from the
  // right edge of the screen to the pitch column's edge, uncovering the globe only there
  const wipeTo = (to: number, vars: gsap.TweenVars) => {
    const cols = [formCol.current, markCol.current].filter(Boolean) as HTMLElement[];
    const paint = () => cols.forEach((c) => { c.style.clipPath = `inset(0px 0px 0px ${Math.max(0, edge.current.x - c.getBoundingClientRect().left)}px)`; });
    gsap.killTweensOf(edge.current);
    return gsap.to(edge.current, { x: to, ...vars, onUpdate: paint, onComplete: () => { paint(); if (to <= 0) cols.forEach((c) => { c.style.clipPath = ''; }); } });
  };
  useLayoutEffect(() => {
    if (!overGlobe) return;
    const dome = domeBox.current;
    domeAim.get = () => {
      const b = dome?.getBoundingClientRect();
      return b && b.width ? { x: b.left + b.width / 2, y: b.top + b.height * 0.05, s: b.width * 1.18 } : null;
    };
    window.dispatchEvent(new Event(GLOBE_LEAVE));
    edge.current.x = window.innerWidth;
    const right = pitchCol.current?.getBoundingClientRect().right ?? 0;
    wipeTo(right, { duration: 0.6, ease: 'expo.out' });
    const e = edge.current;
    return () => { gsap.killTweensOf(e); domeAim.get = null; };
    // once, as the panel opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!overGlobe || present) return;
    wipeTo(window.innerWidth, { duration: 0.5, ease: 'power2.in' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [present]);

  // where the dome's globe sits, and the move that takes it to the middle of the screen at full
  // size. Read from the dome's own box (never transformed) so it holds mid-animation too.
  const measure = (toHome: boolean): Flight | null => {
    const b = domeBox.current?.getBoundingClientRect();
    if (!b || !b.width) return null;
    const w = b.width * 1.18; // the canvas: 118% wide, square, 5% down, centred
    const cx = b.left + b.width / 2;
    const cy = b.top + b.height * 0.05 + w / 2;
    const top = document.getElementById('contact-panel')?.getBoundingClientRect().top ?? 0;
    const big = Math.max(window.innerWidth, window.innerHeight);
    // to the home globe: match its ball exactly (centre and radius, see globeLayout), so the little
    // globe takes over from it without a seam
    const home = toHome ? document.querySelector<HTMLElement>('section[data-phase]') : null;
    const hr = home?.getBoundingClientRect();
    if (hr && hr.width) {
      const ball = ballFor(hr.width, hr.height);
      return {
        x: hr.left + hr.width / 2 + ball.x - cx,
        y: hr.top + hr.height / 2 - ball.y - cy,
        s: ball.r / Math.max(1, w / 2 - 1),
        origin: `${cx - b.left}px ${cy - b.top}px`,
        clip: `inset(${-big * 3}px ${-big * 3}px ${-big * 3}px ${-big * 3}px)`,
      };
    }
    return {
      x: window.innerWidth / 2 - cx,
      y: (top + window.innerHeight) / 2 - cy,
      s: Math.min(4, (big * 0.95) / w),
      origin: `${cx - b.left}px ${cy - b.top}px`,
      clip: `inset(${-big * 2}px ${-big * 2}px ${-big * 2}px ${-big * 2}px)`,
    };
  };

  // tap the globe: it lifts out of the dome and zooms to the middle of the screen while the panel
  // goes, landing on the home globe (already under the panel on home, or routed to from elsewhere)
  const goHome = () => {
    if (pathname !== '/') navigate('/', { state: { fromGlobeButton: true } });
    else if (search) navigate('/', { replace: true }); // a project sheet is open: fly it back too
    // already over the home globe: ContactPanel settles it back in as it closes
  };
  const onGlobeTap = () => {
    if (page) { goHome(); return; }
    const onHome = pathname === '/' && !search;
    // over the gallery: the home turns into the globe at once (under the panel), so this lands on it
    if (onHome && wipe && !homeShowsGlobe()) window.dispatchEvent(new CustomEvent(GLOBE_MODE, { detail: { mode: 'globe', snap: true } }));
    const f = wipe && !overGlobe ? measure(onHome) : null;
    if (f) flushSync(() => { setFlight(f); setIntoBall(onHome); });
    panelExit.toGlobe = true;
    setOpen(false);
    goHome();
  };
  // panel open: "Home" (the nav cell, the logo, anything linking to /) while on home closes it: over
  // the globe the little globe grows back out into it; over the gallery it just closes. From other
  // pages the link goes home as usual (the header closes the panel on the route change).
  const tapRef = useRef(onGlobeTap);
  tapRef.current = onGlobeTap;
  useEffect(() => {
    if (page) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.closest('#contact-panel')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== '/' || url.search) return;
      if (window.location.pathname !== '/') return;
      e.preventDefault();
      e.stopPropagation();
      if (!window.location.search && homeShowsGlobe()) { tapRef.current(); return; }
      setOpen(false);
      if (window.location.search) navigate('/', { replace: true }); // a project sheet is open: fly it back too
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [page, setOpen, navigate]);
  return (
          <div className={`grid ${overGlobe ? '' : 'bg-ink [background-image:linear-gradient(var(--grid),var(--grid))]'} gap-px lg:grid-cols-[minmax(8rem,9%)_1fr_minmax(20rem,27.4%)_1fr_minmax(8rem,9%)] ${page ? 'min-h-[calc(100svh-var(--bar-h))]' : 'min-h-full'}`}>
            {/* pitch */}
            <motion.div
              ref={pitchCol}
              className={`relative flex flex-col ${overGlobe ? '' : 'bg-ink'} px-[var(--gutter)] pb-8 pt-10 lg:col-span-2 lg:px-10 lg:pt-14 ${flight ? 'z-10 overflow-visible' : 'overflow-hidden'}`}
              initial={reduced || wipe ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.25, ease: EASE }}
            >
              <motion.div className="relative z-[1]" {...rise(0.2, wipe)}>
              <H id={titleId} className="font-display text-[clamp(3rem,5.6vw,6.5rem)] font-bold uppercase leading-[0.88] tracking-[-0.01em] text-bone text-wave">
                Got a big idea?<br /><span className="text-accent">Let’s build it.</span>
              </H>
              </motion.div>
              <motion.div className="relative z-[1] mt-8 grid gap-6 sm:grid-cols-[1.4fr_1fr]" {...rise(0.38, wipe)}>
                <p className="max-w-[34ch] text-[15px] leading-relaxed text-mute">
                  Websites, web apps, online stores and the integrations behind them — designed, built and shipped end to end. Tell me what you’re making.
                </p>
                <ul className="space-y-1.5 font-mono text-[12px] font-semibold uppercase tracking-[0.06em] text-bone" aria-label="Contact details">
                  {links.map((l) => (
                    <li key={l.label}><a href={l.href} {...(l.href?.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="hover:text-accent">{l.label} ↗</a></li>
                  ))}
                  {facts.map((f) => <li key={f} className="text-mute">{f}</li>)}
                </ul>
              </motion.div>
              {/* the dome: clipped by its box, until a tap opens the clip and the globe flies out */}
              <motion.div
                ref={domeBox}
                className="relative -mx-[var(--gutter)] -mb-8 mt-10 h-[clamp(12rem,38vh,27rem)] lg:-mx-10 lg:mt-auto"
                initial={{ clipPath: NO_CLIP }}
                animate={boxCtl}
                exit={flight ? { clipPath: flight.clip, transition: { duration: intoBall ? GROW : 0.85, ease: EASE_FLY } } : undefined}
              >
                <motion.div
                  className="absolute inset-0 origin-bottom"
                  initial={wipe && !overGlobe ? domeFrom : false}
                  animate={{ y: '0%', scale: 1, opacity: 1, transition: { duration: 1.2, delay: 0.05, ease: EASE } }}
                  exit={wipe && !flight && !overGlobe ? { ...domeFrom, transition: { duration: 0.6, ease: EASE_IN } } : undefined}
                >
                  <motion.div
                    className="absolute inset-0"
                    style={flight ? { transformOrigin: flight.origin } : undefined}
                    animate={flyCtl}
                    exit={flight ? {
                      x: flight.x,
                      y: flight.y,
                      scale: flight.s,
                      // into the home ball it stays solid all the way: it lands on it, and the panel then
                      // uncovers it; elsewhere it melts away as the page changes under it
                      opacity: intoBall ? 1 : [1, 1, 0],
                      transition: intoBall
                        ? { duration: GROW, ease: EASE_FLY }
                        : { duration: 0.85, ease: EASE_FLY, opacity: { duration: 0.85, times: [0, 0.62, 1], ease: 'easeIn' } },
                    } : undefined}
                  >
                    {overGlobe ? (
                      <div className="absolute inset-0 cursor-pointer" onClick={onGlobeTap} />
                    ) : (
                      <WireGlobe className="absolute left-1/2 top-[5%] aspect-square w-[118%] -translate-x-1/2 text-bone" onTap={onGlobeTap} />
                    )}
                  </motion.div>
                </motion.div>
                <button
                  type="button"
                  onClick={onGlobeTap}
                  className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:left-4 focus-visible:top-4 focus-visible:z-10 focus-visible:bg-ink focus-visible:px-3 focus-visible:py-2 focus-visible:font-mono focus-visible:text-[12px] focus-visible:uppercase focus-visible:text-bone focus-visible:outline focus-visible:outline-1 focus-visible:outline-bone/50"
                >
                  Open the home globe
                </button>
              </motion.div>
            </motion.div>

            {/* form */}
            <div ref={formCol} className={`bg-ink px-[var(--gutter)] py-10 lg:col-span-2 lg:px-10 lg:py-14 ${overGlobe ? SEAM : ''}`}>
            <motion.div
              initial={reduced || overGlobe ? false : wipe ? { opacity: 0.4, x: 90, clipPath: slant(102) } : { opacity: 0 }}
              animate={wipe ? { opacity: 1, x: 0, clipPath: slant(-20) } : { opacity: 1 }}
              exit={wipe ? { opacity: 0.4, x: 60, clipPath: slant(102), transition: { duration: 0.5, ease: EASE_IN } } : undefined}
              transition={{ duration: 1.05, delay: 0.12, ease: EASE }}
            >
              <p className="mb-6 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-mute">
                <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-lime align-middle" /> New project enquiry
              </p>
              <ContactForm id={id} presetType={presetType} />
            </motion.div>
            </div>

            {/* mark + strip */}
            <div ref={markCol} className={`bg-ink ${overGlobe ? SEAM : ''}`}>
            <div className="flex flex-col gap-4 bg-ink px-[var(--gutter)] pb-8 pt-2 lg:sticky lg:top-[var(--bar-h)] lg:h-[calc(100svh-var(--bar-h))] lg:items-stretch lg:px-5 lg:pb-6 lg:pt-14">
              <FlameMascot className="hidden h-10 w-auto shrink-0 self-center lg:block" />
              <GlitchStrip className="h-24 w-full shrink-0 lg:h-auto lg:min-h-[16rem] lg:flex-1" word="BUILD" />
              <p className="shrink-0 text-center font-mono text-[10px] font-semibold uppercase leading-relaxed tracking-[0.1em] text-mute">
                For ideas ready to ship
              </p>
            </div>
            </div>
          </div>
  );
}
