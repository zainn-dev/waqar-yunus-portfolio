import type { Project, ProjectCategory, ProjectGroup } from '@/types/content';

/**
 * EDIT ME — project content.
 *
 * These entries are portfolio seeds. They only contain details that were provided.
 * Fields like role, year, status, responsibilities, challenges and results are
 * intentionally left empty — fill them in once you've confirmed them.
 * Any empty section is hidden, and cards show a "Details coming soon" state.
 *
 * Adding screenshots:
 *   1. Put optimised WebP/AVIF files in /public/projects/<slug>/
 *   2. Set `cover` and/or `gallery` with real width/height (prevents layout shift).
 */
export const projectCategories: ProjectCategory[] = [
  'Nonprofit',
  'Digital Platform',
  'Digital Experience',
  'CAD',
  'Desktop Software',
  'Web Application',
  'Browser Extension',
  'E-commerce',
];

/** Dropdown groups, in display order. */
export const projectGroups: ProjectGroup[] = ['Nonprofit', 'Software', 'Web Apps'];

export const projects: Project[] = [
  {
    slug: 'shaagird',
    title: 'Shaagird Foundation',
    focus: 'Sponsorship, mentorship and digital platform features',
    categories: ['Nonprofit', 'Digital Platform'],
    group: 'Nonprofit',
    featured: true,
    coverVariant: 0,
    cover: { src: '/projects/shaagird/cover.webp', alt: 'Shaagird Foundation home page: “Empower a Child’s Future Through Education” with a child sponsorship card', width: 1416, height: 808 },
    stack: ['React', 'TypeScript', 'Vite', 'Backend API'],
    liveUrl: 'https://shaagird.org',
    gallery: [
      { src: '/projects/shaagird/stories.webp', alt: 'Shaagird Foundation stories site: “Stories of Struggles & Hope” with a photo of children', width: 1416, height: 680 },
      { src: '/projects/shaagird/home.webp', alt: 'Shaagird Foundation home page: “Empower a Child’s Future Through Education” with impact stats', width: 1416, height: 808 },
      { src: '/projects/shaagird/donate.webp', alt: 'Shaagird Foundation donate page: “Enrich the Dreams of Those Who Lost Hope” with a quick donate bar', width: 1416, height: 702 },
      { src: '/projects/shaagird/kids-section.webp', alt: 'Shaagird Foundation home page: grid of child sponsorship cards', width: 1416, height: 808 },
      { src: '/projects/shaagird/mobile-home.webp', alt: 'Shaagird Foundation home page on a phone, with a sponsor card', width: 390, height: 844 },
    ],
    summary:
      'A web platform for an education-focused foundation, covering sponsorship, mentorship and the digital features that support them.',
  },
  {
    slug: 'miles2smile',
    title: 'Miles2Smile Foundation',
    focus: 'Nonprofit website and digital experience',
    categories: ['Nonprofit', 'Digital Experience'],
    group: 'Nonprofit',
    featured: true,
    coverVariant: 1,
    cover: { src: '/projects/miles2smile/cover.webp', alt: 'Miles2Smile Foundation home page: a rescue team in a boat during the Assam floods', width: 1416, height: 808 },
    stack: ['WordPress'],
    liveUrl: 'https://miles2smile.org',
    gallery: [
      { src: '/projects/miles2smile/donate.webp', alt: 'Miles2Smile Foundation donate page: “Why Donate?”, “Where to Donate” cards and a quick donate bar', width: 1416, height: 702 },
      { src: '/projects/miles2smile/stories.webp', alt: 'Miles2Smile Foundation stories site: an Education banner of children reading, categories and a featured story', width: 1416, height: 702 },
      { src: '/projects/miles2smile/mobile-donate.webp', alt: 'Miles2Smile Foundation donate page on a phone', width: 390, height: 844 },
      { src: '/projects/miles2smile/home.webp', alt: 'Miles2Smile Foundation home page: Assam flood rescue and relief', width: 1416, height: 808 },
      { src: '/projects/miles2smile/our-centers.webp', alt: 'Miles2Smile Foundation “Our Centers” page with learning centre photos', width: 1416, height: 808 },
      { src: '/projects/miles2smile/campaigns-section.webp', alt: 'Miles2Smile Foundation featured campaigns section', width: 1416, height: 808 },
    ],
    summary: 'The website and digital experience for a nonprofit foundation, built on WordPress.',
  },
  {
    slug: 'smartdraftsman',
    title: 'SmartDraftsman',
    focus: 'Structural detailing web app with AutoCAD desktop connectors',
    categories: ['CAD', 'Web Application', 'Desktop Software'],
    group: 'Software',
    featured: true,
    coverVariant: 5,
    cover: { src: '/projects/smartdraftsman/cover.webp', alt: 'SmartDraftsman home page: “Structural detailing made simple” with an RCC Column module slide', width: 1416, height: 808 },
    liveUrl: 'https://smartdraftsman.com',
    gallery: [
      { src: '/projects/smartdraftsman/dashboard.webp', alt: 'SmartDraftsman signed-in workspace: welcome banner and the RCC Detailing Beam module', width: 1416, height: 528 },
      { src: '/projects/smartdraftsman/rcc-detailing.webp', alt: 'SmartDraftsman RCC Detailing modules: Beam, Column, Slab, Wall, Staircase and Foundation', width: 1416, height: 808 },
      { src: '/projects/smartdraftsman/mobile-home.webp', alt: 'SmartDraftsman home page on a phone', width: 390, height: 844 },
      { src: '/projects/smartdraftsman/steel-detailing.webp', alt: 'SmartDraftsman Steel Detailing modules: connections, truss, PEB frame and steel sections', width: 1416, height: 808 },
      { src: '/projects/smartdraftsman/plans.webp', alt: 'SmartDraftsman Account & Subscription page with a 3-day RCC Beam free trial and module plans', width: 1416, height: 808 },
      { src: '/projects/smartdraftsman/3d-viewer.webp', alt: 'SmartDraftsman 3D Viewer page, marked coming soon', width: 1416, height: 808 },
      { src: '/projects/smartdraftsman/mobile-rcc-detailing.webp', alt: 'SmartDraftsman RCC Detailing modules on a phone', width: 390, height: 844 },
    ],
    summary: 'A web app for RCC and steel structural detailing, with desktop connectors for AutoCAD.',
  },
  {
    slug: 'clipfetch',
    title: 'ClipFetch',
    focus: 'Social media downloading platform and browser extension',
    categories: ['Web Application', 'Browser Extension'],
    group: 'Web Apps',
    featured: true,
    coverVariant: 3,
    cover: { src: '/projects/clipfetch/cover.webp', alt: 'ClipFetch home page: “Download Videos from Any Platform” with a phone mock-up', width: 1416, height: 808 },
    liveUrl: 'https://clipfetch-flame.vercel.app',
    gallery: [
      { src: '/projects/clipfetch/home.webp', alt: 'ClipFetch home page hero', width: 1416, height: 808 },
      { src: '/projects/clipfetch/features-section.webp', alt: 'ClipFetch “Built to be straightforward” feature cards', width: 1416, height: 808 },
      { src: '/projects/clipfetch/mobile-home.webp', alt: 'ClipFetch home page on a phone: “Download Videos from Any Platform”', width: 390, height: 844 },
    ],
    summary: 'A web platform and companion browser extension for downloading social media content.',
  },
  {
    slug: 'refurbmart',
    title: 'RefurbMart',
    focus: 'Online store for refurbished laptops',
    categories: ['E-commerce', 'Web Application'],
    group: 'Web Apps',
    featured: true,
    coverVariant: 2,
    cover: { src: '/projects/refurbmart/cover.webp', alt: 'RefurbMart home page: product search, cart and a “Filter by Brand” row of HP, Apple, Lenovo and Dell laptops', width: 1416, height: 708 },
    coverZoom: { x: 0.3, y: 0.96 }, // the hero is empty; look at the brand row
    summary: 'An e-commerce store for refurbished laptops, with product search, brand filters, a cart and customer accounts.',
  },
];

