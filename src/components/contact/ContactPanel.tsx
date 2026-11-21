import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { GLOBE_ARRIVE, panelExit, useContactPanel } from '@/app/panel';
import { ContactBody } from '@/components/contact/ContactBody';
import { useScrollLock } from '@/hooks/useScrollLock';
import { homeShowsGlobe } from '@/lib/globeLayout';

const EASE = [0.16, 1, 0.3, 1] as const;

export { WireGlobe } from '@/components/contact/WireGlobe';

/**
 * "Start a project" panel: fades in under the header, covering the page, while its parts arrive
 * in turn (the pitch rises, the form wipes in on a slant, the globe settles into the dome).
 * Left: pitch + details + globe; middle: the form; right: mark + tagline. Scroll is locked,
 * Escape closes it, focus moves in on open and back to the CTA on close.
 */
export function ContactPanel({ anchor, mini }: { anchor: RefObject<HTMLElement | null>; mini: boolean }) {
  const { open, setOpen } = useContactPanel();
  const reduced = useReducedMotion();
  const [top, setTop] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const { pathname, search } = useLocation();
  const onHome = pathname === '/' && !search;
  // opening over the home globe (the gallery opens plainly)
  const overGlobe = onHome && homeShowsGlobe();
  const openedOverGlobe = useRef(false);
  // over the home globe the panel is see-through behind its pitch column: the home globe shows
  // there, shrinking into the dome, while the rest of the panel wipes in from the right
  const seeThrough = overGlobe && !reduced;
  // closing into the home ball (opened over it, or its globe was tapped on home) the little globe
  // grows back into it, so the panel lingers a moment longer before it fades
  const intoBall = onHome && (panelExit.toGlobe || openedOverGlobe.current);
  const exitWith = { grow: panelExit.toGlobe || intoBall, ball: intoBall };
  useScrollLock(open);

  // the home globe shrank away as the panel opened over it: settle it back in as the panel goes
  useEffect(() => {
    if (open) {
      openedOverGlobe.current = overGlobe;
      return;
    }
    if (onHome && (openedOverGlobe.current || panelExit.toGlobe)) window.dispatchEvent(new Event(GLOBE_ARRIVE));
    openedOverGlobe.current = false;
    // only the open/close edge matters here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const bottom = anchor.current?.getBoundingClientRect().bottom ?? 0;
    const miniH = mini ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mini-h')) * 16 || 56 : 0;
    setTop(Math.max(bottom, miniH, 0));
  }, [open, anchor, mini]);

  useEffect(() => {
    if (!open) return;
    const back = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => panel.current?.querySelector<HTMLElement>('input, textarea, select')?.focus({ preventScroll: true }), 450);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      back?.focus?.({ preventScroll: true });
    };
  }, [open, setOpen]);

  return (
    <AnimatePresence custom={exitWith} onExitComplete={() => { panelExit.toGlobe = false; }}>
      {open && (
        <motion.div
          ref={panel}
          id="contact-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-panel-title"
          className={`fixed inset-x-0 bottom-0 z-[45] overflow-y-auto overscroll-contain ${seeThrough ? '' : 'bg-ink'}`}
          style={{ top }}
          data-lenis-prevent
          // over the home globe there's no fade: the panel's parts wipe in over the globe themselves
          initial={{ opacity: seeThrough ? 1 : 0 }}
          animate={{ opacity: 1, transition: { duration: reduced ? 0.01 : 0.45, ease: EASE } }}
          // the parts leave first (their own exits), then the panel fades off the page; after a tap on
          // its globe it fades a touch later and longer, while the globe zooms into the home globe
          custom={exitWith}
          variants={{
            gone: ({ grow: toGlobe, ball }: { grow: boolean; ball: boolean }) => ({
              opacity: 0,
              transition: reduced
                ? { duration: 0.01 }
                : toGlobe
                  ? ball
                    ? { duration: 0.3, delay: 0.25, ease: [0.4, 0, 0.2, 1] } // as the wipe clears the globe
                    : { duration: 0.5, delay: 0.38, ease: [0.4, 0, 0.2, 1] }
                  : { duration: 0.4, delay: 0.32, ease: [0.4, 0, 0.2, 1] },
            }),
          }}
          exit="gone"
        >
          <ContactBody id="panel" titleId="contact-panel-title" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
