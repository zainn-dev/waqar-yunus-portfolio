import type { Project, ProjectImage } from '@/types/content';

/**
 * Project "tiles": the little boards each project is shown as — on the globe (drawn into a canvas
 * atlas) and in the project gallery (as DOM). One source of truth for colours, layout and content
 * so both look like the same object.
 */

export const HUES = [
  { bg: '#3DDC97', ink: '#181616' }, // mint
  { bg: '#FF6B3D', ink: '#181616' }, // signal orange
  { bg: '#7AA2FF', ink: '#181616' }, // blue
  { bg: '#E8FF6B', ink: '#181616' }, // acid
  { bg: '#C792EA', ink: '#181616' }, // lilac
  { bg: '#FFB347', ink: '#181616' }, // amber
  { bg: '#2EC4B6', ink: '#181616' }, // teal
  { bg: '#FF5D8F', ink: '#181616' }, // pink
  { bg: '#FFFDDB', ink: '#181616' }, // cream
  { bg: '#1F6F54', ink: '#FFFDDB' }, // deep green
] as const;

export const huesFor = (i: number) => ({ a: HUES[i % HUES.length], b: HUES[(i + 3) % HUES.length] });

export type TileKind = 'cover' | 'zoom' | 'title' | 'num' | 'stack' | 'focus' | 'glyph' | 'pattern' | 'shot';
/** [column, row, width] inside a 4 × 2 cluster */
export type TileRect = readonly [number, number, number];

export const LAYOUTS: readonly (readonly TileRect[])[] = [
  [[0, 0, 2], [2, 0, 1], [3, 0, 1], [0, 1, 1], [1, 1, 1], [2, 1, 2]],
  [[0, 0, 1], [1, 0, 1], [2, 0, 2], [0, 1, 2], [2, 1, 1], [3, 1, 1]],
  [[0, 0, 1], [1, 0, 2], [3, 0, 1], [0, 1, 1], [1, 1, 1], [2, 1, 2]],
];

/** `shot` tiles carry the real gallery screenshot they show. */
export interface Tile { rect: TileRect; kind: TileKind; shot?: ProjectImage }

/** The six tiles of a project, in layout order. Wide slots get the cover / title; real gallery
 * screenshots (landscape ones in wide slots) replace generated tiles where the project has them. */
export function tilesFor(p: Project, i: number): Tile[] {
  // every cluster has the same shape (wide, square, square / square, square, wide), as on the reference
  const layout = LAYOUTS[0];
  const shots = (p.gallery ?? []).filter((g) => g.src !== p.cover?.src);
  const landscape = shots.filter((g) => g.width > g.height);
  const wideShot = landscape[0];
  const singleShots = shots.filter((g) => g !== wideShot).slice(0, 2);
  const wide: Tile['kind'][] = p.cover ? ['cover', wideShot ? 'shot' : 'title'] : [wideShot ? 'shot' : 'title', 'glyph'];
  const single: TileKind[] = p.cover ? ['zoom', 'num', 'stack', 'focus'] : ['num', 'stack', 'pattern', 'focus'];
  // rotate the singles so neighbouring projects don't repeat the same order
  const s = single.map((_, k) => single[(k + i) % single.length]);
  // screenshots take the place of the last generated singles
  s.splice(s.length - singleShots.length, singleShots.length, ...singleShots.map(() => 'shot' as const));
  const queue = [...singleShots];
  return layout.map((rect): Tile => {
    const kind = rect[2] > 1 ? wide.shift()! : s.shift()!;
    if (kind !== 'shot') return { rect, kind };
    return { rect, kind, shot: rect[2] > 1 ? wideShot : queue.shift() };
  });
}

export const pad2 = (n: number) => String(n + 1).padStart(2, '0');
export const shortCat = (p: Project) => p.categories[0]?.toUpperCase() ?? 'PROJECT';
export const stackOf = (p: Project) => (p.stack?.length ? p.stack : p.categories);

/* ------------------------------------------------------------------ canvas atlas */

export const CELL_W = 320;
export const CELL_H = 320; // square cells: the globe lays clusters out on a square grid
export const ATLAS_W = CELL_W * 4;
export const ATLAS_H = CELL_H * 2;

const FONT_D = '"Antonio Variable", Antonio, "Arial Narrow", sans-serif';
const FONT_M = '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace';
const FONT_S = '"Instrument Serif", Georgia, serif';

let fontsReady: Promise<unknown> | null = null;
const loadFonts = () =>
  (fontsReady ??= Promise.all([
    document.fonts.load(`700 80px ${FONT_D}`),
    document.fonts.load(`italic 400 40px ${FONT_S}`),
    document.fonts.load(`600 16px ${FONT_M}`),
  ]).catch(() => undefined));

