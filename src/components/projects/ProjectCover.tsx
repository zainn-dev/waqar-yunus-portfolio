import type { Project } from '@/types/content';
import { cn } from '@/utils/cn';

/**
 * Real cover if provided; otherwise an abstract generated composition that is clearly
 * labelled as a placeholder — never presented as a screenshot of the project.
 */
export function ProjectCover({ project, className, sizes = '(min-width: 1024px) 50vw, 100vw', eager }: {
  project: Project; className?: string; sizes?: string; eager?: boolean;
}) {
  if (project.cover) {
    return (
      <img
        src={project.cover.src}
        alt={project.cover.alt}
        width={project.cover.width}
        height={project.cover.height}
        sizes={sizes}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className={cn('h-full w-full object-cover', className)}
      />
    );
  }
  return <PlaceholderArt seed={project.coverVariant ?? 0} title={project.title} className={className} />;
}

const initials = (t: string) => t.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export function PlaceholderArt({ seed, title, className, label = true }: { seed: number; title: string; className?: string; label?: boolean }) {
  const v = ((seed % 6) + 6) % 6;
  const bgs = ['#0D1117', '#161B22', '#0B0F14', '#11161D', '#161B22', '#0D1117'];
  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)} style={{ background: bgs[v] }}>
      <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <pattern id={`g${v}`} width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M80 0H0V80" fill="none" stroke="#262C35" strokeWidth="1" opacity=".55" />
          </pattern>
        </defs>
        <rect width="1600" height="1000" fill={`url(#g${v})`} />
        {v === 0 && (
          <g fill="none" stroke="#FF3831">
            {[120, 220, 320, 420, 520].map((r, i) => (
              <circle key={r} cx="1180" cy="520" r={r} strokeWidth={i === 0 ? 3 : 1.2} opacity={1 - i * 0.17} />
            ))}
            <path d="M660 520H1700" stroke="#E6EDF3" opacity=".25" />
          </g>
        )}
        {v === 1 && (
          <g>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <rect key={i} x={760 + i * 40} y={180 + i * 110} width={760 - i * 90} height="60" fill={i === 2 ? '#FF3831' : '#E6EDF3'} opacity={i === 2 ? 1 : 0.09 + i * 0.03} />
            ))}
          </g>
        )}
        {v === 2 && (
          <g>
            <circle cx="1120" cy="500" r="360" fill="#E6EDF3" opacity=".06" />
            <path d="M1120 140a360 360 0 0 1 0 720z" fill="#FF3831" />
            <circle cx="1120" cy="500" r="120" fill="#0D1117" />
          </g>
        )}
        {v === 3 && (
          <g>
            {Array.from({ length: 12 }).map((_, x) =>
              Array.from({ length: 8 }).map((__, y) => (
                <circle key={`${x}-${y}`} cx={720 + x * 70} cy={180 + y * 90} r={x + y === 11 ? 14 : 4} fill={x + y === 11 ? '#FF3831' : '#E6EDF3'} opacity={x + y === 11 ? 1 : 0.18 + ((x * y) % 5) * 0.06} />
              )),
            )}
          </g>
        )}
        {v === 4 && (
          <g fill="none" strokeWidth="2">
            {[0, 1, 2, 3].map((i) => (
              <rect key={i} x={860 + i * 50} y={160 + i * 50} width={560 - i * 100} height={680 - i * 100} rx={280 - i * 50} stroke={i === 3 ? '#FF3831' : '#E6EDF3'} opacity={i === 3 ? 1 : 0.18 + i * 0.1} />
            ))}
          </g>
        )}
        {v === 5 && (
          <g fill="none" strokeWidth="1.5">
            <polygon points="1100,140 1440,380 1320,800 880,800 760,380" stroke="#E6EDF3" opacity=".3" />
            <polygon points="1100,260 1330,420 1250,700 950,700 870,420" stroke="#E6EDF3" opacity=".5" />
            <polygon points="1100,380 1220,460 1180,600 1020,600 980,460" stroke="#FF3831" />
            <path d="M1100 140V800M760 380L1440 380" stroke="#262C35" />
          </g>
        )}
        <text x="96" y="880" fontFamily="Space Grotesk Variable, Space Grotesk, sans-serif" fontWeight="700" fontSize="380" letterSpacing="-24" fill="#E6EDF3" opacity=".9">
          {initials(title)}
        </text>
      </svg>
      {label && (
        <span className="absolute left-4 top-4 rounded-full border border-line bg-ink/70 px-3 py-1.5 font-mono text-[10px] text-mute backdrop-blur-sm sm:text-[11px]">
          Placeholder cover — add screenshot
        </span>
      )}
    </div>
  );
}
