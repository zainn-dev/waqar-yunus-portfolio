import { lazy, Suspense, useEffect, useRef, useState, type ComponentType, type LazyExoticComponent } from 'react';
import type { ExperimentId } from '@/data/playground';
import { cn } from '@/utils/cn';

const registry: Record<Exclude<ExperimentId, 'social-orbit'>, LazyExoticComponent<ComponentType>> = {
  'particle-type': lazy(() => import('@/components/playground/ParticleType')),
  'magnetic-grid': lazy(() => import('@/components/playground/MagneticGrid')),
  'flow-field': lazy(() => import('@/components/playground/FlowField')),
  'text-scramble': lazy(() => import('@/components/playground/TextScramble')),
  'image-distort': lazy(() => import('@/components/playground/ImageDistort')),
};

/** Mounts an experiment only once it's near the viewport. */
export function ExperimentFrame({ id, className }: { id: Exclude<ExperimentId, 'social-orbit'>; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setNear(true), io.disconnect()), { rootMargin: '300px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  const C = registry[id];
  return (
    <div ref={ref} className={cn('theme-dark relative overflow-hidden rounded-[3px] bg-stage', className)}>
      {near && (
        <Suspense fallback={null}>
          <C />
        </Suspense>
      )}
    </div>
  );
}
