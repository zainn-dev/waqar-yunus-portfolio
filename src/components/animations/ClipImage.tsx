import { useRef, type ReactNode } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { prefersReducedMotion } from '@/utils/motion';
import { cn } from '@/utils/cn';

/** Clip-path reveal + gentle parallax for media blocks. */
export function ClipImage({ children, className, parallax = 8 }: { children: ReactNode; className?: string; parallax?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (!ref.current || prefersReducedMotion()) return;
      const inner = ref.current.querySelector('[data-parallax]');
      gsap.fromTo(
        ref.current,
        { clipPath: 'inset(18% 8% 18% 8%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: ref.current, start: 'top 85%', once: true } },
      );
      if (inner && parallax) {
        gsap.fromTo(inner, { yPercent: -parallax }, {
          yPercent: parallax, ease: 'none',
          scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      }
    },
    { scope: ref },
  );
  return (
    <div ref={ref} className={cn('relative overflow-hidden', className)}>
      <div data-parallax className="absolute inset-[-10%_0]">
        {children}
      </div>
    </div>
  );
}
