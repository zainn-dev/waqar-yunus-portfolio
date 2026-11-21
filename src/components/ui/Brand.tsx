import { cn } from '@/utils/cn';

/** Z monogram drawn with square-capped stroke, plus the brand full stop. */
export function Monogram({ className, title = 'Z' }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 52 32" className={cn('h-8 w-auto', className)} role="img" aria-label={title}>
      <g fill="none" stroke="currentColor" strokeWidth="4.2" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M12 6h16l-16 20h16" />
      </g>
      <rect x="36" y="21.5" width="5" height="5" fill="var(--dot)" />
    </svg>
  );
}

/** Typographic ZAIN. wordmark — live text so it stays crisp and scales with font-size. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-baseline font-display font-bold uppercase leading-none tracking-[-0.06em]', className)}>
      ZAIN
      <span aria-hidden="true" className="ml-[0.04em] inline-block h-[0.2em] w-[0.2em] translate-y-[-0.02em]" style={{ background: 'var(--dot)' }} />
    </span>
  );
}

/** Full-name logo: "Zain" */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-baseline whitespace-nowrap leading-none', className)}>
      <span className="font-brand font-bold tracking-[-0.06em]">Zain</span>
    </span>
  );
}