const images = new Map<string, Promise<HTMLImageElement | null>>();
function loadImage(src: string) {
  if (!images.has(src)) {
    images.set(
      src,
      new Promise((res) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => res(img);
        img.onerror = () => res(null);
        img.src = src;
      }),
    );
  }
  return images.get(src)!;
}

/** Wraps `text` into at most `maxLines` lines that fit `w`, shrinking the font until it does. */
function fit(g: CanvasRenderingContext2D, text: string, font: (px: number) => string, w: number, h: number, start: number, maxLines: number, lh = 0.95) {
  for (let px = start; px > 10; px -= 2) {
    g.font = font(px);
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let cur = '';
    for (const word of words) {
      const t = cur ? `${cur} ${word}` : word;
      if (g.measureText(t).width <= w) cur = t;
      else {
        if (cur) lines.push(cur);
        cur = word;
      }
    }
    if (cur) lines.push(cur);
    if (lines.length <= maxLines && lines.every((l) => g.measureText(l).width <= w) && lines.length * px * lh <= h) return { lines, px };
  }
  g.font = font(12);
  return { lines: [text], px: 12 };
}

function label(g: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, align: CanvasTextAlign = 'left') {
  g.font = `700 13px ${FONT_M}`;
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = 'top';
  g.fillText(text.toUpperCase(), x, y);
  g.textAlign = 'left';
}

function cover(g: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, zoom = 1, fx = 0.5, fy = 0.5) {
  const s = Math.max(w / img.width, h / img.height) * zoom;
  const dw = img.width * s;
  const dh = img.height * s;
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.drawImage(img, x + (w - dw) * fx, y + (h - dh) * fy, dw, dh);
  g.restore();
}

/** As the page's tile does it: object-cover (centred), then scale(zoom) about the box point (ox, oy). */
function coverZoom(g: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, zoom: number, ox: number, oy: number) {
  const s = Math.max(w / img.width, h / img.height);
  const bw = img.width * s;
  const bh = img.height * s;
  const cx = ox * w;
  const cy = oy * h;
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.drawImage(img, x + cx + ((w - bw) / 2 - cx) * zoom, y + cy + ((h - bh) / 2 - cy) * zoom, bw * zoom, bh * zoom);
  g.restore();
}

