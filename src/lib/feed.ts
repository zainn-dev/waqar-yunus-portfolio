/**
 * The copy of project `i`'s gallery to jump to: the feed loops, so the same project is on the page
 * several times; take the one nearest to where you are now (ties go to the one ahead).
 */
export function nearestFeed(i: number, within: ParentNode = document): HTMLElement | null {
  let best: HTMLElement | null = null;
  let bestD = Infinity;
  within.querySelectorAll<HTMLElement>(`[data-feed="${i}"]`).forEach((el) => {
    const top = el.getBoundingClientRect().top;
    const d = top >= 0 ? top : -top * 1.5;
    if (d < bestD) { bestD = d; best = el; }
  });
  return best;
}

