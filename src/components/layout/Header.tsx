import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Logo } from '@/components/ui/Brand';
import { FlameMascot } from '@/components/ui/FlameMascot';
import { socials, hasHref } from '@/data/socials';
import { ContactPanel } from '@/components/contact/ContactPanel';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { LiquidFill } from '@/components/ui/LiquidFill';
import { useContactPanel } from '@/app/panel';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { play } from '@/lib/sound';
import { gsap } from '@/lib/gsap';
import { cn } from '@/utils/cn';
import { inkFollow } from '@/utils/inkFollow';

const cell = 'relative bg-ink';
const navCell =
  'group relative flex items-center justify-center overflow-hidden bg-ink font-mono text-[13px] font-semibold uppercase tracking-[0.06em] text-bone transition-colors duration-300 hover:bg-lime hover:text-onfill focus-visible:bg-lime focus-visible:text-onfill';
const tagline = 'flex items-center justify-center px-4 text-center font-serif text-[clamp(1.35rem,1.6vw,1.95rem)] leading-none tracking-[-0.005em] text-bone';

/** Nav cell: label slides up and a copy slides in from below on hover. */
function NavCell({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => cn(navCell, isActive && '!text-accent hover:!text-onfill focus-visible:!text-onfill')} data-sound="tick">
      {({ isActive }) => (
        <>
          <span className="relative block h-[1.1em] overflow-hidden leading-[1.1]">
            <span className="block transition-transform duration-500 ease-expo group-hover:-translate-y-full">{label}</span>
            <span aria-hidden="true" className="absolute inset-0 block translate-y-full transition-transform duration-500 ease-expo group-hover:translate-y-0">{label}</span>
          </span>
          {isActive && <span className="sr-only">(current page)</span>}
        </>
      )}
    </NavLink>
  );
}

/** Nav cell for a social profile: opens the profile, or the contact page until its link is set. */
export function SocialCell({ label, platform, title, className = navCell, tabIndex }: { label: string; platform: string; title: string; className?: string; tabIndex?: number }) {
  const s = socials.find((x) => x.icon === platform);
  const inner = (
    <span className="relative block h-[1.1em] overflow-hidden leading-[1.1]">
      <span className="block transition-transform duration-500 ease-expo group-hover:-translate-y-full">{label}</span>
      <span aria-hidden="true" className="absolute inset-0 block translate-y-full transition-transform duration-500 ease-expo group-hover:translate-y-0">{label}</span>
    </span>
  );
  if (s && hasHref(s)) {
    return (
      <a href={s.href} target="_blank" rel="noopener noreferrer" className={className} tabIndex={tabIndex} aria-label={`${title} (opens in a new tab)`} data-sound="tick">
        {inner}
      </a>
    );
  }
  return (
    <Link to="/social" className={className} tabIndex={tabIndex} aria-label={`${title} — see all social profiles`} data-sound="tick">
      {inner}
    </Link>
  );
}

