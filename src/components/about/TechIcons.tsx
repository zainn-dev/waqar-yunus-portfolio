import type { CSSProperties } from 'react';
import {
  siReact, siTypescript, siJavascript, siHtml5, siCss3, siTailwindcss, siVite, siNodedotjs, siExpress,
  siPhp, siMongodb, siMysql, siFirebase, siWordpress, siWoocommerce, siGreensock, siVercel, siBootstrap,
} from 'simple-icons';

type Icon = { title: string; hex: string; path: string };

/** Brand colours too dark for the ink background fall back to the site's red accent. */
const DARK = new Set(['000000', '000']);

export const TECH: { name: string; icon: Icon }[] = [
  { name: 'HTML5', icon: siHtml5 }, { name: 'CSS3', icon: siCss3 }, { name: 'JavaScript', icon: siJavascript },
  { name: 'TypeScript', icon: siTypescript }, { name: 'React', icon: siReact }, { name: 'Vite', icon: siVite },
  { name: 'Tailwind CSS', icon: siTailwindcss }, { name: 'Bootstrap', icon: siBootstrap }, { name: 'GSAP', icon: siGreensock },
  { name: 'Node.js', icon: siNodedotjs }, { name: 'Express', icon: siExpress }, { name: 'PHP', icon: siPhp },
  { name: 'MongoDB', icon: siMongodb }, { name: 'MySQL', icon: siMysql }, { name: 'Firebase', icon: siFirebase },
  { name: 'WordPress', icon: siWordpress }, { name: 'WooCommerce', icon: siWoocommerce }, { name: 'Vercel', icon: siVercel },
];

const BY_NAME = new Map(TECH.map((t) => [t.name.toLowerCase(), t]));
export const findTech = (name: string) => BY_NAME.get(name.toLowerCase());

const brand = (i: Icon) => (DARK.has(i.hex.toLowerCase()) ? 'rgb(var(--c-accent))' : `#${i.hex}`);

export function TechGlyph({ name, size = 14 }: { name: string; size?: number }) {
  const t = findTech(name);
  if (!t) return null;
  return (
    <svg role="img" aria-label={t.name} viewBox="0 0 24 24" width={size} height={size} className="tech-glyph inline-block shrink-0 fill-current" style={{ '--brand': brand(t.icon) } as CSSProperties}>
      <title>{t.name}</title>
      <path d={t.icon.path} />
    </svg>
  );
}

export function TechGrid() {
  return (
    <ul className="tech-grid grid grid-cols-4 border-l border-t border-[var(--grid)] sm:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6">
      {TECH.map((t, i) => (
        <li key={t.name} className="border-b border-r border-[var(--grid)]">
          <span
            tabIndex={0}
            aria-label={t.name}
            title={t.name}
            className="tech-cell group relative flex aspect-square items-center justify-center outline-none focus-visible:ring-1 focus-visible:ring-accent"
            style={{ '--brand': brand(t.icon), '--i': i } as CSSProperties}
          >
            <span className="tech-bob block">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="tech-svg h-7 w-7">
                <path d={t.icon.path} />
              </svg>
            </span>
            <span className="tech-tip pointer-events-none absolute -top-2 left-1/2 z-10 whitespace-nowrap border border-[var(--grid)] bg-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-bone">
              {t.name}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
