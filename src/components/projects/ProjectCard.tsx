import { projectPath } from '@/data/projects';
import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import type { Project } from '@/types/content';
import { ProjectMedia } from '@/components/projects/ProjectMedia';
import { isSparse } from '@/utils/project';
import { TechList } from '@/components/projects/ProjectMeta';

export const ProjectCard = forwardRef<HTMLElement, { project: Project }>(function ProjectCard({ project: p }, ref) {
  return (
    <article ref={ref} className="group">
      <Link to={projectPath(p.slug)} data-cursor="View project" className="block">
        <ProjectMedia project={p} className="aspect-[4/3] rounded-[4px]" />
        <div className="mt-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <h3 className="min-w-0 break-words font-display text-2xl font-semibold tracking-tight transition-colors duration-300 group-hover:text-accent">{p.title}</h3>
          {isSparse(p) && (
            <span className="mt-1 shrink-0 rounded-full border border-dashed border-line px-2.5 py-1 font-mono text-[10px] text-mute">Details coming soon</span>
          )}
        </div>
        <p className="mt-1 text-sm text-mute">{p.categories.join(', ')}</p>
        <p className="mt-3 max-w-[46ch] text-bone/80">{p.focus}</p>
        <TechList stack={p.stack} className="mt-4" />
      </Link>
    </article>
  );
});
