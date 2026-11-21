import type { PointerEvent } from 'react';

/** Keep the colour spot of every .ink-follow inside the hovered .ink-host under the pointer. */
export function inkFollow(e: PointerEvent) {
  const host = (e.target as Element).closest('.ink-host');
  host?.querySelectorAll<HTMLElement>('.ink-follow').forEach((el) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
}
