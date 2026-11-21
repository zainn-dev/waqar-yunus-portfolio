import { useEffect, useSyncExternalStore } from 'react';
import { play, sound } from '@/lib/sound';
import { cn } from '@/utils/cn';

const useSoundOn = () => useSyncExternalStore(sound.subscribe, () => sound.enabled, () => false);

/** SOUND toggle with animated level bars (bars move only while sound is on). */
export function SoundToggle({ className }: { className?: string }) {
  const on = useSoundOn();

  // While enabled: soft click on any link/button press, tick on primary nav hover.
  useEffect(() => {
    if (!on) return;
    const down = (e: PointerEvent) => {
      if ((e.target as Element)?.closest?.('a, button, [role="button"]')) play('click');
    };
    const over = (e: PointerEvent) => {
      if ((e.target as Element)?.closest?.('[data-sound="tick"]')) play('tick');
    };
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('pointerover', over, true);
    return () => {
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('pointerover', over, true);
    };
  }, [on]);

  return (
    <button
      type="button"
      onClick={() => sound.toggle()}
      aria-pressed={on}
      aria-label={on ? 'Turn interface sound off' : 'Turn interface sound on'}
      className={cn('group inline-flex min-h-[44px] items-center gap-2 px-2 font-display text-[11px] font-bold uppercase tracking-[0.08em]', className)}
    >
      <span className="hidden sm:inline">Sound</span>
      <span aria-hidden="true" className="flex h-3 items-end gap-[2px]">
        {[0.5, 1, 0.7, 0.35].map((h, i) => (
          <span
            key={i}
            className="w-[2px] origin-bottom bg-current"
            style={{
              height: `${h * 100}%`,
              animation: on ? `eq ${0.5 + i * 0.13}s ease-in-out ${i * 0.07}s infinite alternate` : undefined,
              transform: on ? undefined : 'scaleY(0.35)',
            }}
          />
        ))}
      </span>
    </button>
  );
}
