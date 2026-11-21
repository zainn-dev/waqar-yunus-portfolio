import { lazy, Suspense, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Shuffle } from 'lucide-react';
import type { Project } from '@/types/content';
import { projectPath } from '@/data/projects';
import { ProjectCover } from '@/components/projects/ProjectCover';
import { ScrollTrigger, useGSAP } from '@/lib/gsap';
import { useIsDesktop, useReducedMotion } from '@/hooks/useMediaQuery';
import { useInView } from '@/components/three/useInView';
import { hasWebGL } from '@/utils/motion';

const PerchScene = lazy(() => import('@/components/three/StageScenes').then((m) => ({ default: m.PerchScene })));

type Pose = { x: number; y: number; z: number; s: number; rx: number; ry: number; rz: number };
const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const mix = (a: Pose, b: Pose, t: number): Pose => ({
  x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t, s: a.s + (b.s - a.s) * t,
  rx: a.rx + (b.rx - a.rx) * t, ry: a.ry + (b.ry - a.ry) * t, rz: a.rz + (b.rz - a.rz) * t,
});
const CENTER: Pose = { x: 0, y: 0, z: 0, s: 1, rx: 0, ry: 0, rz: 0 };

/** Resting place in one of the two tilted stacks: upcoming (bottom right) or seen (top left). */
function stack(side: 1 | -1, depth: number, W: number, H: number, desktop: boolean): Pose {
  if (side > 0) {
    return { x: W * (desktop ? 0.355 : 0.32) - depth * 16, y: H * (desktop ? 0.425 : 0.355) - depth * 12, z: -depth * 30, s: desktop ? 0.46 : 0.34, rx: 36, ry: -30, rz: -9 };
  }
  return { x: -W * (desktop ? 0.22 : 0.28) + depth * 16, y: -H * (desktop ? 0.36 : 0.37) - depth * 12, z: -depth * 30, s: desktop ? 0.46 : 0.4, rx: 36, ry: 28, rz: 9 };
}

/** Where card `t` places sit relative to the current one (t = 0 is centre stage). */
function poseAt(t: number, W: number, H: number, desktop: boolean) {
  const a = Math.abs(t);
  const side = t >= 0 ? 1 : -1;
  if (a <= 1) {
    const e = smooth(a);
    const p = mix(CENTER, stack(side, 0, W, H, desktop), e);
    p.z += Math.sin(e * Math.PI) * 140; // lifts off the table on its way
    return { p, o: 1 };
  }
  const depth = a - 1;
  return { p: stack(side, Math.min(depth, 5), W, H, desktop), o: depth > 4 ? clamp01(5 - depth) : 1 };
}

/** Scroll → deck position with a hold on every card, so they arrive one at a time. */
const shape = (s: number) => {
  const base = Math.floor(s);
  return base + smooth(clamp01((s - base - 0.18) / 0.64));
};

