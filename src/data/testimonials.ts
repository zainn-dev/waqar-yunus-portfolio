import type { Testimonial } from '@/types/content';

/**
 * EDIT ME — client testimonials.
 *
 * Only add real quotes you have permission to publish. The entries below are PLACEHOLDERS
 * (placeholder: true): they appear while you run `npm run dev` so you can see the carousel,
 * but the whole section is hidden in production until at least one real testimonial exists.
 */
export const testimonials: Testimonial[] = [
  {
    quote: 'Placeholder — paste a real quote from a client here. Two or three sentences about what it was like to work together and what changed for them works best.',
    name: 'Client name',
    role: 'Role',
    organization: 'Organisation',
    project: 'Project name',
    placeholder: true,
  },
  {
    quote: 'Placeholder — a second testimonial. Keep it specific: the problem, how the work went, and the result in their own words.',
    name: 'Client name',
    role: 'Role',
    organization: 'Organisation',
    placeholder: true,
  },
  {
    quote: 'Placeholder — a third testimonial. Remove the placeholder flag on each entry once it contains a real, approved quote.',
    name: 'Client name',
    role: 'Role',
    organization: 'Organisation',
    placeholder: true,
  },
];

export const publishableTestimonials = () =>
  import.meta.env.DEV ? testimonials : testimonials.filter((t) => !t.placeholder);
