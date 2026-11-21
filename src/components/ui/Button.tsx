import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Magnetic } from '@/components/animations/Magnetic';
import { cn } from '@/utils/cn';

type Variant = 'solid' | 'outline' | 'ghost';

interface ButtonLinkProps {
  to?: string;
  href?: string;
  children: ReactNode;
  variant?: Variant;
  magnetic?: boolean;
  className?: string;
  icon?: boolean;
  onClick?: () => void;
  external?: boolean;
}

const base =
  'group relative inline-flex min-h-[48px] items-center justify-center gap-3 overflow-hidden rounded-full px-6 font-display text-[0.95rem] font-semibold tracking-tight transition-colors duration-500 ease-expo';
const variants: Record<Variant, string> = {
  solid: 'bg-lime text-onfill',
  outline: 'border border-line text-bone hover:border-bone',
  ghost: 'text-bone',
};

/** Pill CTA with a sliding fill on hover. Renders <Link>, <a> or <button>. */
export function ButtonLink({ to, href, children, variant = 'solid', magnetic = false, className, icon = true, onClick, external }: ButtonLinkProps) {
  const inner = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-0 translate-y-full rounded-full transition-transform duration-500 ease-expo group-hover:translate-y-0',
          variant === 'solid' ? 'bg-bone' : 'bg-lime',
        )}
      />
      <span className={cn('relative z-10 transition-colors duration-500', variant !== 'solid' && 'group-hover:text-onfill')}>{children}</span>
      {icon && (
        <ArrowUpRight
          aria-hidden="true"
          className={cn('relative z-10 h-4 w-4 transition-transform duration-500 ease-expo group-hover:rotate-45', variant !== 'solid' && 'group-hover:text-onfill')}
        />
      )}
    </>
  );
  const cls = cn(base, variants[variant], className);
  const el = to ? (
    <Link to={to} className={cls} onClick={onClick}>{inner}</Link>
  ) : href ? (
    <a href={href} className={cls} onClick={onClick} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {inner}
      {external && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  ) : (
    <button type="button" className={cls} onClick={onClick}>{inner}</button>
  );
  return magnetic ? <Magnetic strength={0.3}>{el}</Magnetic> : el;
}
