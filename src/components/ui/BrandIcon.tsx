import { brandIcons } from '@/lib/icons';
import { cn } from '@/utils/cn';

/** Technology mark from simple-icons (CC0), with a typographic fallback. */
export function BrandIcon({ icon, name, className }: { icon?: string; name: string; className?: string }) {
  const data = icon ? brandIcons[icon] : undefined;
  if (!data) {
    return (
      <span aria-hidden="true" className={cn('inline-flex items-center justify-center font-mono text-[0.7em] font-semibold', className)}>
        {name.replace(/[^A-Za-z]/g, '').slice(0, 2)}
      </span>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn('fill-current', className)}>
      <path d={data.path} />
    </svg>
  );
}
