import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useLenis } from '@/hooks/useLenis';
import { Link } from 'react-router-dom';
import { projects, projectsByGroup } from '@/data/projects';
import { pad2, shortCat, tilesFor, type Tile } from '@/lib/tiles';
import { ProjectTile } from '@/components/projects/ProjectTiles';
import { prefersReducedMotion } from '@/utils/motion';
import { cn } from '@/utils/cn';
import { inkFollow } from '@/utils/inkFollow';
import { Logo } from '@/components/ui/Brand';
import { LiquidFill } from '@/components/ui/LiquidFill';
import { useGalleryCursor } from '@/components/projects/GalleryCursor';

/** Six tiles as two editorial rows of three: [wide, 1, 1] then [1, 1, wide]. */
function rowsOf(tiles: Tile[]) {
  const wide = tiles.filter((t) => t.rect[2] > 1);
  const single = tiles.filter((t) => t.rect[2] === 1);
  return [
    [wide[0], single[0], single[1]],
    [single[2], single[3], wide[1]],
  ].map((r) => r.filter(Boolean));
}

const ROW_COLS = ['lg:grid-cols-[1.55fr_1fr_1fr]', 'lg:grid-cols-[1fr_1fr_1.55fr]'];

/**
 * One project's gallery: two rows of three rounded tiles with unequal widths. Real screenshots
 * where the project has them; otherwise the generated title / number / stack / focus tiles.
 */
