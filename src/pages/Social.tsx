import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { SocialOrbit } from '@/components/social/SocialOrbit';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { socials, hasHref } from '@/data/socials';
import { pageMeta } from '@/data/seo';

/** /social — the particle stage on top, a plain card index of every platform below. */
export default function Social() {
  return (
    <>
      <Seo title={pageMeta['/social'].title} description={pageMeta['/social'].description} />
      <h1 className="sr-only">Social profiles</h1>
      <SocialOrbit heading={false} fill />

      <section aria-labelledby="social-index" className="border-t border-[var(--grid)] bg-ink px-4 py-12 sm:px-8 lg:px-14">
        <h2 id="social-index" className="font-display text-[clamp(2rem,4vw,3.5rem)] uppercase leading-none text-bone">Find me online</h2>
        <ul className="mt-8 grid gap-px bg-[var(--grid)] sm:grid-cols-2 lg:grid-cols-3">
          {socials.map((s) => {
            const linked = hasHref(s);
            const body = (
              <>
                <BrandIcon icon={s.icon} name={s.label} className="h-7 w-7" />
                <span className="flex-1">
                  <span className="block font-display text-2xl uppercase text-bone">{s.label}</span>
                  <span className="block font-mono text-xs text-mute">{linked ? s.handle || 'Open profile' : 'Coming soon — get in touch'}</span>
                </span>
                <ArrowUpRight aria-hidden="true" className="h-5 w-5 text-mute transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-lime" />
              </>
            );
            const cls = 'group flex min-h-[96px] items-center gap-5 bg-ink px-6 py-5 text-bone transition-colors duration-300 hover:bg-ink-2';
            return (
              <li key={s.label} className="flex">
                {linked ? (
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className={cls + ' w-full'}>{body}<span className="sr-only"> (opens in a new tab)</span></a>
                ) : (
                  <Link to="/contact" className={cls + ' w-full'}>{body}</Link>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
