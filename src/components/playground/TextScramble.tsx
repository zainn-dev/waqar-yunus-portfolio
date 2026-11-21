import { useState } from 'react';
import { Scramble } from '@/components/animations/Scramble';

const WORDS = ['Design', 'Develop', 'Animate', 'Integrate', 'Launch'];

function Word({ w }: { w: string }) {
  const [on, setOn] = useState(false);
  return (
    <li>
      <button
        type="button"
        onMouseEnter={() => setOn(true)}
        onMouseLeave={() => setOn(false)}
        onFocus={() => setOn(true)}
        onBlur={() => setOn(false)}
        onClick={() => { setOn(false); requestAnimationFrame(() => setOn(true)); }}
        className="text-left font-display text-[clamp(2rem,5vw,4.5rem)] font-medium uppercase leading-[0.95] tracking-[-0.04em] text-mute transition-colors hover:text-bone focus-visible:text-bone"
      >
        <Scramble text={w} active={on} />
      </button>
    </li>
  );
}

/** Hover, focus or tap a word to decode it. */
export default function TextScramble() {
  return (
    <ul className="flex h-full flex-col justify-center gap-1 p-6 md:p-10">
      {WORDS.map((w) => <Word key={w} w={w} />)}
    </ul>
  );
}
