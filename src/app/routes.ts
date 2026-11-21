import { createElement, lazy, type ComponentType } from 'react';

type PageModule = { default: ComponentType };

/**
 * Route-level code splitting. A page whose chunk has already loaded (preloaded on intent, or
 * visited before) renders straight away instead of through `lazy`: even a cached `lazy` suspends
 * once, and React holds a Suspense fallback for ~300ms, which would blank the screen in the
 * middle of a shared-element morph between pages.
 */
function page(importer: () => Promise<PageModule>) {
  let loaded: ComponentType | null = null;
  const load = () => importer().then((m) => { loaded = m.default; return m; });
  const Lazy = lazy(load);
  const Page = (props: Record<string, never>) => createElement(loaded ?? Lazy, props);
  return { Page, load };
}

const pages = {
  home: page(() => import('@/pages/Home')),
  about: page(() => import('@/pages/About')),
  project: page(() => import('@/pages/ProjectDetail')),
  contact: page(() => import('@/pages/Contact')),
  social: page(() => import('@/pages/Social')),
  notFound: page(() => import('@/pages/NotFound')),
};

export const Home = pages.home.Page;
export const About = pages.about.Page;
export const ProjectDetail = pages.project.Page;
export const Contact = pages.contact.Page;
export const Social = pages.social.Page;
export const NotFound = pages.notFound.Page;

export const preloadRoutes = () => Object.values(pages).forEach((p) => p.load().catch(() => undefined));

/** Prefetch a single route's chunk from its path (used on hover / focus / touch intent). */
export const preloadPath = (path: string) => {
  const seg = path.split(/[?#]/)[0];
  const p =
    seg === '/' ? pages.home
    : seg.startsWith('/projects/') ? pages.project
    : (pages as Record<string, { load: () => Promise<unknown> }>)[seg.slice(1)];
  p?.load().catch(() => undefined);
};