export const secondaryProjects = () => projects.filter((p) => !p.featured);

export const getProject = (slug: string | undefined) => projects.find((p) => p.slug === slug);

export const featuredProjects = () => projects.filter((p) => p.featured);

/** Base path for project pages. */
export const projectPath = (slug: string) => `/projects/${slug}`;

export const projectsByGroup = () =>
  projectGroups.map((group) => ({ group, items: projects.filter((p) => p.group === group) })).filter((g) => g.items.length);

/** Old /work/<slug> URLs → current slugs. Unknown / removed slugs redirect home. */
export const legacySlugs: Record<string, string> = {
  'shaagird-foundation': 'shaagird',
  'miles2smile-foundation': 'miles2smile',
  shaagird: 'shaagird',
  miles2smile: 'miles2smile',
  smartdraftsman: 'smartdraftsman',
  clipfetch: 'clipfetch',
  refurbmart: 'refurbmart',
};

export const nextProject = (slug: string) => {
  const i = projects.findIndex((p) => p.slug === slug);
  return projects[(i + 1) % projects.length];
};

/** True when there is enough content to call it a full case study. */
export const hasCaseStudy = (p: Project) =>
  Boolean(p.role || p.problem || p.approach || p.features?.length || p.challenges?.length || p.gallery?.length);
