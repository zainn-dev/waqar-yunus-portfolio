import { profile } from '@/data/profile';
import { pageMeta } from '@/data/seo';

/** Site URL from env. Replace VITE_SITE_URL in .env once your domain is live. */
export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://your-domain.com').replace(/\/$/, '');
export const SITE_NAME = `${profile.name} — Creative Developer`;
export const DEFAULT_DESCRIPTION = pageMeta['/'].description;
export const OG_IMAGE = '/og-image.png';

export const absoluteUrl = (path: string) => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
