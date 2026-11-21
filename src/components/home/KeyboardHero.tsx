import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { profile } from '@/data/profile';
import { gsap, useGSAP } from '@/lib/gsap';
import { useIntro } from '@/app/intro';
import { play } from '@/lib/sound';
import { KEY_BY_CODE, keysFor } from '@/lib/keyboard';
import { hasWebGL, prefersReducedMotion } from '@/utils/motion';
import { useIsDesktop, useReducedMotion } from '@/hooks/useMediaQuery';
import { useInView } from '@/components/three/useInView';

const KeyboardScene = lazy(() => import('@/components/three/KeyboardScene'));

type Out = { text: string; tone: 'ok' | 'mute' | 'err' }[];
const SCRIPTS: { cmd: string; out: Out }[] = [
  { cmd: 'npm create website@latest', out: [{ text: '✓ scaffolded in 0.42s', tone: 'ok' }, { text: 'fast by default. clear by design.', tone: 'mute' }] },
  { cmd: 'git commit -m "ship it"', out: [{ text: '[main 3f9c2a1] ship it', tone: 'ok' }, { text: '1 file changed, 1 happy client', tone: 'mute' }] },
  {
    cmd: 'curl -s waqar.dev/status',
    out: [{ text: profile.availability.available ? '{ "status": "available", "reply": "< 24h" }' : '{ "status": "booked", "reply": "< 24h" }', tone: 'ok' }],
  },
  { cmd: 'echo "hello, world"', out: [{ text: 'hello, world', tone: 'mute' }] },
];
const IDLE = 7000;
const MAX = 34;

/** Colours a shell command like an editor would: command, flags, strings. */
function Highlight({ text }: { text: string }) {
  const parts = text.match(/"[^"]*"?|\s+|[^\s"]+/g) ?? [];
  let first = true;
  return (
    <>
      {parts.map((t, i) => {
        let color = 'rgb(var(--c-fg))';
        if (/^\s+$/.test(t)) color = 'inherit';
        else if (first) { color = 'var(--syn-green)'; first = false; }
        else if (t.startsWith('"')) color = 'var(--syn-orange)';
        else if (t.startsWith('-')) color = 'var(--syn-blue)';
        else if (/[@/.]/.test(t)) color = 'var(--syn-purple)';
        return <span key={i} style={{ color }}>{t}</span>;
      })}
    </>
  );
}

/**
 * Home hero: a live 3D mechanical keyboard. It types a few shell commands on its own; visitors can
 * take over with their real keyboard (or by tapping the keys) and the 3D keys follow.
 */
