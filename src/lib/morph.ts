/**
 * Shared-element hand-off between routes: a page that is about to leave records where one
 * project's tiles are on screen, and the next page flies its own copies of them from there
 * (project page -> globe, sheet -> project page). `nav` tells the page shell to skip its curtain
 * wipe for that one route change, so the tiles stay in view the whole time.
 */

/** A tile's box in the window (CSS px). */
export interface Rect { x: number; y: number; w: number; h: number }
/** A project's tiles by tile index (layout order, as `tilesFor` returns them); null = not on screen. */
export type TileRects = (Rect | null)[];

/** The home globe's navigation states (see GlobeHome). */
export type GlobePhase = 'universe' | 'opening' | 'detail' | 'closing';

type Dir = 'toGlobe' | 'toDetail';
interface Handoff { slug: string; dir: Dir; rects: TileRects; at: number }

export const morph: { nav: boolean; handoff: Handoff | null } = { nav: false, handoff: null };

/** Record the tiles and flag the next route change as a morph (no curtain). */
export function handOff(slug: string, dir: Dir, rects: TileRects) {
  morph.nav = true;
  morph.handoff = { slug, dir, rects, at: performance.now() };
}

/** The pending hand-off for this project and direction (not consumed; see clearHandoff). */
export function peekHandoff(slug: string | undefined | null, dir: Dir): TileRects | null {
  const h = morph.handoff;
  if (!slug || !h || h.slug !== slug || h.dir !== dir || performance.now() - h.at > 5000) return null;
  return h.rects;
}

export function clearHandoff() {
  morph.handoff = null;
  morph.nav = false;
}

/**
 * Where the `[data-tile]` elements inside `root` are right now, by tile index. The first element
 * of each index (document order) wins, so pass the gallery itself, or a root where it comes first.
 */
export function tileRects(root: ParentNode, count: number): TileRects {
  const out: TileRects = Array.from({ length: count }, () => null);
  root.querySelectorAll<HTMLElement>('[data-tile]').forEach((el) => {
    const n = Number(el.dataset.tile);
    if (!(n >= 0 && n < count) || out[n]) return;
    const r = el.getBoundingClientRect();
    out[n] = { x: r.left, y: r.top, w: r.width, h: r.height };
  });
  return out;
}

/**
 * The 3D flourish every flying tile gets on top of its move: it tips towards you as it lifts off
 * and settles flat as it lands. `side` (−1 … 1) is where it starts relative to the window centre,
 * so tiles on the left swing one way and tiles on the right the other.
 */
export const tumble = (side: number) => ({
  keyframes: { rotationX: [0, -16, 0], rotationY: [0, side * 12, 0], rotationZ: [0, side * -2.5, 0] },
});

/**
 * The home view survives the page being unmounted (opening a project page and coming back):
 * gallery or globe, the ball's turn and tilt and the gallery's scroll, so a project lands exactly
 * where it came from.
 */
export const globeMemory = { valid: false, mode: 'gallery' as 'gallery' | 'globe', yaw: 0, pitch: 0, gy: 0, W: 0, H: 0, mobile: false };
