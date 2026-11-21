import type { CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';

const SLICES = 14;

const css = `
.gs-root{container-type:size;position:relative;overflow:hidden;border-radius:1.25rem;background:#FF3831}
.gs-slice{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;will-change:transform}
.gs-word{writing-mode:vertical-rl;transform:rotate(180deg);font-weight:800;text-transform:uppercase;line-height:.8;color:#181616;font-size:min(100cqw,30cqh);letter-spacing:-.02em;white-space:nowrap}
.gs-anim .gs-slice{animation:gs-jit var(--d) steps(1,end) infinite;animation-delay:var(--o)}
.gs-anim .gs-wrap{animation:gs-burst 5.2s steps(1,end) infinite}
.gs-drift{position:absolute;inset:0}
.gs-anim .gs-drift{animation:gs-drift 14s ease-in-out infinite alternate}
.gs-rgb{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none}
.gs-rgb .gs-word{color:transparent}
.gs-r .gs-word{-webkit-text-stroke:0;color:#00E5FF;mix-blend-mode:multiply}
.gs-b .gs-word{color:#F4EFE6;mix-blend-mode:screen}
.gs-anim .gs-r{animation:gs-rgbr 5.2s steps(1,end) infinite}
.gs-anim .gs-b{animation:gs-rgbb 5.2s steps(1,end) infinite}
.gs-anim:hover .gs-wrap,.gs-anim:hover .gs-r,.gs-anim:hover .gs-b{animation-duration:1.1s}
.gs-anim:hover .gs-slice{animation-duration:.45s}
.gs-root::after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.07) 0 1px,transparent 1px 3px);mix-blend-mode:multiply}
@media (max-width:1023px){.gs-word{writing-mode:horizontal-tb;transform:none;font-size:min(80cqh,26cqw)}@keyframes gs-drift{0%{transform:translateX(-4%)}100%{transform:translateX(4%)}}}
@keyframes gs-drift{0%{transform:translateY(-7%)}100%{transform:translateY(7%)}}
@keyframes gs-rgbr{0%,86%,100%{opacity:0;transform:none}88%{opacity:.85;transform:translate(-4%,1%)}91%{opacity:.7;transform:translate(3%,-1%)}94%{opacity:.5;transform:translate(-1.5%,0)}}
@keyframes gs-rgbb{0%,86%,100%{opacity:0;transform:none}88%{opacity:.6;transform:translate(4%,-1%)}91%{opacity:.5;transform:translate(-3%,1%)}}
@keyframes gs-jit{0%{transform:translateX(0)}20%{transform:translateX(var(--x1))}40%{transform:translateX(0)}60%{transform:translateX(var(--x2))}80%{transform:translateX(calc(var(--x1)*-.5))}}
@keyframes gs-burst{0%,86%,100%{transform:none;filter:none}88%{transform:translateX(-6%) skewY(2deg);filter:url(#gs-melt)}91%{transform:translateX(5%);filter:url(#gs-melt)}94%{transform:translateX(-2%) scaleY(1.03)}}
`;

/** Tall red strip with a sliced, jittering vertical word. Original effect: clip-path bands offset per slice. */
export function GlitchStrip({ word = 'BUILD', className = '' }: { word?: string; className?: string }) {
  const reduced = useReducedMotion();
  // deterministic pseudo-random offsets per slice
  const r = (i: number, s: number) => {
    const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  return (
    <div className={`gs-root ${reduced ? '' : 'gs-anim'} ${className}`} aria-hidden="true">
      <style>{css}</style>
      <svg width="0" height="0" className="absolute">
        <filter id="gs-melt">
          <feTurbulence type="fractalNoise" baseFrequency="0.002 0.08" numOctaves="1" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="18" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div className="gs-drift">
      <div className="gs-rgb gs-r"><span className="gs-word font-display">{word}</span></div>
      <div className="gs-wrap absolute inset-0">
        {Array.from({ length: SLICES }, (_, i) => {
          const top = (i / SLICES) * 100;
          const bottom = 100 - ((i + 1) / SLICES) * 100;
          const big = r(i, 1) > 0.7;
          const style = {
            clipPath: `inset(${top}% 0 ${bottom}% 0)`,
            transform: reduced ? `translateX(${((r(i, 4) - 0.5) * 6).toFixed(2)}%)` : undefined,
            '--x1': `${((r(i, 2) - 0.5) * (big ? 22 : 7)).toFixed(2)}%`,
            '--x2': `${((r(i, 3) - 0.5) * (big ? 14 : 5)).toFixed(2)}%`,
            '--d': `${(1.4 + r(i, 5) * 2.6).toFixed(2)}s`,
            '--o': `${(-r(i, 6) * 3).toFixed(2)}s`,
          } as CSSProperties;
          return (
            <div key={i} className="gs-slice" style={style}>
              <span className="gs-word font-display">{word}</span>
            </div>
          );
        })}
      </div>
      <div className="gs-rgb gs-b"><span className="gs-word font-display">{word}</span></div>
      </div>
    </div>
  );
}
