import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigationType, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { gsap } from '@/lib/gsap';
import { clearHandoff, peekHandoff, type GlobePhase, type TileRects } from '@/lib/morph';
import { horizon } from '@/lib/horizon';
import { tilesFor } from '@/lib/tiles';
import { projects, projectPath } from '@/data/projects';
import { profile } from '@/data/profile';
import { hasWebGL } from '@/utils/motion';
import { useIsDesktop, useReducedMotion } from '@/hooks/useMediaQuery';
import { useIntro } from '@/app/intro';
import { DOME_IN, DOME_OUT, GLOBE_ARRIVE, GLOBE_LEAVE, domeAim } from '@/app/panel';
import { play } from '@/lib/sound';
import { ProjectTile } from '@/components/projects/ProjectTiles';
import { ProjectSheet, TagPill, type SheetFlight } from '@/components/home/ProjectSheet';
import { shortCat } from '@/lib/tiles';
import type { GlobeBridge, GlobeInput, TileBox } from '@/components/three/GlobeScene';

const GlobeScene = lazy(() => import('@/components/three/GlobeScene'));

const ticker = projects.map((p) => `${p.title} — ${p.focus}`);

/** A plain grid of every project: the list view, and the no-WebGL / reduced-motion fallback. */
function ProjectGrid() {
  return (
    <ul className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4 lg:p-4">
      {projects.map((p, i) => (
        <motion.li key={p.slug} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.04 * i, ease: [0.16, 1, 0.3, 1] }}>
          <Link to={projectPath(p.slug)} data-cursor="Open" className="group block">
            <div className="aspect-[4/3] overflow-hidden rounded-[6px]">
              <div className="h-full w-full transition-transform duration-700 ease-expo group-hover:scale-[1.04]">
                <ProjectTile project={p} index={i} kind={p.cover ? 'cover' : 'title'} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-4 px-1">
              <span className="font-display text-xl uppercase text-bone">{p.title}</span>
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-mute">{shortCat(p)}</span>
            </div>
          </Link>
        </motion.li>
      ))}
    </ul>
  );
}

/**
 * Home: the project globe fills the screen under the grid header. Drag or scroll to move over it;
 * hovering a cluster shows its tags by the pointer; clicking flies its tiles (in the globe's own
 * canvas) into a project sheet (`?project=slug`, so it can be linked and closed with Back), and
 * closing flies them back along the same path. Without WebGL or with reduced motion the same
 * projects show as a plain grid instead.
 */
