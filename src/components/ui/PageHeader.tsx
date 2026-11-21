import type { ReactNode } from 'react';
import { SplitText } from '@/components/animations/SplitText';

export function PageHeader({ title, intro, aside, label }: { title: string[]; intro?: ReactNode; aside?: ReactNode; label: string }) {
  return (
    <header className="page-wrap pb-16 pt-[calc(var(--header-h)+env(safe-area-inset-top)+4rem)] md:pb-24 md:pt-[calc(var(--header-h)+8rem)]">
      <p className="t-label mb-8">{label}</p>
      <SplitText as="h1" lines={title} trigger="mount" delay={0.35} className="t-display" wave />
      {(intro || aside) && (
        <div className="mt-12 grid gap-8 md:mt-16 lg:grid-cols-12">
          {intro && <div className="t-lead max-w-[52ch] text-bone/85 lg:col-span-6">{intro}</div>}
          {aside && <div className="lg:col-span-4 lg:col-start-9 lg:self-end">{aside}</div>}
        </div>
      )}
    </header>
  );
}
