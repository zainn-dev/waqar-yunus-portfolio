import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Project, ProjectImage } from '@/types/content';
import { huesFor, pad2, shortCat, stackOf, type TileKind } from '@/lib/tiles';

/**
 * DOM versions of the globe tiles (same colours, same content), used in the project gallery
 * and the list view. Each fills its parent. `fluid` sizes the type to the tile itself (container
 * units) instead of the viewport, for tiles shown at very different sizes (the project collage).
 */
export function ProjectTile({ project: p, index: i, kind, shot, eager = false, fluid = false }: { project: Project; index: number; kind: TileKind; shot?: ProjectImage; eager?: boolean; fluid?: boolean }) {
  if (fluid && kind !== 'shot' && !((kind === 'cover' || kind === 'zoom') && p.cover)) {
    return (
      <div className="h-full w-full [container-type:size]">
        <ProjectTileInner project={p} index={i} kind={kind} shot={shot} eager={eager} fluid />
      </div>
    );
  }
  return <ProjectTileInner project={p} index={i} kind={kind} shot={shot} eager={eager} fluid={false} />;
}

/**
 * A muted, looping preview video for a tile. Nothing is downloaded until the tile is near the
 * window (preload="none" + the poster), it plays only while at least a quarter of it is visible and
 * pauses off-screen; with reduced motion it stays on the poster. A blocked autoplay just leaves
 * the poster.
 */
function TileVideo({ video, label }: { video: { src: string; poster: string }; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.25 },
    );
    io.observe(v);
    return () => { io.disconnect(); v.pause(); };
  }, []);
  return (
    <div className="relative h-full w-full overflow-hidden bg-ink-3">
      <video ref={ref} src={video.src} poster={video.poster} muted loop playsInline preload="none" aria-label={label} className="h-full w-full object-cover" />
    </div>
  );
}

/** the picture is already decoded in the browser's memory cache (a copy of a tile seen before): no fade */
const cached = (src?: string) => {
  if (!src || typeof Image === 'undefined') return false;
  const im = new Image();
  im.src = src;
  return im.complete && im.naturalWidth > 0;
};

function ProjectTileInner({ project: p, index: i, kind, shot, eager, fluid }: { project: Project; index: number; kind: TileKind; shot?: ProjectImage; eager: boolean; fluid: boolean }) {
  const fz = (f: string, n: string) => (fluid ? f : n);
  const { a, b } = huesFor(i);
  const [loaded, setLoaded] = useState(() => cached(kind === 'shot' ? shot?.src : p.cover?.src));
  const box = `relative flex h-full w-full flex-col justify-between overflow-hidden ${fz('p-[7cqmin]', 'p-[clamp(0.9rem,1.6vw,1.6rem)]')}`;
  const lbl = `font-mono ${fz('text-[clamp(8px,4.6cqmin,11px)]', 'text-[11px]')} font-bold uppercase tracking-[0.06em]`;

  if (kind === 'shot' && shot) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-ink-3">
        <img src={shot.src} alt={shot.alt} width={shot.width} height={shot.height} loading={eager ? 'eager' : 'lazy'} decoding="async" onLoad={() => setLoaded(true)} ref={(el) => { if (el?.complete && el.naturalWidth) setLoaded(true); }} className={`h-full w-full object-cover object-top transition-opacity duration-700 ease-out ${loaded ? 'opacity-100' : 'opacity-0'}`} />
      </div>
    );
  }

  if (kind === 'cover' && p.previewVideo) return <TileVideo video={p.previewVideo} label={p.cover?.alt ?? `${p.title} preview`} />;

  if ((kind === 'cover' || kind === 'zoom') && p.cover) {
    const zoom: CSSProperties = kind === 'zoom' ? { transform: 'scale(1.9)', transformOrigin: p.coverZoom ? `${p.coverZoom.x * 100}% ${p.coverZoom.y * 100}%` : '6% 22%' } : {};
    return (
      <div className="relative h-full w-full overflow-hidden bg-ink-3">
        <img src={p.cover.src} alt={kind === 'cover' ? p.cover.alt : ''} width={p.cover.width} height={p.cover.height} loading={eager ? 'eager' : 'lazy'} decoding="async" onLoad={() => setLoaded(true)} ref={(el) => { if (el?.complete && el.naturalWidth) setLoaded(true); }} className={`h-full w-full object-cover transition-opacity duration-700 ease-out ${loaded ? 'opacity-100' : 'opacity-0'}`} style={zoom} />
      </div>
    );
  }

  switch (kind) {
    case 'title':
    case 'cover':
    case 'zoom':
      return (
        <div className={box} style={{ background: a.bg, color: a.ink }}>
          <span className={lbl}>{pad2(i)} — {shortCat(p)}</span>
          <span className={`font-display ${fz('text-[15cqh]', 'text-[clamp(2.2rem,5.4vw,6rem)]')} font-bold uppercase leading-[0.9]`}>{p.title}</span>
        </div>
      );
    case 'num':
      return (
        <div className={box} style={{ background: b.bg, color: b.ink }}>
          <span className={`${lbl} flex justify-between`}><span>Project</span><span>{p.year ?? 'WY.'}</span></span>
          <span className={`-mb-[0.12em] -ml-[0.04em] font-display ${fz('text-[74cqh]', 'text-[clamp(6rem,14vw,14rem)]')} font-bold leading-[0.8]`}>{pad2(i)}</span>
        </div>
      );
    case 'stack':
      return (
        <div className={`${box} justify-start gap-4 bg-ink-2 text-bone`}>
          <span className={`${lbl} text-mute`}>Stack</span>
          <ul className="flex flex-wrap gap-2">
            {stackOf(p).map((s) => <li key={s} className={`rounded-full border border-bone/40 px-3 py-1 font-mono ${fz('text-[clamp(8px,5cqmin,12px)]', 'text-[12px]')}`}>{s}</li>)}
          </ul>
          <span className="mt-auto block h-1.5 w-9" style={{ background: a.bg }} />
        </div>
      );
    case 'focus':
      return (
        <div className={box} style={{ background: '#FFFDDB', color: '#181616' }}>
          <span className={lbl}>Focus</span>
          <span className={`font-serif ${fz('text-[11cqmin]', 'text-[clamp(1.6rem,2.6vw,2.75rem)]')} italic leading-[1.02]`}>{p.focus}</span>
        </div>
      );
    case 'glyph':
      return (
        <div className={`${box} bg-ink-3`}>
          <span aria-hidden="true" className="absolute right-[12%] top-1/2 aspect-square h-[80%] -translate-y-1/2 rounded-full" style={{ background: a.bg }}>
            <span className="absolute inset-[31%] rounded-full bg-ink-3" />
          </span>
          <span />
          <span aria-hidden="true" className={`relative font-display ${fz('text-[95cqh]', 'text-[clamp(7rem,16vw,16rem)]')} font-bold leading-[0.78] text-bone`}>{p.title[0]}</span>
        </div>
      );
    case 'pattern':
    default:
      return (
        <div
          aria-hidden="true"
          className="h-full w-full"
          style={{ background: `radial-gradient(circle at 30% 70%, ${b.ink} 0 3px, transparent 3.5px) 0 0 / 22px 22px, ${b.bg}` }}
        />
      );
  }
}
