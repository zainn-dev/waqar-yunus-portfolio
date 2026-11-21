/**
 * EDIT ME — per-page metadata. Used by the <Seo> component at runtime AND by
 * scripts/postbuild.mjs, which writes static HTML (title, description, Open Graph,
 * canonical) for every route so crawlers and link previews see the right tags.
 */
export const pageMeta = {
  '/': {
    title: '',
    description: 'Zain — creative developer and full-stack web developer in Delhi, India. Modern websites, interactive web applications and digital products.',
  },
  '/about': { title: 'About', description: 'About Zain — a creative developer in Delhi who combines thoughtful design with solid engineering.' },
  '/social': { title: 'Social', description: 'Find Zain online — Instagram, X, LinkedIn, GitHub and more, rebuilt as an interactive 3D particle stage.' },
  '/contact': { title: 'Contact', description: 'Start a project with Zain — websites, web apps, WordPress, e-commerce and integrations.' },
} as const;

export type MetaPath = keyof typeof pageMeta;
