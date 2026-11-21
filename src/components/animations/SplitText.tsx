import { useRef, type ElementType } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { prefersReducedMotion } from '@/utils/motion';
import { cn } from '@/utils/cn';

interface SplitTextProps {
  lines: string[];
  as?: ElementType;
  className?: string;
  lineClassName?: string;
  /** "words" staggers each word inside its masked line. */
  by?: 'lines' | 'words';
  /** "scroll" reveals when entering the viewport, "mount" immediately (after `delay`). */
  trigger?: 'scroll' | 'mount';
  delay?: number;
  stagger?: number;
  id?: string;
  /** Paint each piece with the moving colour band (.text-wave). */
  wave?: boolean;
}

/**
 * Masked typographic reveal. Text is real, selectable DOM and fully visible without JS;
 * the hidden start state is only applied by GSAP at runtime.
 */
export function SplitText({
  lines, as: Tag = 'h2', className, lineClassName, by = 'lines', trigger = 'scroll', delay = 0, stagger = 0.08, id, wave = false,
}: SplitTextProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ref.current || prefersReducedMotion()) return;
      const targets = ref.current.querySelectorAll('[data-split]');
      gsap.from(targets, {
        yPercent: 110,
        rotate: 2,
        duration: 1.25,
        delay,
        stagger,
        ease: 'expo.out',
        scrollTrigger: trigger === 'scroll' ? { trigger: ref.current, start: 'top 88%', once: true } : undefined,
      });
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={className} id={id} aria-label={lines.join(' ')}>
      {lines.map((line, i) => (
        <span key={i} className={cn('line-mask', lineClassName)} aria-hidden="true">
          {by === 'words' ? (
            <span className="!flex flex-wrap gap-x-[0.22em]">
              {line.split(' ').map((w, j) => (
                <span key={j} className="inline-block overflow-hidden pb-[0.08em] -mb-[0.08em]">
                  <span data-split className={cn('inline-block', wave && 'text-wave')} style={wave ? { ['--wave-delay' as string]: `${(i + j * 0.3) * 0.5}s` } : undefined}>{w}</span>
                </span>
              ))}
            </span>
          ) : (
            <span data-split className={wave ? 'text-wave' : undefined} style={wave ? { ['--wave-delay' as string]: `${i * 0.6}s` } : undefined}>{line}</span>
          )}
        </span>
      ))}
    </Tag>
  );
}
