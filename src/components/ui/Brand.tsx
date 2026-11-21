import { cn } from '@/utils/cn';

/** WY monogram — W and Y drawn from the same square-capped stroke, plus the brand full stop. */
export function Monogram({ className, title = 'WY' }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 52 32" className={cn('h-8 w-auto', className)} role="img" aria-label={title}>
      <g fill="none" stroke="currentColor" strokeWidth="4.2" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M3 4l5 24 6-16 6 16 5-24" />
        <path d="M30 4l6 12 6-12M36 16v12" />
      </g>
      <rect x="45" y="23.5" width="5" height="5" fill="var(--dot)" />
    </svg>
  );
}

/** Typographic WAQAR. wordmark — live text so it stays crisp and scales with font-size. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-baseline font-display font-bold uppercase leading-none tracking-[-0.06em]', className)}>
      WAQAR
      <span aria-hidden="true" className="ml-[0.04em] inline-block h-[0.2em] w-[0.2em] translate-y-[-0.02em]" style={{ background: 'var(--dot)' }} />
    </span>
  );
}

/** Full-name logo: a grotesk "Waqar" against a serif-italic "Yunus", plus the brand dot. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-baseline whitespace-nowrap leading-none', className)}>
      <span className="font-brand font-bold tracking-[-0.06em]">Waqar</span>
      <span className="ml-[0.14em] font-serif text-[1.12em] italic tracking-[-0.01em]">Yunus</span>
    </span>
  );
}
