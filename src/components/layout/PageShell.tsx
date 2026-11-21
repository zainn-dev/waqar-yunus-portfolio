import { Suspense, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ScrollTrigger } from '@/lib/gsap';
import { useLenis } from '@/hooks/useLenis';
import { scrollPositions, setRenderedKey } from '@/lib/scroll';
import { requestMountAll } from '@/lib/deferred';
import { morph } from '@/lib/morph';


const ease = [0.76, 0, 0.24, 1] as const;

function ScrollManager() {
  const { key, hash } = useLocation();
  const navType = useNavigationType();
  const lenis = useLenis();

  // Runs once per page mount (PageShell is keyed by pathname), so query-string updates
  // such as project filters never reset the scroll position.
  useLayoutEffect(() => {
    setRenderedKey(key);
    const saved = navType === 'POP' ? scrollPositions.get(key) : undefined;
    const target = hash ? document.querySelector(hash) : null;
    const y = target ? target.getBoundingClientRect().top + window.scrollY - 80 : saved ?? 0;
    const apply = () => {
      // Lenis caches the page height; re-measure first or it clamps to the previous page's height.
      lenis?.resize();
      window.scrollTo(0, y);
      lenis?.scrollTo(y, { immediate: true, force: true });
    };
    if (saved) requestMountAll();
    apply();
    // Lazy chunks and deferred sections may still be growing the page: retry until the
    // saved position is reachable (max ~2s), so back/forward lands where you left.
    let tries = 0;
    let raf = 0;
    const retry = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (Math.abs(window.scrollY - y) > 2 && tries++ < 120) {
        if (max >= y - 2) apply();
        raf = requestAnimationFrame(retry);
      }
    };
    if (y > 0) raf = requestAnimationFrame(retry);
    // Re-measure triggers once fonts/lazy content have settled.
    const ids = [60, 400, 1200].map((ms) => window.setTimeout(() => ScrollTrigger.refresh(), ms));
    return () => { ids.forEach(clearTimeout); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

/**
 * Wraps each route: curtain wipe in/out, page fade, scroll handling, Suspense boundary.
 * A morph (project tiles carried across the route change, lib/morph) skips the curtains and the
 * fade both ways, so the tiles never disappear: the leaving page goes at once (App passes the flag
 * to AnimatePresence as `custom`, which reaches the exit variants) and the new one is just there.
 */
export function PageShell({ children, label }: { children: ReactNode; label: string }) {
  const reduced = useReducedMotion();
  const [m] = useState(() => morph.nav);
  useEffect(() => { morph.nav = false; }, []);
  return (
    <motion.div
      initial={m ? false : reduced ? { opacity: 0 } : { opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0, transition: { duration: reduced ? 0.15 : 0.9, delay: reduced ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] } }}
      exit="exit"
      variants={{ exit: (nav: boolean) => (nav ? { opacity: 1, transition: { duration: 0 } } : { opacity: reduced ? 0 : 1, transition: { duration: reduced ? 0.1 : 0.55 } }) }}
    >
      <ScrollManager />
      {!reduced && (
        <>
          {/* Exit curtain: rises to cover the old page */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-[70] origin-bottom bg-ink-3"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 0 }}
            exit="exit"
            variants={{ exit: (nav: boolean) => (nav ? { scaleY: 0, transition: { duration: 0 } } : { scaleY: 1, transition: { duration: 0.55, ease } }) }}
          />
          {/* Enter curtain: lifts away from the new page */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-[70] flex origin-top items-end overflow-hidden bg-ink-3 page-x pb-10"
            initial={{ scaleY: m ? 0 : 1 }}
            animate={{ scaleY: 0, transition: { duration: m ? 0 : 0.75, ease, delay: 0.05 } }}
            exit={{ scaleY: 0 }}
          >
            <span className="block max-w-full truncate font-display text-[clamp(2.5rem,9vw,8rem)] font-normal leading-none tracking-[-0.05em] text-bone/90">{label}</span>
          </motion.div>
        </>
      )}
      <Suspense fallback={<div className="min-h-[100dvh]" />}>{children}</Suspense>
    </motion.div>
  );
}