export function KeyboardHero() {
  const ref = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const presses = useRef(new Map<string, number>());
  const userAt = useRef(0);
  const lineRef = useRef('');
  const { ready } = useIntro();
  const inView = useInView(ref, '0px');
  const inViewRef = useRef(false);
  inViewRef.current = inView;
  const desktop = useIsDesktop();
  const reduced = useReducedMotion();
  const [webgl] = useState(() => typeof window !== 'undefined' && hasWebGL());
  const [line, setLineState] = useState(reduced ? SCRIPTS[0].cmd : '');
  const [out, setOut] = useState<Out | null>(reduced ? SCRIPTS[0].out : null);

  const setLine = useCallback((v: string | ((l: string) => string)) => {
    const next = typeof v === 'function' ? v(lineRef.current) : v;
    lineRef.current = next;
    setLineState(next);
  }, []);

  const press = useCallback((code: string) => {
    presses.current.set(code, performance.now());
    play('key');
  }, []);

  /** A key typed by the visitor (real keyboard or a tap on the 3D board). */
  const userKey = useCallback(
    (code: string, char: string | null) => {
      press(code);
      const def = KEY_BY_CODE.get(code);
      if (!def || code.startsWith('Shift') || def.kind === 'mod' && code !== 'Backspace') return;
      const fresh = performance.now() - userAt.current > IDLE;
      userAt.current = performance.now();
      if (fresh) { setLine(''); setOut(null); }
      if (code === 'Backspace') { setLine((l) => l.slice(0, -1)); return; }
      if (code === 'Escape') { setLine(''); setOut(null); return; }
      if (code === 'Enter') {
        const cmd = lineRef.current.trim();
        if (!cmd) return;
        setOut([{ text: `zsh: command not found: ${cmd.split(/\s+/)[0]}`, tone: 'err' }, { text: '…but I can probably build it.', tone: 'mute' }]);
        setLine('');
        return;
      }
      const c = char ?? def.ch;
      if (c) { setOut(null); setLine((l) => (l + c).slice(-MAX)); }
    },
    [press, setLine],
  );

  // the visitor's real keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!inViewRef.current || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
      if (window.scrollY > window.innerHeight * 0.6 || !KEY_BY_CODE.has(e.code)) return;
      const typing = performance.now() - userAt.current < IDLE;
      // Space scrolls the page unless the visitor is already typing here
      if (e.code === 'Space' && !typing) return;
      if (e.code === 'Space' || e.code === 'Quote' || e.code === 'Slash') e.preventDefault();
      userKey(e.code, e.key.length === 1 ? e.key : null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [userKey]);

  // the board types on its own while nobody else is
  useEffect(() => {
    if (!ready || reduced) return;
    let alive = true;
    const timers = new Set<number>();
    const wait = (ms: number) => new Promise<void>((r) => { const id = window.setTimeout(() => { timers.delete(id); r(); }, ms); timers.add(id); });
    const busy = () => performance.now() - userAt.current < IDLE;
    (async () => {
      await wait(1900);
      for (let i = 0; alive; i++) {
        while (alive && (busy() || !inViewRef.current)) await wait(400);
        if (!alive) return;
        const s = SCRIPTS[i % SCRIPTS.length];
        setOut(null);
        setLine('');
        await wait(350);
        let cut = false;
        for (const ch of s.cmd) {
          if (!alive) return;
          if (busy()) { cut = true; break; }
          keysFor(ch).forEach(press);
          setLine((l) => l + ch);
          await wait(45 + Math.random() * 85 + (ch === ' ' ? 70 : 0));
        }
        if (cut) continue;
        await wait(380);
        if (busy() || !alive) continue;
        press('Enter');
        setOut(s.out);
        await wait(2800);
      }
    })();
    return () => { alive = false; timers.forEach(clearTimeout); };
  }, [ready, reduced, press, setLine]);

  useGSAP(
    () => {
      gsap.to({}, { scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom top', scrub: true, onUpdate: (s) => { progress.current = s.progress; } } });
      if (prefersReducedMotion()) return;
      if (!ready) { gsap.set('[data-sw]', { yPercent: 110 }); gsap.set('[data-sf]', { opacity: 0, y: 12 }); return; }
      gsap.timeline({ defaults: { ease: 'expo.out' } })
        .fromTo('[data-sw]', { yPercent: 110 }, { yPercent: 0, duration: 1.4, stagger: 0.07, delay: 0.2 })
        .fromTo('[data-sf]', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 1, stagger: 0.1 }, 0.9);
      gsap.to('[data-shead]', { yPercent: -35, opacity: 0, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top top', end: '55% top', scrub: true } });
    },
    { scope: ref, dependencies: [ready], revertOnUpdate: true },
  );

  const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <section ref={ref} aria-labelledby="hero-title" className="theme-dark relative h-[100svh] min-h-[620px] overflow-hidden bg-ink">
      {/* dot grid + mint glow */}
      <div aria-hidden="true" className="absolute inset-0 opacity-[0.55]" style={{ backgroundImage: 'radial-gradient(rgb(230 237 243 / 0.09) 1px, transparent 1px)', backgroundSize: '28px 28px', maskImage: 'radial-gradient(120% 90% at 50% 40%, #000 30%, transparent 85%)' }} />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-[-20%] h-[75%]" style={{ background: 'radial-gradient(50% 50% at 50% 50%, rgb(61 220 151 / 0.16), transparent 70%)' }} />

      {webgl && (
        <div className="absolute inset-0">
          <Suspense fallback={null}>
            <KeyboardScene presses={presses} progress={progress} start={ready} active={inView} mobile={!desktop} reduced={reduced} onKey={(c) => userKey(c, null)} />
          </Suspense>
        </div>
      )}

      <div className="pointer-events-none relative flex h-full flex-col page-x pb-7 pt-[calc(var(--header-h)+env(safe-area-inset-top)+1.25rem)] md:pb-9">
        <div data-shead className="text-center">
          <p data-sf className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute md:text-xs">
            <span className="text-accent">//</span> Creative developer · {profile.location}
          </p>
          <h1 id="hero-title" className="mx-auto mt-4 font-display font-normal leading-[0.98] tracking-[-0.045em] text-bone" style={{ fontSize: 'clamp(2.3rem, 5.4vw, 6.2rem)' }} aria-label={profile.heroHeadline.join(' ')}>
            {profile.heroHeadline.map((l) => {
              const t = titleCase(l);
              const dot = t.endsWith('.');
              return (
                <span key={l} className="block overflow-hidden pb-[0.12em] -mb-[0.12em]" aria-hidden="true">
                  <span data-sw className="block">
                    {dot ? t.slice(0, -1) : t}
                    {dot && <span style={{ color: 'var(--dot)' }}>.</span>}
                  </span>
                </span>
              );
            })}
          </h1>

          {/* the terminal line the keyboard types into */}
          <div data-sf aria-hidden="true" className="mx-auto mt-6 min-h-[3.6rem] max-w-[min(36rem,100%)] text-left font-mono text-[12.5px] leading-relaxed sm:text-sm md:mt-8">
            <p className="flex min-w-0 items-baseline gap-2 whitespace-pre">
              <span className="shrink-0 text-mute">~/waqar</span>
              <span className="shrink-0 text-accent">❯</span>
              <span className="min-w-0 overflow-hidden text-ellipsis"><Highlight text={line} /></span>
              <span className="-ml-1.5 inline-block h-[1.1em] w-[0.55em] translate-y-[0.18em] animate-[blink_1.05s_steps(1)_infinite] bg-accent" />
            </p>
            {out?.map((o, i) => (
              <p key={i} className="truncate" style={{ color: o.tone === 'ok' ? 'var(--syn-green)' : o.tone === 'err' ? '#ff7b72' : 'rgb(var(--c-mute))' }}>{o.text}</p>
            ))}
          </div>
        </div>

        <div className="mt-auto flex flex-col-reverse items-center gap-4 md:flex-row md:items-end md:justify-between">
          <p data-sf className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-mute">
            <span className="rounded-[3px] border border-line px-1.5 py-0.5 text-bone">{desktop ? 'type' : 'tap'}</span>
            {desktop ? 'Go on — the keyboard is live.' : 'Tap the keys — it’s live.'}
          </p>
          <p data-sf className="max-w-[25rem] text-center text-[14px] leading-snug text-bone/85 md:text-right md:text-[15px]">
            I’m Waqar, a creative developer in Delhi. I design and build websites, online stores and web apps — and wire up the payments and APIs behind them.
          </p>
        </div>
      </div>
    </section>
  );
}
