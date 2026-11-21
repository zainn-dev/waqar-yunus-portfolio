/** Sky time-of-day shared between the hero scene, its toggle and the header (ink colour). */
export type SkyMode = 'day' | 'sunset' | 'night';
type L = () => void;
let mode: SkyMode = 'day';
const ls = new Set<L>();
export const sky = {
  get: () => mode,
  set: (m: SkyMode) => { mode = m; document.documentElement.dataset.sky = m; ls.forEach((l) => l()); },
  subscribe: (l: L) => { ls.add(l); return () => { ls.delete(l); }; },
};
