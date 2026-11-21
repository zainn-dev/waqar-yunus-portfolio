import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';

/**
 * Floating "back to the globe" button: a small glass globe with our "W" mark. The sphere is layered
 * CSS (a frosted, lit glass body + a specular highlight that follows the pointer), wrapped in a
 * wireframe of latitude rings and meridians that sweep around to fake the spin (pure CSS; still
 * under reduced motion). Hover lifts it and turns the light towards the pointer; a click spins it
 * up before the page goes.
 */
export function GlobeButton({ onClick, className, hidden }: { onClick: () => void; className?: string; hidden?: boolean }) {
  const [go, setGo] = useState(false);
  const meridians = [0, 1, 2, 3, 4, 5];
  const light = (e: React.PointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--gx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
    e.currentTarget.style.setProperty('--gy', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
  };
  const unlight = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.style.removeProperty('--gx');
    e.currentTarget.style.removeProperty('--gy');
  };
  return (
    <button
      type="button"
      onClick={() => { setGo(true); onClick(); }}
      onPointerMove={light}
      onPointerLeave={unlight}
      aria-label="Back to the globe"
      data-cursor-hide=""
      tabIndex={hidden ? -1 : 0}
      className={cn(
        'globe-btn group fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 z-40 grid h-[52px] w-[52px] cursor-pointer place-items-center rounded-full text-bone transition-[transform,opacity] duration-500 ease-expo hover:scale-[1.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bone/60 lg:bottom-6 lg:left-6 lg:h-24 lg:w-24',
        go && 'globe-btn--go',
        hidden && 'pointer-events-none scale-75 opacity-0',
        className,
      )}
    >
      <span aria-hidden="true" className="globe-glass absolute inset-0 rounded-full" />
      <svg viewBox="0 0 100 100" className="absolute inset-[5%] h-[90%] w-[90%] overflow-visible" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="0.85" className="opacity-45 transition-opacity duration-500 group-hover:opacity-70">
          {[-34, -17, 0, 17, 34].map((y) => {
            const r = Math.sqrt(46 * 46 - y * y);
            return <ellipse key={y} cx="50" cy={50 + y} rx={r} ry={r * 0.16} />;
          })}
          {meridians.map((m) => (
            <ellipse key={m} className="globe-meridian" cx="50" cy="50" rx="46" ry="46" style={{ animationDelay: `${(-m * 6) / meridians.length}s` }} />
          ))}
        </g>
      </svg>
      <span aria-hidden="true" className="globe-spec pointer-events-none absolute inset-0 rounded-full" />
      <span className="relative font-serif text-[1.35rem] leading-none text-[#FFFDEB] [text-shadow:0_1px_0_rgba(0,0,0,0.35),0_0_16px_rgba(255,253,219,0.5)] lg:text-[2.35rem]" aria-hidden="true">W</span>
    </button>
  );
}

/**
 * The W globe on every other page (About, Contact, …): takes you back to the project globe. Home and
 * project pages place their own (it closes the open project there).
 */
export function GlobeDock() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  if (pathname === '/' || pathname.startsWith('/projects/')) return null;
  return <GlobeButton key={pathname} onClick={() => navigate('/', { state: { fromGlobeButton: true } })} />;
}
