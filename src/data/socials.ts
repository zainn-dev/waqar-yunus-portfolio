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
  { label: 'Instagram', icon: 'instagram', href: 'https://www.instagram.com/ur__zainn', handle: '@ur__zainn' },
  { label: 'X / Twitter', icon: 'x', href: 'https://x.com/am_zainu__', handle: '@am_zainu__' },
  { label: 'LinkedIn', icon: 'linkedin', href: 'https://www.linkedin.com/in/waqar-yunus-820828326/', handle: 'Waqar Yunus' },
  { label: 'WhatsApp', icon: 'whatsapp', href: 'https://wa.me/919523798118?text=Hi!%20I%20need%20a%20website%20for%20my%20business.', handle: '+91 95237 98118' },
  { label: 'GitHub', icon: 'github', href: 'https://github.com/zainn-dev', handle: 'zainn-dev' },
];

export const hasHref = (s: SocialLink) => s.href.trim().length > 0;
export const visibleSocials = () => socials.filter(hasHref);
