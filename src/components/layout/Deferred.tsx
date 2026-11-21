import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollTrigger } from '@/lib/gsap';

import { MOUNT_ALL_EVENT, shouldMountAll } from '@/lib/deferred';

let refreshTimer = 0;
const refreshSoon = () => {
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 120);
};

/**
 * Mounts heavy below-the-fold sections after first paint: as soon as they come within
 * ~800px of the viewport, or during idle time (staggered by `order`), whichever is first.
 * Splits one long render into several short tasks — better responsiveness on phones.
 * The placeholder reserves height so the page doesn't jump.
 */
export function Deferred({ children, order = 0, minHeight = '60vh' }: { children: ReactNode; order?: number; minHeight?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(shouldMountAll);

  useEffect(() => {
    if (show) { refreshSoon(); return; }
    const el = ref.current;
    if (!el) return;
    const now = () => setShow(true);
    window.addEventListener(MOUNT_ALL_EVENT, now);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShow(true), { rootMargin: '800px 0px' });
    io.observe(el);
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    let idle = 0;
    const timer = window.setTimeout(() => {
      idle = w.requestIdleCallback ? w.requestIdleCallback(() => setShow(true), { timeout: 2000 }) : window.setTimeout(() => setShow(true), 0);
    }, 1200 + order * 350);
    return () => {
      window.removeEventListener(MOUNT_ALL_EVENT, now);
      io.disconnect();
      window.clearTimeout(timer);
      if (idle) (w.cancelIdleCallback ?? window.clearTimeout)(idle);
    };
  }, [show, order]);

  return show ? <>{children}</> : <div ref={ref} aria-hidden="true" style={{ minHeight }} />;
}
