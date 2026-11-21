import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { gsap } from '@/lib/gsap';
import { projectPath, projects } from '@/data/projects';
import { useContactPanel } from '@/app/panel';
import { prefersReducedMotion } from '@/utils/motion';
import { LoopAbove, ProjectLoop, SheetPill } from '@/components/home/ProjectFeed';
import { nearestFeed } from '@/lib/feed';
import { MORPH_CLASS, T_VAR, foldAt, headerH, html, measureFold, setT } from '@/lib/headerFold';
import { usePaper } from '@/lib/paper';
import { GlobeButton } from '@/components/home/GlobeButton';
import { pad2, shortCat, tilesFor } from '@/lib/tiles';
import { handOff, tileRects } from '@/lib/morph';
import { preloadPath } from '@/app/routes';
import { ProjectTile } from '@/components/projects/ProjectTiles';
import type { TileBox } from '@/components/three/GlobeScene';
import type { Project } from '@/types/content';
import { cn } from '@/utils/cn';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { useGalleryCursor } from '@/components/projects/GalleryCursor';
import { SocialCell } from '@/components/layout/Header';


/** slim bar links (Home / About · Insta / Link) */
const barLink =
  'group relative flex h-11 items-center px-3 font-mono text-[13px] font-semibold uppercase tracking-[0.06em] text-bone transition-colors duration-300 hover:text-accent focus-visible:text-accent focus-visible:outline-none';

/**
 * Desktop: the opened project is the same bento grid as the feed below it, right under the
 * header — [wide, 1, 1] then [1, 1, wide]. Returns tile indices (they line up with the globe boxes).
 */
const gridRows = (tiles: { rect: readonly [number, number, number] }[]) => {
  const all = tiles.map((_, n) => n);
  const w = all.filter((n) => tiles[n].rect[2] > 1);
  const s = all.filter((n) => tiles[n].rect[2] === 1);
  return [[w[0], s[0], s[1]], [s[2], s[3], w[1]]].map((r) => r.filter((n) => n !== undefined));
};
/** the reference's sheet: 620 / 404 / 404 px of a 1536 px window, square rows, 16 px gaps, 38 px sides */
const GRID_COLS = ['grid-cols-[1.535fr_1fr_1fr]', 'grid-cols-[1fr_1fr_1.535fr]'];

/**
 * The globe's side of the flight (window px). `open` gets the sheet's tile boxes and calls back
 * once the canvas tiles have landed in them; `close` gets where the tiles are now (null: scrolled
 * out of sight) and calls back once they are home on the globe.
 */
export interface SheetFlight {
  open: (rects: TileBox[], done: () => void) => void;
  close: (rects: (TileBox | null)[] | null, done: () => void) => void;
}

