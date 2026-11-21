import { ArrowUpRight } from 'lucide-react';
import { socials, hasHref } from '@/data/socials';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Magnetic } from '@/components/animations/Magnetic';
import { cn } from '@/utils/cn';

/**
 * All social platforms with their icons. Platforms without a URL yet are shown as
 * "coming soon" (not links) so the set is always complete.
 */
export function SocialList({ variant = 'rows', className }: { variant?: 'rows' | 'pills' | 'icons'; className?: string }) {
  if (variant === 'icons') {
    return (
      <ul className={cn('flex flex-wrap gap-2', className)} aria-label="Social profiles">
        {socials.map((s) => (
          <li key={s.label}>
            {hasHref(s) ? (
              <Magnetic strength={0.3}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`${s.label} (opens in a new tab)`} className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-bone transition-colors duration-300 hover:border-lime hover:bg-lime hover:text-onfill">
                  <BrandIcon icon={s.icon} name={s.label} className="h-4 w-4" />
                </a>
              </Magnetic>
            ) : (
              <span title={`${s.label} — link coming soon`} className="flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-line text-mute">
                <BrandIcon icon={s.icon} name={s.label} className="h-4 w-4" />
                <span className="sr-only">{s.label} — link coming soon</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    );
  }
  if (variant === 'pills') {
    return (
      <ul className={cn('flex flex-wrap gap-2', className)} aria-label="Social profiles">
        {socials.map((s) => (
          <li key={s.label}>
            {hasHref(s) ? (
              <a href={s.href} target="_blank" rel="noopener noreferrer" className="group inline-flex min-h-[44px] items-center gap-2.5 rounded-full border border-line pl-3 pr-4 transition-colors duration-300 hover:border-lime hover:text-accent">
                <BrandIcon icon={s.icon} name={s.label} className="h-4 w-4" />
                {s.label}
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : (
              <span className="inline-flex min-h-[44px] items-center gap-2.5 rounded-full border border-dashed border-line pl-3 pr-4 text-mute">
                <BrandIcon icon={s.icon} name={s.label} className="h-4 w-4" />
                {s.label}
                <span className="text-[11px]">soon</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className={cn('border-t border-line', className)} aria-label="Social profiles">
      {socials.map((s) => (
        <li key={s.label} className="border-b border-line">
          {hasHref(s) ? (
            <a href={s.href} target="_blank" rel="noopener noreferrer" className="group flex min-h-[52px] items-center justify-between gap-4 py-3">
              <span className="flex items-center gap-3">
                <BrandIcon icon={s.icon} name={s.label} className="h-4 w-4 text-mute transition-colors group-hover:text-accent" />
                <span className="transition-transform duration-500 ease-expo group-hover:translate-x-1">{s.label}</span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-mute transition-all duration-500 group-hover:rotate-45 group-hover:text-accent" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : (
            <span className="flex min-h-[52px] items-center justify-between gap-4 py-3 text-mute">
              <span className="flex items-center gap-3">
                <BrandIcon icon={s.icon} name={s.label} className="h-4 w-4" />
                {s.label}
              </span>
              <span className="text-xs">Link coming soon</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
