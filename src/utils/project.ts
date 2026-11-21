import type { Project } from '@/types/content';

export const primaryCategory = (p: Project) => p.categories[0] ?? 'Project';

/** "Details coming soon" when a project only has seed information. */
export const isSparse = (p: Project) => !p.role && !p.problem && !p.features?.length && !p.gallery?.length;