function drawTile(g: CanvasRenderingContext2D, t: Tile, p: Project, i: number, img: HTMLImageElement | null, shots: Map<string, HTMLImageElement | null>, x: number, y: number, w: number, h: number) {
  const { a, b } = huesFor(i);
  const P = 20; // the page tile's padding (1.6vw of a 26vw tile), at atlas scale

  const shotImg = t.kind === 'shot' && t.shot ? shots.get(t.shot.src) : null;
  if (shotImg) {
    g.fillStyle = '#2A2727';
    g.fillRect(x, y, w, h);
    cover(g, shotImg, x, y, w, h, 1, 0.5, 0);
    return;
  }

  if ((t.kind === 'cover' || t.kind === 'zoom') && img) {
    g.fillStyle = '#2A2727';
    g.fillRect(x, y, w, h);
    if (t.kind === 'cover') cover(g, img, x, y, w, h);
    else coverZoom(g, img, x, y, w, h, 1.9, p.coverZoom?.x ?? 0.06, p.coverZoom?.y ?? 0.22);
    return;
  }

  switch (t.kind) {
    case 'title': {
      g.fillStyle = a.bg;
      g.fillRect(x, y, w, h);
      label(g, `${pad2(i)} — ${shortCat(p)}`, x + P, y + P, a.ink);
      const { lines, px } = fit(g, p.title.toUpperCase(), (s) => `700 ${s}px ${FONT_D}`, w - P * 2, h - P * 3.2, 120, 3, 0.92);
      g.fillStyle = a.ink;
      g.textBaseline = 'alphabetic';
      lines.forEach((l, k) => g.fillText(l, x + P, y + h - P - (lines.length - 1 - k) * px * 0.92));
      break;
    }
    case 'num': {
      g.fillStyle = b.bg;
      g.fillRect(x, y, w, h);
      label(g, 'Project', x + P, y + P, b.ink);
      label(g, p.year ?? 'WY.', x + w - P, y + P, b.ink, 'right');
      // the page's tile: 14vw type in a ~26vw square tile, set on its bottom padding
      const fs = h * 0.53;
      g.font = `700 ${fs}px ${FONT_D}`;
      g.fillStyle = b.ink;
      g.textBaseline = 'alphabetic';
      g.fillText(pad2(i), x + P - fs * 0.04, y + h - P + fs * 0.1);
      break;
    }
    case 'stack': {
      g.fillStyle = '#201E1E';
      g.fillRect(x, y, w, h);
      label(g, 'Stack', x + P, y + P, '#9C9685');
      g.font = `600 15px ${FONT_M}`;
      let cx = x + P;
      let cy = y + P + 34;
      for (const s of stackOf(p)) {
        const tw = g.measureText(s).width + 22;
        if (cx + tw > x + w - P) { cx = x + P; cy += 36; }
        if (cy > y + h - P - 28) break;
        g.strokeStyle = 'rgba(245,240,222,0.45)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.roundRect(cx, cy, tw, 28, 14);
        g.stroke();
        g.fillStyle = '#FFFDDB';
        g.textBaseline = 'middle';
        g.fillText(s, cx + 11, cy + 15);
        cx += tw + 8;
      }
      g.fillStyle = a.bg;
      g.fillRect(x + P, y + h - P - 6, 36, 6);
      break;
    }
    case 'focus': {
      g.fillStyle = '#FFFDDB';
      g.fillRect(x, y, w, h);
      label(g, 'Focus', x + P, y + P, '#181616');
      const { lines, px } = fit(g, p.focus, (s) => `italic 400 ${s}px ${FONT_S}`, w - P * 2, h - P * 3.4, 46, 4, 1.02);
      g.fillStyle = '#181616';
      g.textBaseline = 'alphabetic';
      lines.forEach((l, k) => g.fillText(l, x + P, y + h - P - (lines.length - 1 - k) * px * 1.02));
      break;
    }
    case 'glyph': {
      g.fillStyle = '#2A2727';
      g.fillRect(x, y, w, h);
      g.fillStyle = a.bg;
      g.beginPath();
      g.arc(x + w * 0.68, y + h * 0.5, h * 0.4, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#2A2727';
      g.beginPath();
      g.arc(x + w * 0.68, y + h * 0.5, h * 0.15, 0, Math.PI * 2);
      g.fill();
      g.font = `700 ${h * 0.95}px ${FONT_D}`;
      g.fillStyle = '#FFFDDB';
      g.textBaseline = 'alphabetic';
      g.fillText(p.title[0].toUpperCase(), x + P, y + h - P + 8);
      break;
    }
    case 'pattern':
    default: {
      g.fillStyle = b.bg;
      g.fillRect(x, y, w, h);
      g.fillStyle = b.ink;
      const step = 22;
      for (let yy = y + step; yy < y + h; yy += step) {
        for (let xx = x + step; xx < x + w; xx += step) {
          const d = Math.hypot(xx - (x + w * 0.3), yy - (y + h * 0.7)) / w;
          g.beginPath();
          g.arc(xx, yy, Math.max(0.6, 5.5 - d * 9), 0, Math.PI * 2);
          g.fill();
        }
      }
    }
  }
}

/** The project sheet's wide tile (620 x 404 on the reference): the shape the globe's wide pictures are made for. */
export const WIDE_ASPECT = 1.535;

/**
 * Draws a project's full 4 x 2 cluster into a canvas (used as the globe texture). `wide` is the
 * shape the wide tiles' pictures are laid out for (stretched to fill their 2 x 1 cell; the globe's
 * shader cover-fits them back), so they match the sheet the tiles fly into.
 */
/** atlases are drawn once per page load: every globe (home, the contact dome, About) shares them */
const atlases = new Map<string, Promise<HTMLCanvasElement>>();
export function buildAtlas(p: Project, i: number, wide = 2): Promise<HTMLCanvasElement> {
  const key = `${p.slug}:${i}:${wide}`;
  let a = atlases.get(key);
  if (!a) {
    a = drawAtlas(p, i, wide);
    atlases.set(key, a);
  }
  return a;
}

async function drawAtlas(p: Project, i: number, wide: number): Promise<HTMLCanvasElement> {
  await loadFonts();
  const tiles = tilesFor(p, i);
  const shotSrcs = tiles.flatMap((t) => (t.shot ? [t.shot.src] : []));
  const [img, ...shotImgs] = await Promise.all([p.cover ? loadImage(p.cover.src) : null, ...shotSrcs.map(loadImage)]);
  const shots = new Map(shotSrcs.map((src, k) => [src, shotImgs[k]]));
  const cv = document.createElement('canvas');
  cv.width = ATLAS_W;
  cv.height = ATLAS_H;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#181616';
  g.fillRect(0, 0, ATLAS_W, ATLAS_H);
  for (const t of tiles) {
    const [c, r, cw] = t.rect;
    const w = cw * CELL_W;
    const cwid = cw > 1 ? CELL_H * wide : w;
    g.save();
    g.translate(c * CELL_W, r * CELL_H);
    g.scale(w / cwid, 1);
    drawTile(g, t, p, i, img, shots, 0, 0, cwid, CELL_H);
    g.restore();
  }
  return cv;
}
