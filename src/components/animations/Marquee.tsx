import { cn } from '@/utils/cn';

/** Seamless CSS marquee. Duplicated content is hidden from assistive tech. */
export function Marquee({ items, className, duration = 38 }: { items: string[]; className?: string; duration?: number }) {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((w) => (
        <li key={w} className="flex items-center">
          <span className="px-[0.35em]">{w}</span>
          <span className="mx-[0.25em] inline-block h-[0.14em] w-[0.6em] bg-lime" aria-hidden="true" />
        </li>
      ))}
    </ul>
  );
  return (
    <div className={cn('marquee overflow-hidden', className)} style={{ ['--marquee-duration' as string]: `${duration}s` }}>
      <p className="sr-only">{items.join(', ')}</p>
      <div className="marquee-track flex w-max" aria-hidden="true">
        {row(true)}
        {row(true)}
        {row(true)}
        {row(true)}
      </div>
    </div>
  );
}
