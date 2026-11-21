import { useId, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface AccordionItem {
  key: string;
  index?: string;
  title: string;
  content: ReactNode;
  aside?: ReactNode;
}

/** Accessible disclosure list (buttons with aria-expanded/controls). One panel open at a time. */
export function Accordion({ items, defaultOpen = 0, size = 'lg' }: { items: AccordionItem[]; defaultOpen?: number | null; size?: 'lg' | 'md' }) {
  const [open, setOpen] = useState<number | null>(defaultOpen);
  const base = useId();
  const reduced = useReducedMotion();

  return (
    <ul className="border-t border-line">
      {items.map((item, i) => {
        const isOpen = open === i;
        const panelId = `${base}-panel-${i}`;
        const btnId = `${base}-btn-${i}`;
        return (
          <li key={item.key} className="border-b border-line">
            <h3>
              <button
                id={btnId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : i)}
                className="group flex w-full items-center gap-4 py-6 text-left md:gap-8 md:py-8"
              >
                {item.index && <span className="w-8 shrink-0 font-mono text-xs text-mute md:w-12">{item.index}</span>}
                <span
                  className={cn(
                    'flex-1 font-display font-semibold tracking-[-0.03em] transition-[color,transform] duration-500 ease-expo md:group-hover:translate-x-3',
                    size === 'lg' ? 'text-[clamp(1.5rem,3.6vw,3.5rem)] leading-[1]' : 'text-[clamp(1.25rem,2.2vw,2rem)] leading-[1.1]',
                    isOpen ? 'text-accent' : 'text-bone',
                  )}
                >
                  {item.title}
                </span>
                {item.aside && <span className="hidden text-sm text-mute md:block">{item.aside}</span>}
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all duration-500 ease-expo',
                    isOpen ? 'rotate-45 border-lime bg-lime text-onfill' : 'border-line text-bone group-hover:border-bone',
                  )}
                >
                  <Plus className="h-4 w-4" />
                </span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className={cn('pb-8 md:pb-10', item.index && 'pl-12 md:pl-20')}>{item.content}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
