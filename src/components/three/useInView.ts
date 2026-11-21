import { useEffect, useState, type RefObject } from 'react';

/** true while the element is within `margin` of the viewport (drives lazy mount + frameloop). */
export function useInView(ref: RefObject<Element | null>, margin = '200px') {
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setV(e.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return v;
}
