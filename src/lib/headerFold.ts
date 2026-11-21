/**
 * The site header folding into the floating project pill (griflan-style), shared by the project
 * sheet and the project page. CSS does the drawing (html.sheet-morph in index.css); this file only
 * writes the variables it reads:
 *
 * --sheet-t   0 → 1, how far the fold has gone (scrubbed by scroll)
 * --fold-y    px the header is pushed down to stay pinned at the top of the window while it folds
 *             (the project page scrolls the window, so the in-flow header would otherwise leave)
 * --hm-*      where the header's box, name and CTA land on the pill (measured once, at fold 0)
 */
export const T_VAR = '--sheet-t';
export const PIN_VAR = '--fold-y';
export const MORPH_CLASS = 'sheet-morph';
export const html = () => document.documentElement;
export const setT = (t: number) => html().style.setProperty(T_VAR, t.toFixed(4));
export const setPin = (px: number) => html().style.setProperty(PIN_VAR, `${px.toFixed(1)}px`);
export const headerH = () => document.querySelector<HTMLElement>('header')?.offsetHeight ?? 0;
/** scroll it takes to fold: ~80% of the header's height */
export const foldEnd = () => Math.max(1, headerH() * 0.8);
export const foldAt = (scrollTop: number) => Math.min(1, Math.max(0, scrollTop / foldEnd()));

/**
 * Measure where each part of the header lands in the pill. `pin` is the --fold-y that puts the
 * header at the top of the window right now (the window's scroll on the project page, 0 in the
 * sheet). Without the pill's logo (small screens) the header just rides up and away.
 */
export const measureFold = (pin = 0) => {
  const root = html();
  const head = document.querySelector<HTMLElement>('header[data-morph]');
  if (!head) return;
  const savedT = root.style.getPropertyValue(T_VAR);
  const savedPin = root.style.getPropertyValue(PIN_VAR);
  root.style.setProperty(T_VAR, '0');
  setPin(pin);
  const hr = head.getBoundingClientRect();
  const q = (s: string) => document.querySelector<HTMLElement>(s)?.getBoundingClientRect();
  const logo = q('header [data-hm="logo"]');
  const cta = q('header [data-hm="cta"]');
  const pBox = q('[data-pill="box"]');
  const pLogo = q('[data-pill="logo"]');
  const pCta = q('[data-pill="cta"]');
  const set = (k: string, v: number) => root.style.setProperty(`--hm-${k}`, k === 'ls' || k === 'cs' ? v.toFixed(4) : `${v.toFixed(1)}px`);
  if (logo?.width && cta?.width && pBox?.width && pLogo?.width && pCta?.width) {
    const pcy = pBox.top + pBox.height / 2; // the pill's middle, in the window
    const dy = logo.top - hr.top + logo.height / 2 - pcy; // the header rises by this much
    set('dy', dy);
    set('top', pBox.top + dy - hr.top);
    set('bottom', hr.bottom - (pBox.bottom + dy));
    set('left', pBox.left - hr.left);
    set('right', hr.right - pBox.right);
    set('lx', pLogo.left + pLogo.width / 2 - (logo.left + logo.width / 2));
    set('ls', pLogo.width / logo.width);
    set('cx', pCta.right - cta.right);
    set('cy', pcy + dy - (cta.top + cta.height / 2));
    set('cs', pCta.height / cta.height);
  } else {
    set('dy', hr.height + 1);
    ['top', 'bottom', 'left', 'right', 'lx', 'cx', 'cy'].forEach((k) => set(k, 0));
    set('ls', 1);
    set('cs', 1);
  }
  if (savedT) root.style.setProperty(T_VAR, savedT);
  else root.style.removeProperty(T_VAR);
  if (savedPin) root.style.setProperty(PIN_VAR, savedPin);
  else root.style.removeProperty(PIN_VAR);
};

/** Take the fold off the header entirely (route leaves). */
export const clearFold = () => {
  const root = html();
  root.classList.remove(MORPH_CLASS);
  root.style.removeProperty(T_VAR);
  root.style.removeProperty(PIN_VAR);
};
