import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useParams, useRoutes } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { ScrollProgress } from '@/components/layout/ScrollProgress';
import { PageShell } from '@/components/layout/PageShell';
import { getRenderedKey, scrollPositions } from '@/lib/scroll';
import { Cursor } from '@/components/animations/Cursor';
import { GalleryCursorLayer } from '@/components/projects/GalleryCursor';
import { GlobeDock } from '@/components/home/GlobeButton';
import { Loader } from '@/components/animations/Loader';
import { shouldShowIntro } from '@/lib/intro';
import { IntroContext } from '@/app/intro';
import { PanelContext } from '@/app/panel';
import * as R from '@/app/routes';
import { morph } from '@/lib/morph';
import { getProject, legacySlugs, projectPath } from '@/data/projects';

const labelFor = (path: string) => {
  if (path === '/') return 'Home';
  if (path.startsWith('/projects/')) return getProject(path.split('/')[2])?.title ?? 'Project';
  const seg = path.split('/')[1] ?? '';
  return seg ? seg[0].toUpperCase() + seg.slice(1) : 'Home';
};

/** Old /work/:slug links keep working; removed projects go home. */
function LegacyProject() {
  const { slug } = useParams();
  const next = slug ? legacySlugs[slug] : undefined;
  return <Navigate to={next ? projectPath(next) : '/'} replace />;
}

export default function App() {
  const location = useLocation();
  const [intro, setIntro] = useState(() => location.pathname === '/' && shouldShowIntro());
  // `revealed`: the loader has started handing over to the page (its globe becomes the home globe)
  const [revealed, setRevealed] = useState(() => !intro);
  const finishIntro = useCallback(() => { setRevealed(true); setIntro(false); }, []);
  const revealIntro = useCallback(() => setRevealed(true), []);

  // Re-assert on every navigation: some libraries reset it to 'auto'.
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  }, [location.key]);

  // Track scroll position for the current history entry (used for back/forward restoration).
  useEffect(() => {
    // Only record while the page on screen belongs to this history entry (not mid-transition).
    const save = () => {
      if (getRenderedKey() === location.key) scrollPositions.set(location.key, window.scrollY);
    };
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, [location.key]);

  // Prefetch a route's chunk when the visitor shows intent (hover, keyboard focus, touch),
  // and warm everything else well after first load so it never competes with the first paint.
  useEffect(() => {
    const onIntent = (e: Event) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="/"]');
      if (a) R.preloadPath(a.getAttribute('href')!);
    };
    const opts = { passive: true, capture: true } as const;
    document.addEventListener('pointerover', onIntent, opts);
    document.addEventListener('focusin', onIntent, opts);
    document.addEventListener('touchstart', onIntent, opts);
    const idle = window.setTimeout(R.preloadRoutes, 8000);
    return () => {
      document.removeEventListener('pointerover', onIntent, opts);
      document.removeEventListener('focusin', onIntent, opts);
      document.removeEventListener('touchstart', onIntent, opts);
      clearTimeout(idle);
    };
  }, []);

  const element = useRoutes(
    [
      { path: '/', element: <R.Home /> },
      { path: '/about', element: <R.About /> },
      { path: '/work', element: <Navigate to="/" replace /> },
      { path: '/work/:slug', element: <LegacyProject /> },
      { path: '/projects', element: <Navigate to="/" replace /> },
      { path: '/projects/:slug', element: <R.ProjectDetail /> },
      { path: '/contact', element: <R.Contact /> },
      { path: '/social', element: <R.Social /> },
      ...['/playground', '/services', '/skills', '/experience'].map((path) => ({ path, element: <Navigate to="/" replace /> })),
      { path: '*', element: <R.NotFound /> },
    ],
    location,
  );

  // Memoised so state changes in App (e.g. the intro finishing) don't re-render the whole page tree.
  const page = useMemo(
    () => (
      <PageShell key={location.pathname} label={labelFor(location.pathname)}>
        {element}
      </PageShell>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location.key],
  );
  const introValue = useMemo(() => ({ ready: revealed }), [revealed]);
  const [panelOpen, setPanelOpen] = useState(false);
  const panelValue = useMemo(() => ({ open: panelOpen, setOpen: setPanelOpen }), [panelOpen]);

  return (
    <IntroContext.Provider value={introValue}>
    <PanelContext.Provider value={panelValue}>
      <a
        href="#main"
        className="fixed left-4 top-4 z-[200] -translate-y-24 rounded-full bg-lime px-5 py-3 font-display font-semibold text-onfill transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      {intro && <Loader onDone={finishIntro} onReveal={revealIntro} />}
      <ScrollProgress />
      <Header />
      <main id="main" tabIndex={-1} className="outline-none">
        <AnimatePresence mode="wait" initial={false} custom={morph.nav}>
          {page}
        </AnimatePresence>
      </main>
      <Cursor />
      <GalleryCursorLayer />
      <GlobeDock />
    </PanelContext.Provider>
    </IntroContext.Provider>
  );
}