/** The red "Start a project" CTA; turns into a close button while the contact panel is open. */
function Cta({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { open, setOpen } = useContactPanel();
  // count real switches (not the first render), so the light streak only runs when it changes
  const [flips, setFlips] = useState(0);
  const was = useRef(open);
  useEffect(() => {
    if (was.current !== open) setFlips((n) => n + 1);
    was.current = open;
  }, [open]);
  return (
    <button
      type="button"
      onClick={() => { play(open ? 'close' : 'open'); setOpen(!open); }}
      // pressed, it tips in 3D towards the point pressed, and springs back flat as it flips
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const b = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - b.left) / b.width - 0.5;
        const y = (e.clientY - b.top) / b.height - 0.5;
        gsap.to(e.currentTarget, { rotateY: x * 24, rotateX: -y * 24, scale: 0.93, transformPerspective: 420, duration: 0.16, ease: 'power2.out', overwrite: true });
      }}
      onPointerUp={(e) => { gsap.to(e.currentTarget, { rotateX: 0, rotateY: 0, scale: 1, duration: 1, ease: 'elastic.out(1, 0.4)', overwrite: true }); }}
      onPointerLeave={(e) => { gsap.to(e.currentTarget, { rotateX: 0, rotateY: 0, scale: 1, duration: 0.6, ease: 'power3.out', overwrite: true }); }}
      aria-expanded={open}
      aria-controls="contact-panel"
      data-cursor-hide
      className={cn('group relative flex h-full w-full items-center justify-center overflow-hidden bg-lime text-onfill transition-[filter] duration-300 active:brightness-95', className)}
    >
      {/* dark liquid that follows the mouse, clipped to the button, under the (unchanged) label */}
      <LiquidFill />
      {/* a streak of light runs across the button every time it switches */}
      {flips > 0 && <span key={flips} aria-hidden="true" className="cta-sheen" />}
      <span className="sr-only">{open ? 'Close the project form' : 'Start a project'}</span>
      <AnimatePresence mode="wait" initial={false}>
        {open ? (
          <motion.span key="x" data-liquid-label aria-hidden="true" className="relative z-10" exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.2 } }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="square" className={cn('transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:rotate-90 motion-reduce:group-hover:rotate-0', compact ? 'h-6 w-6' : 'h-[clamp(2rem,3vw,3rem)] w-[clamp(2rem,3vw,3rem)]')}>
              {/* the two strokes draw in one after the other */}
              <motion.path d="M5 5 L19 19" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.18, ease: [0.65, 0, 0.35, 1] }} />
              <motion.path d="M19 5 L5 19" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.32, ease: [0.65, 0, 0.35, 1] }} />
            </svg>
          </motion.span>
        ) : compact ? (
          <motion.span key="go" data-liquid-label aria-hidden="true" className="relative z-10" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.3 }}>
            <ArrowUpRight className="h-6 w-6" strokeWidth={2} />
          </motion.span>
        ) : (
          <motion.span
            key="go"
            data-liquid-label
            aria-hidden="true"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 px-3 text-center font-serif text-[clamp(1.35rem,1.6vw,1.95rem)] leading-[0.95] tracking-[-0.005em]"
          >
            Start A Project
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

/** The header mascot: a little animated flame (SVG, no WebGL). */
function Mascot() {
  return (
    <Link to="/about" aria-label="About me" className={cn(cell, 'group flex items-center justify-center overflow-hidden')} data-cursor="Hi!">
      <FlameMascot className="h-[66%] w-auto" />
    </Link>
  );
}

/**
 * The grid header (in the page flow, not fixed), after the "bento bar" pattern: nav cells on the
 * outside, taglines either side, the logo in the middle and the CTA on the right. The same header on
 * every page; no menu, no sticky bar. The contact panel drops out from under it.
 */
export function Header() {
  const desktop = useIsDesktop();
  const { pathname } = useLocation();
  const { setOpen: setPanelOpen } = useContactPanel();
  const bar = useRef<HTMLElement>(null);

  useEffect(() => { setPanelOpen(false); }, [pathname, setPanelOpen]);

  return (
    <>
      {/* data-morph: scrolling a project sheet folds this header into the sheet's pill (see .sheet-morph) */}
      <header
        ref={bar}
        data-morph
        data-cursor-hide
        onPointerMove={inkFollow}
        className="relative z-40 border-b cell-b pt-[env(safe-area-inset-top)]"
      >
        {desktop ? (
          <div className="grid h-[var(--bar-h)] grid-cols-[minmax(8rem,9%)_1fr_minmax(20rem,27.4%)_1fr_minmax(8rem,9%)] grid-rows-[minmax(0,1fr)] gap-px bg-[var(--grid)]">
            {/* col 1: nav · mascot */}
            <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,2fr)] gap-px">
              <div className="grid grid-cols-2 gap-px">
                <NavCell to="/" label="Home" end />
                <NavCell to="/about" label="About" />
              </div>
              <Mascot />
            </div>
            {/* col 2: tagline */}
            <div className="grid min-h-0 grid-rows-[repeat(3,minmax(0,1fr))] gap-px">
              <div className={cell} />
              <p className={cn(cell, tagline, 'cell-accent ink-host')} style={{ '--wave-delay': '0.4s', '--ink-size': '6rem' } as CSSProperties}><span data-hm="fade" className="ink-follow">Design + Code + Motion</span></p>
              <div className={cell} />
            </div>
            {/* col 3: logo */}
            <Link to="/" className={cn(cell, 'ink-host group flex items-center justify-center text-bone')} aria-label="Zain — home">
              <span data-hm="logo" className="inline-block">
                <Logo className="ink-follow text-[clamp(2.6rem,4.3vw,5rem)]" />
              </span>
            </Link>
            {/* col 4: empty · tagline · sound */}
            <div className="grid min-h-0 grid-rows-[repeat(3,minmax(0,1fr))] gap-px">
              <div className={cell} />
              <p className={cn(cell, tagline, 'cell-accent ink-host')} style={{ '--wave-delay': '2.6s', '--ink-size': '6rem' } as CSSProperties}><span data-hm="fade" className="ink-follow">Websites That Work Hard</span></p>
              <div className={cn(cell, 'flex items-center justify-end overflow-hidden pr-2 text-mute hover:text-bone [&>button]:min-h-0')}>
                <SoundToggle />
              </div>
            </div>
            {/* col 5: socials · CTA (inset, rounded) */}
            <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,2fr)] gap-px">
              <NavCell to="/social" label="Social Media" />
              <div className={cn(cell, 'min-h-0 p-2.5')}>
                <div data-hm="cta" className="h-full w-full">
                  <Cta className="rounded-[6px]" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-px bg-[var(--grid)]">
            <div className="grid h-11 grid-cols-3 gap-px">
              <NavCell to="/" label="Home" end />
              <NavCell to="/about" label="About" />
              <NavCell to="/social" label="Social Media" />
            </div>
            <div className="grid h-[4.5rem] grid-cols-[4.5rem_1fr_4.5rem] gap-px">
              <Mascot />
              <Link to="/" className={cn(cell, 'ink-host flex items-center justify-center text-bone')} aria-label="Zain — home">
                <Logo className="ink-follow text-[1.75rem]" />
              </Link>
              <Cta compact />
            </div>
          </div>
        )}
      </header>

      <ContactPanel anchor={bar} mini={false} />
    </>
  );
}
