import type { SocialLink } from '@/types/content';

/**
 * EDIT ME — your social profiles. Paste each full profile URL into `href`.
 *
 * Every platform listed here appears in the 3D social carousel, the footer and the contact page.
 * A platform with an empty `href` still shows, but as "Link coming soon" instead of a link,
 * so fill these in before launch. Delete an entry to remove that platform completely.
 * `icon` is a simple-icons key (see src/lib/icons.ts).
 */
export const socials: SocialLink[] = [
  { label: 'Instagram', icon: 'instagram', href: '', handle: '' },
  { label: 'X / Twitter', icon: 'x', href: '', handle: '' },
  { label: 'LinkedIn', icon: 'linkedin', href: '', handle: '' },
  { label: 'YouTube', icon: 'youtube', href: '', handle: '' },
  { label: 'GitHub', icon: 'github', href: '', handle: '' },
  { label: 'WhatsApp', icon: 'whatsapp', href: '', handle: '' }, // e.g. 'https://wa.me/91XXXXXXXXXX'
];

export const hasHref = (s: SocialLink) => s.href.trim().length > 0;
export const visibleSocials = () => socials.filter(hasHref);
