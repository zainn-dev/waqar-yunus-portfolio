import { useRef } from 'react';
import type { Project } from '@/types/content';
import { ProjectCover } from '@/components/projects/ProjectCover';
import { cn } from '@/utils/cn';

/** Cover with hover zoom and optional hover video preview (desktop only, muted, lazy). */
export function ProjectMedia({ project, className, eager }: { project: Project; className?: string; eager?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const play = () => video.current?.play().catch(() => undefined);
  const stop = () => { if (video.current) { video.current.pause(); video.current.currentTime = 0; } };
  return (
    <div className={cn('relative overflow-hidden bg-ink-3', className)} onPointerEnter={play} onPointerLeave={stop}>
      <div className="h-full w-full transition-transform duration-[1.2s] ease-expo group-hover:scale-[1.045]">
        <ProjectCover project={project} eager={eager} />
      </div>
      {project.previewVideo && (
        <video
          ref={video}
          src={project.previewVideo.src}
          poster={project.previewVideo.poster}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />
      )}
    </div>
  );
}