export function ProjectGallery({
  i,
  eager = false,
  caption = true,
  scrollRoot,
}: {
  i: number;
  eager?: boolean;
  caption?: boolean;
  scrollRoot?: boolean;
}) {
  const p = projects[i];
  const tiles = tilesFor(p, i);
  const rows = rowsOf(tiles);
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(eager);
  const gc = useGalleryCursor(p);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const root = scrollRoot ? el.closest<HTMLElement>('[data-lenis-prevent]') : null;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { root, rootMargin: '20% 0px 20% 0px', threshold: 0.02 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, scrollRoot]);

  let n = 0;
  return (
    <section ref={ref} data-feed={i} aria-label={`${p.title} gallery`} aria-describedby={`gc-${p.slug}-${i}`} className="px-2 lg:px-12">
      <p id={`gc-${p.slug}-${i}`} className="sr-only">{gc.srText}</p>
      {caption && (
        <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-mute lg:mb-4 lg:text-[12px]">
          {pad2(i)} — {shortCat(p)} · <span className="text-bone">{p.title}</span>
        </p>
      )}
      <div {...gc.bind} className="flex cursor-none select-none flex-col gap-2 lg:gap-5">
        {rows.map((row, r) => (
          <ul key={r} className={cn('grid grid-cols-2 gap-2 lg:gap-5', ROW_COLS[r % 2])}>
            {row.map((t) => {
              const k = n++;
              const wide = t.rect[2] > 1;
              return (
                <li
                  key={k}
                  data-paper
                  data-tile={tiles.indexOf(t)}
                  className={cn(
                    'rounded-[8px] transition-[opacity,transform] duration-[900ms] ease-expo lg:h-[calc((100vw-96px)/3.6)] lg:min-h-[220px] lg:aspect-auto',
                    wide ? 'col-span-2 aspect-[16/9] lg:col-span-1' : 'aspect-square',
                    shown ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0',
                  )}
                  style={{ transitionDelay: `${k * 70}ms` }}
                >
                  {/* sheet: bent by the paper motion (lib/paper); media: scales + drifts on hover */}
                  <div data-paper-sheet className="h-full w-full overflow-hidden rounded-[8px] will-change-transform">
                    <div data-paper-media className="h-full w-full">
                      <ProjectTile project={p} index={i} kind={t.kind} shot={t.shot} eager={eager} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ))}
      </div>
    </section>
  );
}

/** most cycles kept in the DOM; the extra ones are recycled once they are well off screen */
const MAX_BLOCKS = 4;
type Block = { id: number; order: number[] };

/**
 * The never-ending project feed, both ways: `head` first, then `loop` over and over, galleries
 * separated by griflan-style big gaps.
 * - Down: a sentinel ~3 screens below the end appends the next cycle before you can see the end.
 * - Up (`both`): once you have scrolled (half a screen), a cycle is put in above whenever less than two
 *   screens of feed are left above the window, and the scroll moves down by exactly its height in
 *   the same frame (before paint), so nothing on screen moves and there is no top to hit.
 * - With more than MAX_BLOCKS cycles, the one furthest off screen is dropped while the scroll is
 *   idle (above: the scroll moves up by its height; below: nothing to move).
 * Scroll anchoring is off for the feed: these shifts are made by hand, and the browser's own
 * would double them.
 *
 * `scroller`: the element that scrolls (the project sheet); omitted = the window (+ Lenis).
 * `both`: loop upward too, where the feed is the top of the page (the project page). The sheet
 * has its project's tiles and details above the feed: it loops upward with LoopAbove instead.
 */
export function ProjectLoop({ head, loop, scroller, eagerFirst = false, both = false, className }: { head: number[]; loop: number[]; scroller?: RefObject<HTMLElement | null>; eagerFirst?: boolean; both?: boolean; className?: string }) {
  const lenis = useLenis();
  const [blocks, setBlocks] = useState<Block[]>(() => [{ id: 0, order: head }, { id: 1, order: loop }]);
  const box = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const nextId = useRef(2);
  /** scroll correction owed after the next commit: + content went in above, − content came out */
  const shift = useRef<{ kind: 'add' | 'cut'; px: number } | null>(null);
  const armed = useRef(false);
  const count = useRef(blocks.length);
  count.current = blocks.length;

  // append the next cycle well before the end comes into view (re-armed after every change)
  useEffect(() => {
    const s = sentinel.current;
    if (!s) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setBlocks((b) => [...b, { id: nextId.current++, order: loop }]); },
      { root: scroller?.current ?? null, rootMargin: '0px 0px 300% 0px' },
    );
    io.observe(s);
    return () => io.disconnect();
  }, [blocks.length, loop, scroller]);

  useEffect(() => {
    const target: HTMLElement | Window = scroller?.current ?? window;
    const pos = () => scroller?.current ? scroller.current.scrollTop : window.scrollY;
    const viewTop = () => scroller?.current ? scroller.current.getBoundingClientRect().top : 0;
    const viewH = () => scroller?.current ? scroller.current.clientHeight : window.innerHeight;
    let timer = 0;

    // up: keep two screens of feed above the window at all times (checked on every scroll event)
    const ahead = () => {
      if (!both) return;
      if (!armed.current && pos() > viewH() * 0.5) armed.current = true;
      const el = box.current;
      if (!armed.current || !el || shift.current) return;
      const first = el.firstElementChild as HTMLElement | null;
      if (!first || first.getBoundingClientRect().top - viewTop() < -viewH() * 2) return;
      shift.current = { kind: 'add', px: 0 };
      setBlocks((b) => [{ id: nextId.current++, order: loop }, ...b]);
    };

    // idle: recycle the cycle furthest off screen
    const check = () => {
      const el = box.current;
      if (!el || count.current <= MAX_BLOCKS || shift.current) return;
      const kids = Array.from(el.children) as HTMLElement[];
      const [first, second] = kids;
      const last = kids[kids.length - 1];
      if (!first || !second || !last) return;
      const top = viewTop();
      const h = viewH();
      const aboveGap = top - second.getBoundingClientRect().top; // how far the 2nd cycle starts above the window
      const belowGap = last.getBoundingClientRect().top - (top + h); // how far the last cycle starts below it
      if (aboveGap >= h && aboveGap >= belowGap) {
        shift.current = { kind: 'cut', px: second.offsetTop - first.offsetTop };
        setBlocks((b) => b.slice(1));
      } else if (belowGap >= h * 2) {
        setBlocks((b) => b.slice(0, -1));
      }
    };
    const onScroll = () => { ahead(); window.clearTimeout(timer); timer = window.setTimeout(check, 280); };
    target.addEventListener('scroll', onScroll, { passive: true });
    check();
    return () => { window.clearTimeout(timer); target.removeEventListener('scroll', onScroll); };
  }, [scroller, blocks.length, loop, both]);

  // …and move the scroll by exactly what went in or came out above, before the browser paints
  useLayoutEffect(() => {
    const s = shift.current;
    if (!s) return;
    shift.current = null;
    let h = s.px;
    if (s.kind === 'add') {
      const [first, second] = Array.from(box.current?.children ?? []) as HTMLElement[];
      if (!first || !second) return;
      h = second.offsetTop - first.offsetTop;
    } else {
      h = -h;
    }
    const sc = scroller?.current;
    if (sc) { sc.scrollTop += h; return; }
    if (lenis) {
      // a scroll still gliding keeps gliding: where it is and where it is going both move by h.
      // resize() re-reads the page height (the limit) and syncs Lenis to the new position; the
      // glide resumes as a wheel-style scroll, so the wheel ticks still to come add to its target
      const moving = lenis.isScrolling === 'smooth' && Math.abs(lenis.targetScroll - lenis.animatedScroll) > 0.5;
      const to = Math.max(0, lenis.targetScroll + h);
      window.scrollTo(0, Math.max(0, lenis.animatedScroll + h));
      lenis.resize();
      if (moving) {
        const { lerp, duration, easing } = lenis.options;
        lenis.scrollTo(to, { programmatic: false, lerp, duration, easing, force: true });
      }
      return;
    }
    window.scrollTo(0, Math.max(0, window.scrollY + h));
  }, [blocks, scroller, lenis]);

  return (
    <div className={cn('[overflow-anchor:none]', className)}>
      <div ref={box} className="flex flex-col gap-[18vh]">
        {blocks.map((b) => (
          <div key={b.id} className="flex flex-col gap-[18vh]">
            {b.order.map((i, k) => (
              <ProjectGallery key={`${b.id}-${projects[i].slug}`} i={i} eager={eagerFirst && b.id === 0 && k === 0} scrollRoot={!!scroller} />
            ))}
          </div>
        ))}
      </div>
      <div ref={sentinel} aria-hidden="true" className="h-px" />
    </div>
  );
}

/**
 * The sheet's feed upward: cycles of `loop` stacked above the opened project, so scrolling up from
 * the top never stops either (ProjectLoop carries on below it). Once `ready` (after the fly-in has
 * landed), a cycle goes in whenever less than two screens of it are left above the window, and the
 * scroll moves down by exactly its height before paint, so nothing on screen moves. Cycles that end
 * up far below the window (you kept going up) are dropped; that changes nothing above them.
 * The scroller must have scroll anchoring off (it would double the shift).
 */
export function LoopAbove({ loop, scroller, ready, className }: { loop: number[]; scroller: RefObject<HTMLElement | null>; ready: boolean; className?: string }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  const owed = useRef(false);
  const count = useRef(0);
  count.current = blocks.length;

  useEffect(() => {
    const sc = scroller.current;
    if (!ready || !sc) return;
    let timer = 0;
    const ahead = () => {
      const el = box.current;
      if (!el || owed.current) return;
      const top = (el.firstElementChild ?? el).getBoundingClientRect().top - sc.getBoundingClientRect().top;
      if (top < -sc.clientHeight * 2) return;
      owed.current = true;
      setBlocks((b) => [{ id: nextId.current++, order: loop }, ...b]);
    };
    const trim = () => {
      const last = box.current?.lastElementChild;
      if (!last || count.current <= 2 || owed.current) return;
      const r = sc.getBoundingClientRect();
      if (last.getBoundingClientRect().top - r.bottom >= sc.clientHeight * 2) setBlocks((b) => b.slice(0, -1));
    };
    const onScroll = () => { ahead(); window.clearTimeout(timer); timer = window.setTimeout(trim, 280); };
    sc.addEventListener('scroll', onScroll, { passive: true });
    ahead();
    return () => { window.clearTimeout(timer); sc.removeEventListener('scroll', onScroll); };
  }, [ready, scroller, loop, blocks.length]);

  // the new cycle's height (with the gap under it) goes onto the scroll before paint
  useLayoutEffect(() => {
    if (!owed.current) return;
    owed.current = false;
    const el = box.current;
    const sc = scroller.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !sc || !first) return;
    const second = first.nextElementSibling as HTMLElement | null;
    sc.scrollTop += second ? second.offsetTop - first.offsetTop : el.offsetHeight;
  }, [blocks, scroller]);

  return (
    <div ref={box} className={cn('flex flex-col gap-[18vh]', blocks.length > 0 && className)}>
      {blocks.map((b) => (
        <div key={b.id} className="flex flex-col gap-[18vh]">
          {b.order.map((i) => (
            <ProjectGallery key={`${b.id}-${projects[i].slug}`} i={i} scrollRoot />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * The pill's dropdown arrow, griflan-style: a little "Y" (a chevron with a stem) when closed; opening
 * flips the chevron up and pulls the stem in, leaving a caret.
 */
function PillArrow({ open }: { open: boolean }) {
  const t = 'transition-transform duration-500 ease-expo';
  return (
    <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors duration-300 group-hover/trig:bg-bone/10">
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] overflow-visible" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <g className={t} style={{ transformOrigin: '12px 10px', transform: open ? 'rotate(180deg) translateY(-1px)' : 'none' }}>
          <path d="M6.5 6.5 12 12l5.5-5.5" />
        </g>
        <path d="M12 12v7" className={t} style={{ transformOrigin: '12px 12px', transform: open ? 'scaleY(0)' : 'none' }} />
      </svg>
    </span>
  );
}

/** Floating pill: logo | current project ▾ | Start A Project, with a grouped dropdown. */
export function SheetPill({ visible, current, onPick, onStart, fade }: { visible: boolean; current: number; onPick: (i: number) => void; onStart: () => void; /** appear in place (the header has folded into it) instead of dropping in */ fade?: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const groups = projectsByGroup();
  // fine pointers: hovering the trigger or the list opens it; leaving both closes after 150ms
  const hoverT = useRef<number | undefined>(undefined);
  const fine = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hoverAt = useRef(0);
  const hoverOpen = (e: React.PointerEvent) => { if (e.pointerType !== 'mouse' || !fine()) return; window.clearTimeout(hoverT.current); if (!open) hoverAt.current = performance.now(); setOpen(true); };
  const hoverClose = (e: React.PointerEvent) => { if (e.pointerType !== 'mouse') return; window.clearTimeout(hoverT.current); hoverT.current = window.setTimeout(() => setOpen(false), 150); };
  useEffect(() => () => window.clearTimeout(hoverT.current), []);

  useEffect(() => { if (!visible) setOpen(false); }, [visible]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); setOpen(false); trigger.current?.focus(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const items = Array.from(panel.current?.querySelectorAll<HTMLElement>('button, a') ?? []);
        if (!items.length) return;
        e.preventDefault();
        const at = items.indexOf(document.activeElement as HTMLElement);
        const next = e.key === 'ArrowDown' ? (at + 1) % items.length : (at - 1 + items.length) % items.length;
        items[next].focus();
      }
    };
    const onDown = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onDown);
    return () => { window.removeEventListener('keydown', onKey, true); window.removeEventListener('pointerdown', onDown); };
  }, [open]);

  let stagger = 0;
  return (
    <div
      ref={box}
      className={cn(
        'absolute left-1/2 top-3 z-40 w-[calc(100%-16px)] max-w-[36rem] -translate-x-1/2 transition-[opacity,transform] ease-expo lg:top-4',
        fade ? 'duration-200' : 'duration-500',
        visible ? 'pointer-events-auto translate-y-0 opacity-100' : cn('pointer-events-none opacity-0', !fade && '-translate-y-6'),
      )}
      aria-hidden={!visible}
    >
      <div data-pill="box" className="flex h-[58px] items-stretch rounded-[14px] border border-bone/15 bg-ink p-[5px] shadow-[inset_0_0_0_3px_#181616,inset_0_0_0_4px_rgb(var(--c-fg)/0.08),0_14px_44px_rgba(0,0,0,0.5)]">
        <Link to="/" tabIndex={visible ? 0 : -1} aria-label="Waqar Yunus — home" className="ink-host group hidden shrink-0 items-center px-3 text-bone sm:flex" onPointerMove={inkFollow}>
          <span data-pill="logo" className="inline-block">
            <Logo className="ink-follow text-[1.55rem]" />
          </span>
        </Link>
        <span className="my-[-5px] hidden w-px bg-bone/15 sm:block" aria-hidden="true" />
        {/* project switcher: the list drops from under the name */}
        <div className="relative min-w-0 flex-1">
          <button
            ref={trigger}
            type="button"
            tabIndex={visible ? 0 : -1}
            aria-expanded={open}
            aria-haspopup="true"
            aria-controls="sheet-pill-list"
            onClick={() => { if (performance.now() - hoverAt.current < 600) { setOpen(true); return; } setOpen((o) => !o); }}
            onPointerEnter={hoverOpen}
            onPointerLeave={hoverClose}
            className={cn(
              'group/trig flex h-full w-full items-center justify-between gap-2 rounded-[9px] pl-4 pr-2 text-left font-sans text-[17px] transition-colors hover:text-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-bone/40',
              open ? 'text-accent' : 'text-bone',
            )}
          >
            <span className="relative block h-[1.3em] min-w-0 flex-1 overflow-hidden leading-[1.3]">
              {/* the name rolls when you scroll into the next project */}
              <span key={current} className="block animate-[pill-roll_0.5s_cubic-bezier(0.16,1,0.3,1)] truncate">{projects[current]?.title}</span>
            </span>
            <PillArrow open={open} />
          </button>
          <div
            ref={panel}
            id="sheet-pill-list"
            onPointerEnter={(e) => { if (open) hoverOpen(e); }}
            onPointerLeave={hoverClose}
            data-lenis-prevent
            role="menu"
            aria-label="Projects"
            className={cn(
              'absolute left-[-5px] right-[-5px] top-[calc(100%+12px)] max-h-[70svh] min-w-[15rem] origin-top overflow-y-auto rounded-[12px] border border-bone/15 bg-ink px-4 py-4 shadow-[0_24px_60px_rgba(0,0,0,0.55)] transition-[opacity,transform] duration-300 ease-expo',
              open ? 'scale-100 opacity-100' : 'pointer-events-none invisible -translate-y-2 scale-[0.97] opacity-0',
            )}
          >
            {groups.map(({ group, items }) => (
              <div key={group} className="mb-5 last:mb-0">
                <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-mute">{group}</p>
                <ul>
                  {items.map((p) => {
                    const i = projects.indexOf(p);
                    const d = stagger++;
                    return (
                      <li
                        key={p.slug}
                        className={cn('transition-[opacity,transform] duration-500 ease-expo', open ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0')}
                        style={{ transitionDelay: open ? `${60 + d * 40}ms` : '0ms' }}
                      >
                        <button
                          type="button"
                          role="menuitem"
                          tabIndex={open ? 0 : -1}
                          aria-current={i === current ? 'true' : undefined}
                          onClick={() => { setOpen(false); onPick(i); }}
                          className={cn(
                            'block w-full rounded-[6px] py-[5px] text-left font-sans text-[17px] leading-[1.35] transition-colors hover:text-accent focus-visible:text-accent focus-visible:outline-none',
                            i === current ? 'text-accent' : 'text-bone',
                          )}
                        >
                          {p.title}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {/* back out to the globe */}
            <Link
              to="/"
              role="menuitem"
              tabIndex={open ? 0 : -1}
              onClick={() => setOpen(false)}
              className={cn(
                'mt-1 block w-full rounded-[6px] py-[5px] text-left font-sans text-[17px] leading-[1.35] text-bone transition-[color,opacity,transform] duration-500 ease-expo hover:text-accent focus-visible:text-accent focus-visible:outline-none',
                open ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
              )}
              style={{ transitionDelay: open ? `${60 + stagger * 40}ms` : '0ms' }}
            >
              Open Home
            </Link>
          </div>
        </div>
        <span className="my-[-5px] w-px bg-bone/15" aria-hidden="true" />
        <div className="shrink-0 pl-[5px]">
          <button
            type="button"
            data-pill="cta"
            tabIndex={visible ? 0 : -1}
            onClick={onStart}
            className="group relative h-full overflow-hidden rounded-[9px] bg-lime px-4 font-serif text-[1.35rem] leading-none text-onfill transition-[filter] duration-300 active:brightness-95"
          >
            <LiquidFill />
            <span data-liquid-label className="relative z-10 whitespace-nowrap">Start A Project</span>
          </button>
        </div>
      </div>
    </div>
  );
}
