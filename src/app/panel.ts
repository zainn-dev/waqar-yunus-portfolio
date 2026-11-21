import { createContext, useContext } from 'react';

/** Open state of the "Start a project" contact panel, shared by every CTA on the site. */
export const PanelContext = createContext<{ open: boolean; setOpen: (v: boolean) => void }>({ open: false, setOpen: () => {} });
export const useContactPanel = () => useContext(PanelContext);

/** 0 = panel closed, 1 = fully open; tweened by ContactPanel, read every frame by the globe. */
export const contactProgress = { value: 0 };

/** Set just before the panel closes from a tap on its globe: the panel then exits as a zoom into the home globe. */
export const panelExit = { toGlobe: false };
/** Fired on window when that zoom lands on the home page that was already under the panel. */
export const GLOBE_ARRIVE = 'wy:globe-arrive';
/** Fired on window as the panel opens over the home globe; detail = {x, y}, the dome's centre in the viewport. */
export const GLOBE_LEAVE = 'wy:globe-leave';
/**
 * The contact dome while the panel is open over the home globe: where the globe's miniature sits
 * (window px: crest centre x, crest y, diameter). The home globe itself aims at it, seen through
 * the panel's see-through pitch column.
 */
export const domeAim: { get: (() => { x: number; y: number; s: number } | null) | null } = { get: null };
/** the morph's timings (s): the globe shrinking into the dome, and growing back out */
export const DOME_IN = 1.4;
export const DOME_OUT = 1.1;
/** Fired on window to switch the home between gallery and globe; detail = {mode, snap} (snap: no morph). */
export const GLOBE_MODE = 'wy:globe-mode';
