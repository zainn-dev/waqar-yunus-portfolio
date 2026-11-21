import type { ExperienceItem } from '@/types/content';

/**
 * EDIT ME — timeline entries, newest first.
 * Every entry below is a PLACEHOLDER (placeholder: true). Replace with real roles, dates and
 * organisations, then remove the `placeholder` flag. Nothing here is a factual claim.
 */
export const experience: ExperienceItem[] = [
  {
    kind: 'Freelance',
    title: 'Full-Stack Web Developer',
    organization: 'Independent',
    period: 'Add dates',
    description: 'Describe the kind of clients and projects you take on, and what you are responsible for.',
    highlights: ['Add a highlight', 'Add a highlight'],
    placeholder: true,
  },
  {
    kind: 'Project',
    title: 'Nonprofit platforms',
    organization: 'Add organisation',
    period: 'Add dates',
    description: 'Summarise your work on nonprofit websites and tools, and your role in it.',
    placeholder: true,
  },
  {
    kind: 'Milestone',
    title: 'Add a milestone',
    period: 'Add date',
    description: 'A launch, a first client, a product release — something worth marking.',
    placeholder: true,
  },
  {
    kind: 'Education',
    title: 'Add your qualification',
    organization: 'Add institution',
    period: 'Add dates',
    description: 'Course, focus areas or anything relevant to your work.',
    placeholder: true,
  },
  {
    kind: 'Certification',
    title: 'Add a certification',
    organization: 'Add issuer',
    period: 'Add date',
    description: 'Only list certifications you hold. Remove this entry if you have none to add.',
    placeholder: true,
  },
];
