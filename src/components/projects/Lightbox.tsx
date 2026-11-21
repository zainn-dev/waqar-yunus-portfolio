import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { ProjectImage } from '@/types/content';
import { useScrollLock } from '@/hooks/useScrollLock';

/** Full-screen image viewer: Escape / arrow keys / swipe, focus trapped and restored. */
export function Lightbox({ images, index, onChange, onClose }: {
  images: ProjectImage[]; index: number | null; onChange: (i: number) => void; onClose: () => void;
}) {
  const open = index !== null;
  const dialog = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onChange(((index ?? 0) + 1) % images.length);
      if (e.key === 'ArrowLeft') onChange(((index ?? 0) - 1 + images.length) % images.length);
      if (e.key === 'Tab' && dialog.current) {
        const f = Array.from(dialog.current.querySelectorAll<HTMLElement>('button'));
        const i = f.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length]?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prevFocus?.focus(); };
  }, [open, index, images.length, onChange, onClose]);

  const img = open ? images[index!] : null;

  return (
    <AnimatePresence>
      {img && (
        <motion.div
          ref={dialog}
          role="dialog"
          aria-modal="true"
          aria-label={`Image ${index! + 1} of ${images.length}`}
          className="fixed inset-0 z-[80] flex flex-col bg-ink/95 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onPointerDown={(e) => (startX.current = e.clientX)}
          onPointerUp={(e) => {
            if (startX.current === null) return;
            const dx = e.clientX - startX.current;
            startX.current = null;
            if (Math.abs(dx) > 50) onChange((index! + (dx < 0 ? 1 : -1) + images.length) % images.length);
          }}
        >
          <div className="flex items-center justify-between page-x pt-[max(1rem,env(safe-area-inset-top))]">
            <span className="font-mono text-xs text-mute">{index! + 1} / {images.length}</span>
            <button type="button" onClick={onClose} className="flex h-12 w-12 items-center justify-center rounded-full border border-line" aria-label="Close image viewer">
              <X className="h-5 w-5" />
            </button>
          </div>
          <figure className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-4 md:p-10">
            <motion.img
              key={img.src}
              src={img.src}
              alt={img.alt}
              width={img.width}
              height={img.height}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-h-full max-w-full select-none object-contain"
              draggable={false}
            />
            {img.caption && <figcaption className="text-sm text-mute">{img.caption}</figcaption>}
          </figure>
          {images.length > 1 && (
            <div className="flex justify-center gap-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <button type="button" onClick={() => onChange((index! - 1 + images.length) % images.length)} className="flex h-12 w-12 items-center justify-center rounded-full border border-line" aria-label="Previous image">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => onChange((index! + 1) % images.length)} className="flex h-12 w-12 items-center justify-center rounded-full border border-line" aria-label="Next image">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