function Meta({ p }: { p: Project }) {
  const rows: [string, string | undefined][] = [
    ['Role', p.role],
    ['Focus', p.focus],
    ['Services', p.categories.join(', ')],
    ['Stack', p.stack?.join(', ')],
    ['Year', p.year],
  ];
  return (
    <dl className="grid gap-3.5">
      {rows.filter(([, v]) => v).map(([k, v]) => (
        <div key={k}>
          <dt className="text-[15px] text-mute">{k}</dt>
          <dd className="text-[15px] font-medium leading-snug text-bone">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const swap = { initial: { y: '105%' }, animate: { y: '0%' }, exit: { y: '-105%' }, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } } as const;
const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } } as const;

/**
 * The Work page stage: giant "SELECTED / WORK", the avatar perched on the O, and a deck of project
 * cards. Scrolling (pinned) flies one card at a time from the stack at the bottom right to the
 * centre and on to the stack at the top left. "Mix" shuffles the deck.
 */
export function WorkDeck({ projects }: { projects: Project[] }) {
  const reduced = useReducedMotion();
  if (reduced) return <DeckList projects={projects} />;
  return <Deck projects={projects} />;
}

function Deck({ projects }: { projects: Project[] }) {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const cards = useRef(new Map<string, HTMLElement>());
  const pos = useRef(0);
  const [order, setOrder] = useState(() => projects.map((p) => p.slug));
  const [active, setActive] = useState(0);
  const [mixing, setMixing] = useState(false);
  const desktop = useIsDesktop();
  const inView = useInView(root, '0px');
  const [webgl] = useState(() => typeof window !== 'undefined' && hasWebGL());
  const n = order.length;
  const bySlug = new Map(projects.map((p) => [p.slug, p]));
  const current = bySlug.get(order[active])!;

  const apply = useCallback(() => {
    const el = stage.current;
    if (!el) return;
    const W = el.clientWidth, H = el.clientHeight;
    const s = shape(pos.current);
    order.forEach((slug, i) => {
      const card = cards.current.get(slug);
      if (!card) return;
      const t = i - s;
      const { p, o } = poseAt(t, W, H, desktop);
      card.style.transform = `translate(-50%, -50%) translate3d(${p.x}px, ${p.y}px, ${p.z}px) rotateX(${p.rx}deg) rotateY(${p.ry}deg) rotateZ(${p.rz}deg) scale(${p.s})`;
      card.style.opacity = String(o);
      card.style.zIndex = String(1000 - Math.round(Math.abs(t) * 10));
      const live = Math.abs(t) < 0.5;
      card.style.pointerEvents = live ? 'auto' : 'none';
      card.tabIndex = live ? 0 : -1;
      card.setAttribute('aria-hidden', live ? 'false' : 'true');
    });
    const a = Math.min(n - 1, Math.max(0, Math.round(s)));
    setActive((prev) => (prev === a ? prev : a));
  }, [order, desktop, n]);

  useGSAP(
    () => {
      const st = ScrollTrigger.create({
        trigger: root.current,
        start: 'top top',
        end: () => `+=${Math.max(1, n - 1) * window.innerHeight * 0.85}`,
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => { pos.current = self.progress * (n - 1); apply(); },
      });
      pos.current = st.progress * (n - 1);
      apply();
      const onResize = () => apply();
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    },
    { scope: root, dependencies: [apply, n], revertOnUpdate: true },
  );

  useLayoutEffect(() => { apply(); }, [apply]);

  const shuffle = () => {
    const keep = order[active];
    const rest = order.filter((s) => s !== keep);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    // the card on stage changes too, so the mix is visible
    const next = rest.shift()!;
    rest.splice(Math.floor(Math.random() * (rest.length + 1)), 0, keep);
    const arr = [...rest.slice(0, active), next, ...rest.slice(active)];
    setMixing(true);
    setOrder(arr);
    window.setTimeout(() => setMixing(false), 1000);
  };

  const giant = 'font-display font-normal uppercase leading-[0.78] tracking-[-0.055em] text-bone';
  const giantSize = { fontSize: desktop ? 'clamp(4.5rem, 8.6vw, 10.5rem)' : 'clamp(3.6rem, 19vw, 7rem)' };

  return (
    <section ref={root} aria-labelledby="work-title" className="relative h-[100svh] min-h-[600px] overflow-hidden bg-ink">
      <h1 id="work-title" className="sr-only">Selected work</h1>

      {/* WORK — top right, avatar perched on the O */}
      <div aria-hidden="true" className={desktop ? 'absolute right-[var(--gutter)] top-[calc(var(--header-h)+12vh)]' : 'absolute right-[var(--gutter)] top-[calc(var(--header-h)+3.2rem+15vw)]'}>
        <div className={giant} style={giantSize}>
          W
          <span className="relative inline-block">
            O
            {webgl && (
              <span className="pointer-events-none absolute left-1/2 top-[-0.66em] z-20 h-[1.3em] w-[1em] -translate-x-1/2">
                <Suspense fallback={null}>
                  <PerchScene active={inView} reduced={false} />
                </Suspense>
              </span>
            )}
          </span>
          RK
        </div>
      </div>

      {/* SELECTED — bottom left (top left on phones) */}
      <p aria-hidden="true" className={`${giant} absolute left-[var(--gutter)] ${desktop ? 'bottom-[5vh]' : 'top-[calc(var(--header-h)+1.5rem)]'}`} style={giantSize}>
        Selected
      </p>

      {/* card stage */}
      <div ref={stage} className="absolute inset-0 z-10" style={{ perspective: '1400px' }}>
        {order.map((slug, i) => {
          const p = bySlug.get(slug)!;
          return (
            <Link
              key={slug}
              ref={(el) => { if (el) cards.current.set(slug, el); else cards.current.delete(slug); }}
              to={projectPath(slug)}
              data-cursor="View project"
              aria-label={`${p.title} — view project`}
              tabIndex={i === active ? 0 : -1}
              className="absolute left-1/2 block aspect-[1416/808] overflow-hidden rounded-[3px] bg-ink-3 shadow-[0_30px_70px_-30px_rgba(13,17,23,0.55)] will-change-transform"
              style={{
                top: desktop ? '46%' : '54%',
                width: desktop ? 'min(40vw, 640px)' : '84vw',
                transformStyle: 'preserve-3d',
                transition: mixing ? 'transform 0.95s cubic-bezier(0.16,1,0.3,1), opacity 0.6s' : undefined,
              }}
            >
              <ProjectCover project={p} sizes="(min-width: 1024px) 40vw, 84vw" eager={i < 3} />
            </Link>
          );
        })}
      </div>

      {/* caption under the card */}
      <div className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2" style={{ top: desktop ? 'calc(46% + min(40vw, 640px) * 0.285 + 1.1rem)' : 'calc(54% + 84vw * 0.285 + 0.9rem)', width: desktop ? 'min(40vw, 640px)' : '84vw' }}>
        <div className="flex items-end justify-between gap-4">
          <div className="overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.p key={current.slug} {...swap} className="font-display text-[clamp(1.5rem,2.6vw,2.6rem)] uppercase leading-none tracking-[-0.03em] text-bone">
                {current.title}
              </motion.p>
            </AnimatePresence>
          </div>
          <Link to={projectPath(current.slug)} className="pointer-events-auto shrink-0 border-b border-bone pb-0.5 text-[15px] font-medium text-bone transition-colors hover:border-lime hover:text-accent">
            View project
          </Link>
        </div>
        {!desktop && (
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={current.slug} {...fade} className="mt-3 text-[14px] leading-snug text-mute">{current.focus}</motion.p>
          </AnimatePresence>
        )}
      </div>

      {desktop && (
        <>
          <div className="absolute left-[var(--gutter)] top-[42%] z-20 w-[15rem] -translate-y-1/2">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={current.slug} {...fade}><Meta p={current} /></motion.div>
            </AnimatePresence>
          </div>
          <div className="absolute right-[var(--gutter)] top-[47%] z-20 w-[min(22rem,24vw)] text-right">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p key={current.slug} {...fade} className="text-[17px] font-medium leading-snug text-bone">
                {current.summary ?? current.focus}
              </motion.p>
            </AnimatePresence>
          </div>
        </>
      )}

      {/* mix + counter */}
      <div className={`absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-30 flex items-center gap-4 ${desktop ? 'left-1/2 -translate-x-1/2' : 'left-[var(--gutter)]'}`}>
        <button type="button" onClick={shuffle} className="inline-flex min-h-[44px] items-center gap-2 rounded-cta bg-lime px-4 font-medium text-onfill transition-transform duration-500 ease-expo hover:-translate-y-0.5">
          <Shuffle className="h-4 w-4" aria-hidden="true" /> Mix
        </button>
        <p className="font-mono text-xs tabular-nums text-mute" aria-live="polite">
          {String(active + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
        </p>
      </div>
    </section>
  );
}

/** Reduced motion: the same content as a plain list, nothing pinned or flying. */
function DeckList({ projects }: { projects: Project[] }) {
  return (
    <section aria-labelledby="work-title" className="page-wrap pb-20 pt-[calc(var(--header-h)+3rem)]">
      <h1 id="work-title" className="font-display font-normal uppercase leading-[0.8] tracking-[-0.055em] text-bone" style={{ fontSize: 'clamp(3.6rem, 11vw, 12rem)' }}>
        Selected work
      </h1>
      <ul className="mt-14 grid gap-16">
        {projects.map((p) => (
          <li key={p.slug} className="grid gap-6 md:grid-cols-12 md:items-end">
            <Link to={projectPath(p.slug)} className="block aspect-[1416/808] overflow-hidden rounded-[3px] bg-ink-3 md:col-span-7">
              <ProjectCover project={p} />
            </Link>
            <div className="md:col-span-5">
              <h2 className="font-display text-3xl uppercase tracking-[-0.03em]">{p.title}</h2>
              <p className="mt-3 text-mute">{p.summary ?? p.focus}</p>
              <div className="mt-5"><Meta p={p} /></div>
              <Link to={projectPath(p.slug)} className="mt-6 inline-flex items-center gap-1 border-b border-bone pb-0.5 font-medium">
                View project <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
