import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { GlobeButton } from '@/components/home/GlobeButton';
import { getProject, projectPath, projects } from '@/data/projects';
import { useContactPanel } from '@/app/panel';
import { ProjectLoop, SheetPill } from '@/components/home/ProjectFeed';
import { nearestFeed } from '@/lib/feed';
import { prefersReducedMotion } from '@/utils/motion';
import { cn } from '@/utils/cn';
import { Seo } from '@/components/ui/Seo';
import { absoluteUrl } from '@/lib/site';
import { SocialCell } from '@/components/layout/Header';
import { useLenis } from '@/hooks/useLenis';
import { usePaper } from '@/lib/paper';
import { clearHandoff, handOff, peekHandoff, tileRects, tumble } from '@/lib/morph';
import { buildAtlas, tilesFor, WIDE_ASPECT } from '@/lib/tiles';
import { MORPH_CLASS, PIN_VAR, T_VAR, clearFold, foldAt, foldEnd, html, measureFold, setPin, setT } from '@/lib/headerFold';
import NotFound from '@/pages/NotFound';
import { preloadPath } from '@/app/routes';

const cornerLink = 'group block leading-none font-mono text-[13px] font-semibold uppercase tracking-[0.06em] text-bone transition-colors duration-300 hover:text-accent focus-visible:text-accent';
const titleOf = (i: number) => `${projects[i].title} — Zain`;

/**
 * A project page, griflan-style: under the site header, this project's editorial gallery, then
 * every project's gallery on an endless loop, down and up alike (ProjectLoop `both`), every tile moving like paper (usePaper).
 * Scrolling folds the site header into the floating pill (ScrollTrigger scrubs --sheet-t; the
 * header is pinned to the window while it folds) and scrolling back to the top unfolds it. The URL
 * and the pill follow whichever gallery shows the most viewport area (replaceState, no remount).
 */