/** A pill with the project's tags running through it. */
export function TagPill({ project: p, className }: { project: Project; className?: string }) {
  const tags = [...p.categories, ...(p.stack ?? []), p.focus];
  return (
    <div className={cn('marquee overflow-hidden rounded-[10px] border border-bone/25 bg-ink/80 shadow-[inset_0_0_0_3px_rgb(var(--c-bg)),inset_0_0_0_4px_rgb(var(--c-fg)/0.12)] backdrop-blur-md', className)}>
      <div className="marquee-track flex h-11 shrink-0 items-center whitespace-nowrap" style={{ ['--marquee-duration' as string]: '16s' }}>
        {[0, 1].map((k) => (
          <span key={k} className="flex shrink-0">
            {tags.map((t, j) => (
              <span key={`${t}-${j}`} className="px-2 font-mono text-[12px] font-bold uppercase tracking-[0.06em] text-bone">
                <span className="mr-3 text-bone/60">•</span>{t}
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * A project opened from the globe. Its tiles fly (in the globe's canvas, see `flight`) from where
 * they sat on the globe into a bento grid under the header, and the details slide up underneath. The sheet covers the
 * whole window (portalled to <body>) with the site header showing through its top: scrolling
 * folds the header into a pill (its box closes in, the name and CTA slide onto the pill's) and the
 * slim bar (Home / About · pill · Insta / Link) takes over until you are back near the top. Hovering tiles runs the project's tags in
 * a pill by the pointer; a click pins the story card to it (shared GalleryCursor). Setting
 * `closing` flies the tiles back onto the globe, then `onClosed`.
 */
export function ProjectSheet({
  project: p,
  index,
  flight,
  origin,
  closing,
  onClose,
  onClosed,
  onOpened,
}: {
  project: Project;
  index: number;
  /** the clicked cluster's tiles fly in from the globe (null: the sheet just fades in) */
  flight: SheetFlight | null;
  /** the globe's box: the sheet lines up with it */
  origin: RefObject<HTMLElement | null>;
  closing: boolean;
  onClose: () => void;
  onClosed: () => void;
  /** the fly-in has landed */
  onOpened?: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const bg = useRef<HTMLDivElement>(null);
  const details = useRef<HTMLDivElement>(null);
  const rest = useRef<HTMLDivElement>(null);
  const above = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  // the feed above the project goes in once the fly-in has landed (see LoopAbove)
  const [upOn, setUpOn] = useState(false);
  /** scroll position of the project's own top (the feed above it pushes it down) */
  const headTop = () => head.current?.offsetTop ?? 0;
  /** the header folds with the distance from the project's top, up or down */
  const foldNow = () => foldAt(Math.abs((scroller.current?.scrollTop ?? 0) - headTop()));
  const items = useRef<(HTMLLIElement | null)[]>([]);
  const desktop = useIsDesktop();
  const gc = useGalleryCursor(p);
  const tiles = tilesFor(p, index);
  const rows = gridRows(tiles);
  const { open: panelOpen, setOpen } = useContactPanel();
  // where the globe box sits in the window (the stage lines up with it exactly)
  const measure = () => {
    const el = origin.current;
    if (!el) return { left: 0, top: headerH(), height: Math.max(480, window.innerHeight - headerH()) };
    const r = el.getBoundingClientRect();
    return { left: r.left + el.clientLeft, top: r.top + el.clientTop, height: el.clientHeight };
  };
  const [box, setBox] = useState(measure);
  const parked = useRef(false); // header pulled back in for the contact panel
  const closingRef = useRef(false);
  const [current, setCurrent] = useState(index);
  const [pillOn, setPillOn] = useState(false);
  const [foldOn, setFoldOn] = useState(false); // the fold has started: corner links stay up
  // the feed: every other project, then all of them (this one first) on a loop
  const [feed] = useState(() => Array.from({ length: projects.length - 1 }, (_, k) => (index + 1 + k) % projects.length));
  const [loop] = useState(() => projects.map((_, k) => (index + k) % projects.length));
  // paper motion on every tile (after the fly-in has landed; flattened while flying back)
  usePaper(root, { scroller, delay: 1.7, paused: closingRef });

  // pill visibility + current section tracking
  useEffect(() => {
    const sc = scroller.current;
    if (!sc) return;
    const onScroll = () => {
      if (closingRef.current || parked.current) return;
      // the header folds into the pill as the content scrolls; the pill takes over at the end
      const t = foldNow();
      setT(t);
      setPillOn(t >= 0.9); // persists up/down; only the top part unfolds it
      setFoldOn(t > 0.03);
      const mid = sc.getBoundingClientRect().top + sc.clientHeight * 0.4;
      let cur = index;
      sc.querySelectorAll<HTMLElement>('[data-feed]').forEach((el) => {
        if (el.getBoundingClientRect().top <= mid) cur = Number(el.dataset.feed);
      });
      setCurrent(cur);
    };
    sc.addEventListener('scroll', onScroll, { passive: true });
    // the header sits above the sheet: wheeling over it scrolls the sheet
    const onWheel = (e: WheelEvent) => {
      if (closingRef.current || parked.current || !(e.target as Element | null)?.closest?.('header')) return;
      e.preventDefault();
      sc.scrollTop += e.deltaY;
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    const onResize = () => { setBox(measure()); measureFold(); };
    window.addEventListener('resize', onResize);
    return () => {
      sc.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // the header folds into the pill while the sheet is up, and comes home when it goes away
  useLayoutEffect(() => {
    measureFold();
    html().classList.add(MORPH_CLASS);
    return () => {
      gsap.killTweensOf(html());
      html().classList.remove(MORPH_CLASS);
      html().style.removeProperty(T_VAR);
    };
  }, []);

  // contact panel from the pill: bring the header back first (the panel hangs under it and its
  // CTA closes it), then open; when the panel closes, the header goes back where it was
  const startProject = () => {
    parked.current = true;
    setPillOn(false);
    setFoldOn(false);
    if (prefersReducedMotion()) { setT(0); setOpen(true); return; }
    gsap.to(html(), { [T_VAR]: 0, duration: 0.5, ease: 'power3.inOut', onComplete: () => setOpen(true) });
  };
  const wasOpen = useRef(false);
  useEffect(() => {
    if (panelOpen) { wasOpen.current = true; parked.current = true; return; }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    const sc = scroller.current;
    if (!sc || closingRef.current) { parked.current = false; return; }
    const reduce = prefersReducedMotion();
    gsap.to(html(), {
      [T_VAR]: foldNow(),
      duration: reduce ? 0 : 0.6,
      delay: reduce ? 0 : 0.35,
      ease: 'power3.inOut',
      onComplete: () => { parked.current = false; setPillOn(foldNow() >= 0.9); setFoldOn(foldNow() > 0.03); },
    });
    // foldNow only reads refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelOpen]);

  const goTo = (i: number) => {
    const sc = scroller.current;
    if (!sc) return;
    // nearest copy in the loop, up or down; this project's own tiles count as one more copy
    const el = nearestFeed(i, sc);
    if (!el) return;
    const top = el.hasAttribute('data-sheet-head') ? headTop() : el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 96;
    sc.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  // "Full case study" morphs straight into the project page: have its code ready by then
  useEffect(() => { preloadPath(projectPath(p.slug)); }, [p.slug]);

  const boxOf = (li: HTMLElement): TileBox => {
    const r = li.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  };

  // fly in: the globe's canvas carries the tiles into these boxes; the page's own tiles show once
  // they have landed (the canvas has them pixel for pixel under them by then)
  useLayoutEffect(() => {
    const host = root.current;
    if (!host) return;
    const lis = items.current.filter(Boolean) as HTMLLIElement[];
    let alive = true;
    const ctx = gsap.context(() => {
      gsap.fromTo(details.current, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.9, delay: desktop ? 1.1 : 0.75, ease: 'expo.out' });
      if (flight && lis.length === tiles.length) {
        gsap.set(lis, { opacity: 0 });
        gsap.set(bg.current, { opacity: 0 });
        flight.open(lis.map(boxOf), () => {
          if (!alive) return;
          // the page's tiles take over from the canvas's (drawn differently): a short crossfade, no pop
          gsap.to(lis, { opacity: 1, duration: 0.3, ease: 'power1.out' });
          gsap.to(bg.current, { opacity: 1, duration: 0.5, ease: 'power1.out' });
          gsap.delayedCall(0.6, () => setUpOn(true));
          onOpened?.();
        });
      } else {
        gsap.fromTo(lis, { opacity: 0, y: 60, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 1, stagger: 0.07, ease: 'expo.out' });
        gsap.fromTo(bg.current, { opacity: 0 }, { opacity: 1, duration: 0.5 });
        gsap.delayedCall(1.1, () => onOpened?.());
        gsap.delayedCall(1.7, () => setUpOn(true));
      }
    }, host);
    scroller.current?.focus({ preventScroll: true });
    return () => { alive = false; ctx.revert(); };
    // run once per opened project
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.slug]);

  // fly back: the canvas takes the tiles from wherever they are now and runs the flight backwards
  useEffect(() => {
    if (!closing) return;
    const host = root.current;
    if (!host) { onClosed(); return; }
    closingRef.current = true;
    setPillOn(false);
    setFoldOn(false);
    const lis = items.current.filter(Boolean) as HTMLLIElement[];
    // closing can interrupt the fly-in (Back pressed mid-flight): stop it where it is
    gsap.killTweensOf([...lis, details.current, bg.current]);
    const tl = gsap.timeline();
    gsap.killTweensOf(html());
    tl.to(html(), { [T_VAR]: 0, duration: 0.6, ease: 'power3.inOut' }, 0);
    tl.to(details.current, { opacity: 0, y: 30, duration: 0.3, ease: 'power2.in' }, 0);
    tl.to([rest.current, above.current], { opacity: 0, duration: 0.35, ease: 'power2.in' }, 0);
    if (flight && lis.length === tiles.length) {
      const vis = lis.map((li) => {
        const b = boxOf(li);
        return b.y + b.h < 0 || b.y > window.innerHeight ? null : b;
      });
      gsap.set(lis, { opacity: 0 });
      tl.to(bg.current, { opacity: 0, duration: 0.25, ease: 'power1.out' }, 0);
      flight.close(vis, onClosed);
    } else {
      tl.to(bg.current, { opacity: 0, duration: 0.7, ease: 'power2.inOut' }, 0.15);
      tl.to(lis, { opacity: 0, y: 30, duration: 0.45, stagger: 0.04, ease: 'power2.in' }, 0);
      tl.eventCallback('onComplete', onClosed);
    }
    return () => { tl.kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing]);

  // Escape closes (unless it is closing the contact panel, or a menu / pinned card handled it)
  const panelRef = useRef(panelOpen);
  panelRef.current = panelOpen;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || panelRef.current || parked.current) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const story = p.summary ?? p.focus;

  const barOn = pillOn && !closing && !panelOpen;
  // Home / About · Insta / Link take over from the header's corner cells as soon as it starts folding
  const linksOn = foldOn && !closing && !panelOpen;
  return createPortal(
    <>
    <div ref={root} className="fixed inset-0 z-[39]" role="dialog" aria-modal="false" aria-labelledby="sheet-title">
      <div ref={bg} aria-hidden="true" className="absolute inset-x-0 bottom-0 bg-ink opacity-0" style={{ top: box.top }} />
      <div ref={scroller} tabIndex={-1} data-lenis-prevent className="absolute inset-0 overflow-y-auto overscroll-contain outline-none [overflow-anchor:none]">
        {/* scrolling up past the project: the loop carries on that way too */}
        <div ref={above}><LoopAbove loop={loop} scroller={scroller} ready={upOn && !closing} className="pb-[18vh]" /></div>
        {/* the site header shows through here (it sits above the sheet) and scrolls away with it */}
        <div ref={head} aria-hidden="true" style={{ height: box.top }} />
        {desktop ? (
          <div data-feed={index} data-sheet-head="" className="px-[2.47vw] pt-[1.1vw]">
            <p id={`sheet-gc-${p.slug}`} className="sr-only">{gc.srText}</p>
            <div
              {...(closing ? {} : gc.bind)}
              aria-describedby={`sheet-gc-${p.slug}`}
              className={cn('flex cursor-none select-none flex-col gap-[1.04vw]', closing && 'pointer-events-none')}
            >
              {rows.map((row, r) => (
                <ul key={r} className={cn('grid gap-[1.04vw]', GRID_COLS[r % 2])}>
                  {row.map((n) => {
                    const t = tiles[n];
                    return (
                      <li
                        key={n}
                        ref={(el) => { items.current[n] = el; }}
                        data-tile={n}
                        data-paper
                        className={cn('rounded-[8px] will-change-transform', t.rect[2] > 1 ? 'h-full' : 'aspect-square')}
                      >
                        <div data-paper-sheet className="h-full w-full overflow-hidden rounded-[8px] will-change-transform">
                          <div data-paper-media className="h-full w-full"><ProjectTile project={p} index={index} kind={t.kind} shot={t.shot} eager /></div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ))}
            </div>
          </div>
        ) : (
          <div data-feed={index} data-sheet-head="" className="p-2">
            <ul {...(closing ? {} : gc.bind)} className={cn('grid select-none grid-cols-2 gap-2', closing && 'pointer-events-none')}>
              {tiles.map((t, n) => (
                <li
                  key={n}
                  ref={(el) => { items.current[n] = el; }}
                        data-tile={n}
                  data-paper
                  className={cn('rounded-[8px] will-change-transform', t.rect[2] > 1 ? 'col-span-2 aspect-[2/1]' : 'aspect-square')}
                >
                  <div data-paper-sheet className="h-full w-full overflow-hidden rounded-[8px] will-change-transform">
                    <div data-paper-media className="h-full w-full"><ProjectTile project={p} index={index} kind={t.kind} shot={t.shot} eager /></div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div ref={rest} className="relative">
        <div ref={details} className="grid gap-10 page-x pb-20 pt-12 lg:grid-cols-12 lg:px-12 lg:pt-16">
          <div className="lg:col-span-7">
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-mute">{pad2(index)} — {shortCat(p)}{p.year ? ` · ${p.year}` : ''}</p>
            <h2 id="sheet-title" className="mt-5 font-serif text-[clamp(3rem,7vw,7.5rem)] font-normal leading-[0.92] tracking-[-0.01em] text-bone">{p.title}</h2>
          </div>
          <div className="flex flex-col gap-8 lg:col-span-5 lg:pt-10">
            <p className="text-[clamp(1.1rem,1.4vw,1.4rem)] leading-[1.45] text-bone/85">{story}</p>
            {p.stack?.length ? (
              <ul className="flex flex-wrap gap-2">
                {p.stack.map((s) => <li key={s} className="rounded-full border border-bone/25 px-3 py-1 font-mono text-[12px] text-bone/80">{s}</li>)}
              </ul>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Link to={projectPath(p.slug)} onClick={() => { if (root.current) handOff(p.slug, 'toDetail', tileRects(root.current, tiles.length)); }} className="group inline-flex h-14 items-center gap-3 bg-lime px-6 font-serif text-[1.35rem] text-onfill transition-[filter] hover:brightness-110">
                Full case study
                <ArrowUpRight className="h-5 w-5 transition-transform duration-500 ease-expo group-hover:rotate-45" aria-hidden="true" />
              </Link>
              {p.liveUrl && (
                <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-14 items-center gap-3 border border-bone/30 px-6 font-serif text-[1.35rem] text-bone transition-colors hover:border-bone">
                  Visit live site <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
              <button type="button" onClick={onClose} className="inline-flex h-14 items-center px-2 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-mute transition-colors hover:text-bone">
                ← Back to globe
              </button>
            </div>
          </div>
        </div>

        <ProjectLoop head={feed} loop={loop} scroller={scroller} className="pb-[18vh] pt-[18vh]" />
        </div>
      </div>

      <GlobeButton onClick={onClose} hidden={closing} />
    </div>

    {/* slim bar: takes over from the header once it has scrolled away */}
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[41]">
      <div aria-hidden="true" className={cn('absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink via-ink/75 to-transparent transition-opacity duration-500', barOn ? 'opacity-100' : 'opacity-0')} />
      <nav aria-label="Site" className={cn('absolute left-3 top-3 hidden items-center transition-[opacity,transform] duration-500 ease-expo lg:top-4 lg:flex lg:h-[58px]', linksOn ? 'pointer-events-auto translate-y-0 opacity-100' : '-translate-y-4 opacity-0')}>
        <NavLink to="/" end tabIndex={linksOn ? 0 : -1} className={barLink}>Home</NavLink>
        <NavLink to="/about" tabIndex={linksOn ? 0 : -1} className={barLink}>About</NavLink>
      </nav>
      <div className={cn('absolute right-3 top-3 hidden items-center transition-[opacity,transform] duration-500 ease-expo lg:top-4 lg:flex lg:h-[58px]', linksOn ? 'pointer-events-auto translate-y-0 opacity-100' : '-translate-y-4 opacity-0')}>
        <SocialCell label="Insta" platform="instagram" title="Instagram" className={barLink} tabIndex={linksOn ? 0 : -1} />
        <SocialCell label="Link" platform="linkedin" title="LinkedIn" className={barLink} tabIndex={linksOn ? 0 : -1} />
      </div>
      <SheetPill visible={barOn} current={current} onPick={goTo} onStart={startProject} fade />
    </div>
    </>,
    document.body,
  );
}
