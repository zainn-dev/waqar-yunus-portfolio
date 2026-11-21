import type { NavItem } from '@/types/content';

/** Main navigation: the site has only these pages (plus project pages). */
export const primaryNav: NavItem[] = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

/** Kept for any legacy consumer; same pages as the header. */
export const footerNav: NavItem[] = primaryNav;
