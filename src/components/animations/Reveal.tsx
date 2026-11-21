import { useRef, type ReactNode } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { prefersReducedMotion } from '@/utils/motion';

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Children matching this selector are staggered; otherwise the wrapper itself animates. */
  stagger?: string;
  y?: number;
  as?: 'div' | 'section' | 'ul' | 'ol' | 'figure';
}

/** Restrained scroll reveal. Content is visible by default; animation only runs when allowed. */
export function Reveal({ children, className, stagger, y = 32, as: Tag = 'div' }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (!ref.current || prefersReducedMotion()) return;
      const targets = stagger ? ref.current.querySelectorAll(stagger) : ref.current;
      gsap.from(targets, {
        y, opacity: 0, duration: 1, stagger: 0.07, ease: 'expo.out',
        scrollTrigger: { trigger: ref.current, start: 'top 90%', once: true },
      });
    },
    { scope: ref },
  );
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} className={className}>
      {children}
    </Tag>
  );
}