export default function ProjectDetail() {
  const { slug } = useParams();
  const project = getProject(slug);
  const { open: panelOpen, setOpen } = useContactPanel();
  const lenis = useLenis();
  const index = Math.max(0, projects.findIndex((q) => q.slug === slug));
  const [current, setCurrent] = useState(index);
  const [pillOn, setPillOn] = useState(false);
  const [linksOn, setLinksOn] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef(index);
  const lockRef = useRef(false);
  const parked = useRef(false); // header unfolded for the contact panel
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const [order] = useState(() => projects.map((_, k) => (index + k) % projects.length));
  const leavingRef = useRef(false);

  usePaper(feedRef, { paused: leavingRef });

  // arrived from a project sheet ("Full case study"): its tiles carry on into this gallery
  useLayoutEffect(() => {
    const rects = peekHandoff(slug, 'toDetail');
    if (!rects) return;
    // cleared a tick later, not now: StrictMode runs this twice in dev, and the second run must still see it
    const clear = window.setTimeout(clearHandoff, 0);
    const gallery = feedRef.current?.querySelector<HTMLElement>(`[data-feed="${index}"]`);
    if (!gallery || prefersReducedMotion()) return () => clearTimeout(clear);
    const lis = Array.from(gallery.querySelectorAll<HTMLElement>('[data-tile]'));
    const tweens: gsap.core.Timeline[] = [];
    lis.forEach((li, k) => {
      const from = rects[Number(li.dataset.tile)];
      if (!from) return;
      const r = li.getBoundingClientRect();
      const side = Math.max(-1, Math.min(1, ((r.left + r.width / 2) / window.innerWidth - 0.5) * 2));
      // the gallery's CSS transitions would fight the tween: off while it flies
      gsap.set(li, { transition: 'none', transformOrigin: '0 0', transformPerspective: 1200 });
      const tl = gsap.timeline({ delay: k * 0.04, onComplete: () => { gsap.set(li, { clearProps: 'transform,transition,transformOrigin' }); } });
      tl.fromTo(li, { x: from.x - r.left, y: from.y - r.top, scaleX: from.w / r.width, scaleY: from.h / r.height }, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 1, ease: 'power3.inOut' }, 0);
      tl.to(li, { ...tumble(side * 0.5), duration: 1, ease: 'sine.inOut' }, 0);
      tweens.push(tl);
    });
    return () => {
      clearTimeout(clear);
      tweens.forEach((t) => t.kill());
      gsap.set(lis, { clearProps: 'transform,transition,transformOrigin' }); // never leave a tile stranded mid-flight
    };
    // once per page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activate = (cur: number) => {
    currentRef.current = cur;
    setCurrent(cur);
    const path = projectPath(projects[cur].slug);
    if (window.location.pathname !== path) window.history.replaceState(window.history.state, '', path);
    document.title = titleOf(cur);
  };

  // header → pill, scrubbed by the scroll (ScrollTrigger; Lenis drives ScrollTrigger.update)
  useLayoutEffect(() => {
    if (!project) return;
    html().classList.add(MORPH_CLASS);
    const apply = (y: number) => {
      if (parked.current) return;
      const t = foldAt(y);
      setT(t);
      setPin(Math.min(y, foldEnd())); // pinned to the window while it folds, then it lets go
      setPillOn(t >= 0.9);
      setLinksOn(t > 0.03);
    };
    measureFold(window.scrollY);
    apply(window.scrollY);
    const st = ScrollTrigger.create({
      start: 0,
      end: () => foldEnd(),
      onUpdate: (self) => apply(self.scroll()),
      onRefresh: (self) => { if (!parked.current) { measureFold(self.scroll()); apply(self.scroll()); } },
    });
    return () => {
      st.kill();
      gsap.killTweensOf(html());
      clearFold();
    };
  }, [project]);

  // contact panel from the pill: unfold the header where you are (the panel hangs under it), then
  // open; when it closes, fold back to wherever the scroll is
  const startProject = () => {
    parked.current = true;
    setPillOn(false);
    setLinksOn(false);
    const y = window.scrollY;
    if (prefersReducedMotion()) { setT(0); setPin(y); setOpen(true); return; }
    gsap.to(html(), { [T_VAR]: 0, [PIN_VAR]: `${y}px`, duration: 0.5, ease: 'power3.inOut', onComplete: () => setOpen(true) });
  };
  const wasOpen = useRef(false);
  useEffect(() => {
    if (panelOpen) { wasOpen.current = true; return; }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    if (!parked.current) return;
    const y = window.scrollY;
    const reduce = prefersReducedMotion();
    gsap.to(html(), {
      [T_VAR]: foldAt(y),
      [PIN_VAR]: `${Math.min(y, foldEnd())}px`,
      duration: reduce ? 0 : 0.6,
      delay: reduce ? 0 : 0.35,
      ease: 'power3.inOut',
      onComplete: () => { parked.current = false; setPillOn(foldAt(window.scrollY) >= 0.9); setLinksOn(foldAt(window.scrollY) > 0.03); },
    });
  }, [panelOpen]);

  // active-gallery tracking on window scroll
  useEffect(() => {
    if (!project) return;
    currentRef.current = index;
    setCurrent(index);
    const onScroll = () => {
      if (lockRef.current) return;
      // Active = gallery with the largest visible area (ties -> earlier in DOM order). Hysteresis:
      // a challenger must beat the current gallery by 8% of the viewport height to take over.
      const vh = window.innerHeight;
      let cur = currentRef.current;
      let best = -1;
      let curVis = 0;
      document.querySelectorAll<HTMLElement>('[data-feed]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const vis = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
        const id = Number(el.dataset.feed);
        if (id === currentRef.current) curVis = Math.max(curVis, vis);
        if (vis > best) { best = vis; cur = id; }
      });
      if (cur !== currentRef.current && best > curVis + vh * 0.08) activate(cur);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [project, index]);

  if (!project) return <NotFound />;
  const p = project;
  const story = p.summary ?? p.focus;

  const goTo = (i: number) => {
    const el = nearestFeed(i, feedRef.current ?? document);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    // highlight + URL follow the pick immediately; lock tracking while we fly past other galleries
    activate(i);
    lockRef.current = true;
    const unlock = () => { lockRef.current = false; };
    const reduce = prefersReducedMotion();
    if (lenis) lenis.scrollTo(top, { duration: reduce ? 0 : 1.4, immediate: reduce, onComplete: unlock });
    else {
      window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
      window.setTimeout(unlock, reduce ? 50 : 1200);
    }
    window.setTimeout(unlock, 2000); // safety net if onComplete never fires (interrupted scroll)
  };

  /**
   * "Project close" (W button): the project's gallery that is on screen lifts out of the page —
   * everything else fades and the header unfolds — and the home globe takes over, where those same
   * tiles fly back into the cluster the project came from (see GlobeHome's landing).
   */
  const backToGlobe = () => {
    if (leaving) return;
    // the home page and its globe start loading now, so the page change never blanks the screen
    preloadPath('/');
    void import('@/components/three/GlobeScene');
    // and the landing project's pictures for the globe (shared with it: see buildAtlas)
    void buildAtlas(projects[currentRef.current], currentRef.current, WIDE_ASPECT).catch(() => undefined);
    setLeaving(true);
    const f = feedRef.current;
    const slugNow = projects[currentRef.current].slug;
    // the copy of the current project's gallery showing the most of itself
    let gallery: HTMLElement | null = null;
    let best = 0;
    f?.querySelectorAll<HTMLElement>(`[data-feed="${currentRef.current}"]`).forEach((el) => {
      const r = el.getBoundingClientRect();
      const vis = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      if (vis > best) { best = vis; gallery = el; }
    });
    if (f && gallery && !prefersReducedMotion()) {
      const g = gallery as HTMLElement;
      leavingRef.current = true; // the paper bend flattens out
      lockRef.current = true;
      lenis?.stop();
      parked.current = true;
      setPillOn(false);
      setLinksOn(false);
      const keep = Array.from(g.querySelectorAll<HTMLElement>('[data-tile]'));
      const others = Array.from(f.querySelectorAll<HTMLElement>('[data-paper], [data-feed] > p')).filter((el) => !keep.includes(el));
      const tl = gsap.timeline({
        onComplete: () => {
          handOff(slugNow, 'toGlobe', tileRects(g, tilesFor(projects[currentRef.current], currentRef.current).length));
          lenis?.start();
          navigate('/', { state: { globeReturn: slugNow } });
        },
      });
      tl.to(others, { opacity: 0, duration: 0.4, ease: 'power2.out' }, 0);
      tl.to(html(), { [T_VAR]: 0, [PIN_VAR]: `${window.scrollY}px`, duration: 0.45, ease: 'power3.inOut' }, 0);
      tl.to(keep, { boxShadow: '0 30px 80px rgba(0,0,0,0.55)', duration: 0.4 }, 0);
      return;
    }
    const done = () => navigate('/', { state: { fromGlobeButton: true } });
    if (!f || prefersReducedMotion()) {
      if (f) gsap.to(f, { opacity: 0, duration: 0.25, onComplete: done });
      else done();
      return;
    }
    const r = f.getBoundingClientRect();
    const ox = (window.innerWidth < 1024 ? 48 : 72) - r.left;
    const oy = window.innerHeight - (window.innerWidth < 1024 ? 48 : 72) - r.top;
    gsap.set(f, { transformOrigin: `${ox}px ${oy}px` });
    gsap.timeline({ onComplete: done })
      .to(f, { scale: 0.9, filter: 'blur(2px)', duration: 0.35, ease: 'power2.out' })
      .to(f, { scale: 0.04, opacity: 0, filter: 'blur(10px)', duration: 0.55, ease: 'expo.in' }, '>-0.05');
  };

  const barOn = pillOn && !panelOpen;
  const cornersOn = linksOn && !panelOpen;
  return (
    <article key={p.slug}>
      <Seo
        title={p.title}
        description={p.seoDescription ?? story}
        image={p.cover?.src}
        type="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name: p.title,
          description: story,
          url: absoluteUrl(projectPath(p.slug)),
          creator: { '@type': 'Person', name: 'Zain' },
          ...(p.liveUrl ? { sameAs: p.liveUrl } : {}),
          ...(p.year ? { dateCreated: p.year } : {}),
        }}
      />
      <h1 className="sr-only">{p.title}</h1>

      <div ref={feedRef}>
        <ProjectLoop head={order} loop={order} eagerFirst both className="pb-[calc(18vh+5.5rem+env(safe-area-inset-bottom))] pt-5 lg:pb-[18vh] lg:pt-6" />
      </div>

      <div
        aria-hidden={!cornersOn}
        className={cn('pointer-events-none fixed inset-x-0 top-0 z-30 h-28 bg-gradient-to-b from-ink/80 via-ink/30 to-transparent transition-opacity duration-500', cornersOn ? 'opacity-100' : 'opacity-0')}
      >
        <nav aria-label="Quick links" className={cn('hidden items-start justify-between px-6 pt-6 transition-transform duration-500 ease-expo lg:flex', cornersOn ? 'pointer-events-auto translate-y-0' : '-translate-y-4')}>
          <div className="flex gap-6">
            {([['/', 'Home'], ['/about', 'About']] as const).map(([to, label]) => (
              <NavLink key={to} to={to} end tabIndex={cornersOn ? 0 : -1} className={({ isActive }) => cn(cornerLink, isActive && 'text-accent')}>{label}</NavLink>
            ))}
          </div>
          <div className="flex gap-6">
            <SocialCell label="Insta" platform="instagram" title="Instagram" className={cornerLink} tabIndex={cornersOn ? 0 : -1} />
            <SocialCell label="Link" platform="linkedin" title="LinkedIn" className={cornerLink} tabIndex={cornersOn ? 0 : -1} />
          </div>
        </nav>
      </div>

      {/* the header folds into this pill (it appears in place as the fold lands) */}
      <div className="fixed inset-x-0 top-0 z-40 h-0">
        <SheetPill visible={barOn} current={current} onPick={goTo} onStart={startProject} fade />
      </div>

      {/* Mobile: a solid bottom gutter the globe button sits in, so it never covers a tile. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-[calc(4.75rem+env(safe-area-inset-bottom))] border-t border-bone/10 bg-ink lg:hidden" />
      <GlobeButton onClick={backToGlobe} hidden={leaving} />
    </article>
  );
}