export function GlobeHome() {
  const desktop = useIsDesktop();
  const reduced = useReducedMotion();
  const { ready } = useIntro();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  // arrived via the floating W globe button on a project page: fade/scale the globe in once
  const [fromButton] = useState(() => Boolean((location.state as { fromGlobeButton?: boolean } | null)?.fromGlobeButton));
  const navType = useNavigationType();
  const [webgl] = useState(() => typeof window !== 'undefined' && hasWebGL());
  const [view, setView] = useState<'globe' | 'list'>(() => (webgl && !reduced ? 'globe' : 'list'));
  const [hovered, setHovered] = useState<string | null>(null);
  /** `fly`: the sheet was opened by clicking a cluster, whose tiles wait on the globe to fly */
  const [sheet, setSheet] = useState<{ slug: string; fly: boolean } | null>(null);
  const [closing, setClosing] = useState(false);
  const [opened, setOpened] = useState(false); // the sheet's fly-in has landed
  // a project page closed with the W button: its tiles fly back into the globe (see `land`)
  const [landing, setLanding] = useState<{ slug: string; rects: TileRects } | null>(() => {
    const slug = (location.state as { globeReturn?: string } | null)?.globeReturn;
    const rects = peekHandoff(slug, 'toGlobe');
    return slug && rects ? { slug, rects } : null;
  });
  // the first visit grows the globe out of a small ball (the loader's, when it ran); coming back
  // (W button, Back) does not. A fresh page load is also a POP, but with the router's initial key.
  const [intro] = useState(() => !horizon.introDone && !landing && !fromButton && (navType !== 'POP' || location.key === 'default'));
  useEffect(() => { horizon.introDone = true; }, []);
  const landed = useRef(false);
  /*
   * The globe's navigation state. Only `universe` takes clicks on the globe; `opening` / `closing`
   * are the flights (globe <-> sheet, project page -> globe), `detail` is a sheet at rest, during
   * which the hidden globe stops rendering.
   */
  const phase: GlobePhase = landing ? 'closing' : !sheet ? 'universe' : closing ? 'closing' : opened ? 'detail' : 'opening';
  const wrap = useRef<HTMLDivElement>(null);
  const section = useRef<HTMLElement>(null);
  const pill = useRef<HTMLDivElement>(null);
  const latRef = useRef<HTMLSpanElement>(null);
  const lonRef = useRef<HTMLSpanElement>(null);
  const input = useRef<GlobeInput>({ dx: 0, dy: 0, wheel: 0, dragging: false, lastInput: 0 });
  const bridge = useRef<GlobeBridge | null>(null);
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const clicked = useRef<string | null>(null);
  const pushed = useRef(false);

  const wanted = params.get('project');
  const wantedValid = wanted && projects.some((p) => p.slug === wanted) ? wanted : null;

  // the URL drives the sheet: open when ?project= appears, fly back when it goes
  useEffect(() => {
    if (wantedValid && (!sheet || sheet.slug !== wantedValid)) {
      const fly = clicked.current === wantedValid && bridge.current?.selected() === wantedValid;
      setSheet({ slug: wantedValid, fly });
      setClosing(false);
      setOpened(false);
      clicked.current = null;
      setHovered(null);
    } else if (!wantedValid && sheet && !closing) {
      setClosing(true);
      play('close');
    }
  }, [wantedValid, sheet, closing]);

  // the coordinates readouts follow the view
  useEffect(() => {
    if (view !== 'globe' || sheet) return;
    let raf = 0;
    const tick = () => {
      if (latRef.current) latRef.current.textContent = ((-horizon.scroll / 40) % 90).toFixed(6);
      if (lonRef.current) lonRef.current.textContent = ((((((horizon.rot * 180) / Math.PI) % 360) + 540) % 360) - 180).toFixed(6);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [view, sheet]);

  const onHover = useCallback((slug: string | null) => {
    setHovered(slug);
    if (slug) play('tick');
  }, []);
  const onSelect = useCallback(
    (slug: string) => {
      clicked.current = slug;
      pushed.current = true;
      play('open');
      setParams({ project: slug });
    },
    [setParams],
  );
  const closeSheet = useCallback(() => {
    if (closing) return;
    if (pushed.current) {
      pushed.current = false;
      window.history.back(); // pops ?project= off, which closes the sheet
    } else {
      setParams({}, { replace: true });
    }
  }, [closing, setParams]);
  const onClosed = useCallback(() => {
    setSheet(null);
    setClosing(false);
    setOpened(false);
  }, []);
  const onOpened = useCallback(() => setOpened(true), []);
  const onLost = useCallback(() => setView('list'), []);

  // the sheet's boxes are in the window; the globe works in its canvas
  const toCanvas = useCallback((b: TileBox): TileBox => {
    const o = wrap.current?.getBoundingClientRect();
    return { x: b.x - (o?.left ?? 0), y: b.y - (o?.top ?? 0), w: b.w, h: b.h };
  }, []);
  const flight = useMemo<SheetFlight>(
    () => ({
      open: (rects, done) => {
        const br = bridge.current;
        if (!br) { done(); return; }
        br.open(rects.map(toCanvas), done);
      },
      close: (rects, done) => {
        const br = bridge.current;
        if (!br) { done(); return; }
        br.close(rects ? rects.map((r) => (r ? toCanvas(r) : null)) : null, done);
      },
    }),
    [toCanvas],
  );

  // project page -> globe: the copies of its tiles (left where they were on that page) hand over to
  // the canvas, which flies them back into one of the project's clusters
  const landingRef = useRef(landing);
  landingRef.current = landing;
  const finishLanding = useCallback((fade: boolean) => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-landing-tile]'));
    const end = () => { clearHandoff(); setLanding(null); };
    if (!fade || !els.length) { end(); return; }
    gsap.to(els, { opacity: 0, duration: 0.3, ease: 'power1.out', onComplete: end });
  }, []);
  const land = useCallback(() => {
    const l = landingRef.current;
    const br = bridge.current;
    if (!l || landed.current || !br) return;
    landed.current = true;
    const ok = br.land(l.slug, l.rects.map((r) => (r ? toCanvas(r) : null)), () => finishLanding(false), () => {});
    if (!ok) finishLanding(true);
  }, [finishLanding, toCanvas]);
  // no globe to land on (list view / WebGL lost), or it never came up: just let the copies go
  useEffect(() => {
    if (!landing) return;
    if (view !== 'globe' || reduced) { landed.current = true; finishLanding(true); return; }
    const t = window.setTimeout(() => { if (!landed.current) { landed.current = true; finishLanding(true); } }, 3500);
    return () => clearTimeout(t);
    // only when a landing starts or the view falls back
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, Boolean(landing)]);

  // the contact panel opens over home: it is see-through over its pitch column, so this globe is
  // what shows there, shrinking into the dome (its overlays step aside); when the panel closes it
  // grows back out to the full globe as the panel wipes away
  const [domed, setDomed] = useState(false);
  const domeTarget = useCallback(() => {
    const t = domeAim.get?.();
    if (!t) return null;
    const o = wrap.current?.getBoundingClientRect();
    return { x: t.x - (o?.left ?? 0), y: t.y - (o?.top ?? 0), s: t.s };
  }, []);
  useEffect(() => {
    const leave = () => {
      setDomed(true);
      setHovered(null);
      bridge.current?.aim(1, { duration: DOME_IN, tiles: 0, tileDelay: 0.15, tileDuration: 0.4 });
    };
    const arrive = () => {
      bridge.current?.aim(0, { duration: DOME_OUT, tiles: 1, tileDelay: 0.05, tileDuration: 0.5 });
      window.setTimeout(() => setDomed(false), 250);
    };
    window.addEventListener(GLOBE_LEAVE, leave);
    window.addEventListener(GLOBE_ARRIVE, arrive);
    return () => {
      window.removeEventListener(GLOBE_LEAVE, leave);
      window.removeEventListener(GLOBE_ARRIVE, arrive);
    };
  }, []);

  // wheel + keys move over the globe. The home page itself never scrolls.
  useEffect(() => {
    const el = wrap.current;
    if (!el || view !== 'globe') return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const i = input.current;
      i.wheel += e.deltaY;
      i.dx -= e.deltaX;
      i.lastInput = performance.now();
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (sheet || t?.closest('input, textarea, select, [role="dialog"]')) return;
      const i = input.current;
      const k = { ArrowLeft: [40, 0], ArrowRight: [-40, 0], ArrowUp: [0, 30], ArrowDown: [0, -30] }[e.key];
      if (!k) return;
      e.preventDefault();
      i.dx += k[0];
      i.dy += k[1];
      i.lastInput = performance.now();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    return () => { el.removeEventListener('wheel', onWheel); window.removeEventListener('keydown', onKey); };
  }, [view, sheet]);

  const pointer = {
    onPointerDown: (e: React.PointerEvent) => {
      drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (pill.current && e.pointerType !== 'touch') pill.current.style.transform = `translate3d(${e.clientX + 18}px, ${e.clientY + 22}px, 0)`;
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!input.current.dragging && Math.hypot(dx, dy) < 6) return;
      input.current.dragging = true;
      input.current.dx += dx;
      input.current.dy += dy;
      input.current.lastInput = performance.now();
      d.x = e.clientX;
      d.y = e.clientY;
    },
    onPointerUp: () => {
      drag.current = null;
      // let the click handler see "dragging" first
      requestAnimationFrame(() => { input.current.dragging = false; });
    },
  };
  const hoveredProject = hovered && !sheet ? projects.find((p) => p.slug === hovered) : null;
  const sheetIndex = sheet ? projects.findIndex((p) => p.slug === sheet.slug) : -1;

  return (
    <motion.section
      ref={section}
      aria-labelledby="home-title"
      className={`relative h-[calc(100svh-var(--bar-h)-1px)] min-h-[480px] overflow-hidden border-t bg-ink transition-colors duration-500 ${sheet && !closing ? "border-transparent" : "border-[var(--grid)]"}`}
      initial={!landing && fromButton && !reduced ? { opacity: 0, scale: 1.08 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      data-phase={phase}
      data-mode={view === 'globe' ? 'globe' : 'list'}
    >
      <h1 id="home-title" className="sr-only">{profile.name} — {profile.title}. Selected work.</h1>

      {view === 'globe' ? (
        <div
          ref={wrap}
          className="absolute inset-0 touch-none select-none"
          {...pointer}
          onPointerCancel={pointer.onPointerUp}
          onPointerLeave={pointer.onPointerUp}
        >
          <Suspense fallback={null}>
            {(
              <GlobeScene
                projects={projects}
                input={input}
                active={ready && phase !== 'detail'}
                aimAt={domeTarget}
                intro={intro}
                interactive={!sheet && !landing}
                priority={landing ? projects.findIndex((q) => q.slug === landing.slug) : -1}
                onReady={land}
                onLost={onLost}
                reduced={reduced}
                mobile={!desktop}
                bridge={bridge}
                onHover={onHover}
                onSelect={onSelect}
              />
            )}
          </Suspense>
          {/* coordinates of the view centre */}
          <p aria-hidden="true" className={`pointer-events-none absolute left-[var(--gutter)] top-8 font-mono text-[12px] tabular-nums text-mute/80 transition-opacity duration-500 md:top-[4.5rem] ${sheet || domed ? 'opacity-0' : ''}`}><span ref={latRef}>0.000000</span></p>
          <p aria-hidden="true" className={`pointer-events-none absolute right-[var(--gutter)] top-8 font-mono text-[12px] tabular-nums text-mute/80 transition-opacity duration-500 md:top-[4.5rem] ${sheet || domed ? 'opacity-0' : ''}`}><span ref={lonRef}>0.000000</span></p>
        </div>
      ) : (
        <div className="absolute inset-0 overflow-y-auto overscroll-contain pb-28" data-lenis-prevent>
          <ProjectGrid />
        </div>
      )}

      {/* hover: the project's tags run in a pill by the pointer */}
      {desktop && (
        <div ref={pill} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-30 w-[20rem]" style={{ transform: 'translate3d(-999px,-999px,0)' }}>
          <div className={hoveredProject ? 'opacity-100 transition-opacity duration-300' : 'opacity-0 transition-opacity duration-200'}>
            {hoveredProject && <TagPill key={hoveredProject.slug} project={hoveredProject} />}
          </div>
        </div>
      )}

      {sheet && sheetIndex >= 0 && (
        <ProjectSheet
          key={sheet.slug}
          project={projects[sheetIndex]}
          index={sheetIndex}
          flight={sheet.fly && view === 'globe' ? flight : null}
          origin={section}
          closing={closing}
          onClose={closeSheet}
          onClosed={onClosed}
          onOpened={onOpened}
        />
      )}

      {/* project page -> globe: its tiles, left exactly where they were, waiting to fly home */}
      {landing && (() => {
        const li = projects.findIndex((q) => q.slug === landing.slug);
        if (li < 0) return null;
        const lp = projects[li];
        return createPortal(
          <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[39]">
            {tilesFor(lp, li).map((t, n) => {
              const r = landing.rects[n];
              if (!r) return null;
              return (
                <div
                  key={n}
                  data-landing-tile
                  className="absolute overflow-hidden rounded-[8px] shadow-[0_30px_80px_rgba(0,0,0,0.55)] will-change-transform"
                  style={{ left: r.x, top: r.y, width: r.w, height: r.h }}
                >
                  <ProjectTile project={lp} index={li} kind={t.kind} shot={t.shot} eager />
                </div>
              );
            })}
          </div>,
          document.body,
        );
      })()}

      {/* keyboard / screen-reader route to every project */}
      {view === 'globe' && !sheet && (
        <nav aria-label="Projects" className="sr-only">
          <ul>{projects.map((p) => <li key={p.slug}><Link to={`/?project=${p.slug}`}>{p.title}</Link></li>)}</ul>
        </nav>
      )}

      {/* bottom bar: ticker pill */}
      <div className={`pointer-events-none absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 flex items-end justify-between gap-3 page-x transition-opacity duration-300 md:bottom-7 ${domed ? 'opacity-0' : ''}`}>
        {/* left slot kept empty so the ticker stays centred (the W globe button covers "back") */}
        <span />

        {!sheet && (
          <div className="marquee pointer-events-auto absolute bottom-0 left-1/2 hidden w-[min(36rem,40vw)] -translate-x-1/2 overflow-hidden rounded-[10px] border border-[var(--grid)] bg-ink/85 shadow-[inset_0_0_0_3px_rgb(var(--c-bg)),inset_0_0_0_4px_var(--grid)] backdrop-blur lg:block" aria-hidden="true">
            <div className="marquee-track flex h-12 shrink-0 items-center whitespace-nowrap" style={{ ['--marquee-duration' as string]: '60s' }}>
              {[0, 1].map((k) => (
                <span key={k} className="flex shrink-0">
                  {ticker.map((t) => (
                    <span key={t} className="px-4 font-mono text-[12px] font-bold uppercase tracking-[0.06em] text-bone">
                      <span className="mr-3 text-accent">•</span>{t}
                    </span>
                  ))}
                </span>
              ))}
            </div>
          </div>
        )}

      </div>
    </motion.section>
  );
}
