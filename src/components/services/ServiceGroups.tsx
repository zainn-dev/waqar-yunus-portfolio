import type { ComponentType } from 'react';
import { serviceGroups } from '@/data/home';
import type { ServiceGroup } from '@/types/content';
import { TechList } from '@/components/projects/ProjectMeta';
import { Reveal } from '@/components/animations/Reveal';
import { ApiDemo, CartDemo, CubeDemo, ResponsiveDemo } from '@/components/services/Demos';

const demos: Record<ServiceGroup['id'], ComponentType> = {
  web: ResponsiveDemo,
  interactive: CubeDemo,
  commerce: CartDemo,
  backend: ApiDemo,
};

function HeadingMarquee({ words, reverse }: { words: string[]; reverse?: boolean }) {
  const row = (hidden: boolean) => (
    <span className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {words.map((w) => (
        <span key={w} className="flex items-center">
          <span className="px-[0.3em]">{w}</span>
          <span className="mx-[0.2em] inline-block h-[0.12em] w-[0.12em] rounded-full bg-current opacity-40" />
        </span>
      ))}
    </span>
  );
  return (
    <div className="marquee overflow-hidden border-y border-line py-3" aria-hidden="true" style={{ ['--marquee-duration' as string]: '30s' }}>
      <div className="marquee-track flex w-max font-display text-[clamp(2.5rem,7vw,7rem)] font-normal leading-none tracking-[-0.05em]" style={{ animationDirection: reverse ? 'reverse' : 'normal' }}>
        {row(true)}{row(true)}{row(true)}{row(true)}
      </div>
    </div>
  );
}

/**
 * Four service groups in an editorial layout: marquee heading, description, technologies,
 * three value propositions, six capabilities and a small working demo on a dark stage.
 * `compact` (home page) omits capabilities and technologies.
 */
export function ServiceGroups({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      {serviceGroups.map((g, i) => {
        const Demo = demos[g.id];
        return (
          <section key={g.id} aria-labelledby={`sg-${g.id}`} className="py-14 md:py-20">
            <HeadingMarquee words={g.marquee} reverse={i % 2 === 1} />
            <div className="page-wrap mt-12 grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-12 lg:gap-8">
              <div className="min-w-0 lg:col-span-5">
                <p className="font-mono text-xs text-mute">{String(i + 1).padStart(2, '0')}</p>
                <h3 id={`sg-${g.id}`} className="mt-3 font-display text-[clamp(1.9rem,3.2vw,3rem)] font-normal leading-[1] tracking-[-0.04em]">{g.title}</h3>
                <p className="mt-5 max-w-[46ch] text-bone/80">{g.description}</p>
                {!compact && <TechList stack={g.technologies} className="mt-6" />}
                <Reveal as="ul" stagger="li" y={16} className="mt-10 grid gap-6 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  {g.values.map((v) => (
                    <li key={v.title} className="border-t border-line pt-4">
                      <h4 className="font-display text-lg font-medium tracking-tight">{v.title}</h4>
                      <p className="mt-1 text-sm text-mute">{v.body}</p>
                    </li>
                  ))}
                </Reveal>
                {!compact && (
                  <div className="mt-10">
                    <h4 className="font-mono text-xs uppercase tracking-[0.1em] text-mute">Capabilities</h4>
                    <ul className="mt-4 grid border-t border-line sm:grid-cols-2">
                      {g.capabilities.map((c) => (
                        <li key={c} className="flex items-center gap-3 border-b border-line py-3 text-sm">
                          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 bg-bone" />{c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="min-w-0 lg:col-span-6 lg:col-start-7">
                <div className="theme-dark overflow-hidden rounded-[3px] bg-stage p-5 sm:p-6 md:p-10">
                  <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.1em] text-mute">Try it</p>
                  <Demo />
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
