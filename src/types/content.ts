/**
 * Content models for every editable data file in src/data.
 * Optional fields are optional on purpose: components render gracefully
 * (or hide the section) when a value is missing.
 */

export interface Profile {
  name: string;
  brand: string;
  monogram: string;
  title: string;
  roles: string[];
  location: string;
  timezone: string;
  /** Leave empty until you want it public. Used for mailto CTAs. */
  email: string;
  availability: { available: boolean; label: string };
  heroHeadline: string[];
  heroDescription: string;
  rotatingHeadlines: string[];
  shortBio: string;
  /** Paragraphs for the About page story. */
  story: string[];
  approach: { title: string; body: string }[];
  values: { title: string; body: string }[];
  /** Only add verified achievements. Section hides when empty. */
  achievements: { title: string; detail?: string; year?: string }[];
  /** Path under /public, e.g. "/images/waqar.webp". Placeholder shown when empty. */
  portrait?: { src: string; alt: string; width: number; height: number };
}

export type ProjectCategory =
  | 'Nonprofit'
  | 'Digital Platform'
  | 'Digital Experience'
  | 'CAD'
  | 'Desktop Software'
  | 'Web Application'
  | 'Browser Extension'
  | 'E-commerce';

/** Primary grouping used by the project switcher dropdown. */
export type ProjectGroup = 'Nonprofit' | 'Software' | 'Web Apps';

export type ProjectStatus = 'Live' | 'In progress' | 'Private / internal' | 'Archived' | 'Unknown';

export interface ProjectImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
}

export interface Project {
  slug: string;
  title: string;
  /** One line shown on cards. */
  focus: string;
  categories: ProjectCategory[];
  /** Primary group for the project switcher dropdown. */
  group: ProjectGroup;
  featured?: boolean;
  /** Generated placeholder cover palette seed (0–5). Ignored once `cover` is set. */
  coverVariant?: number;
  cover?: ProjectImage;
  /** Where the close-up "zoom" tile looks into the cover, as 0–1 fractions (default: top left). */
  coverZoom?: { x: number; y: number };
  /** Optional muted looping preview shown on hover (desktop). Needs `poster`. */
  previewVideo?: { src: string; poster: string };
  stack?: string[];
  liveUrl?: string;
  githubUrl?: string;
  /** Only set once verified. */
  year?: string;
  role?: string;
  status?: ProjectStatus;
  summary?: string;
  problem?: string;
  approach?: string;
  designAndDevelopment?: string;
  responsibilities?: string[];
  features?: string[];
  challenges?: { title: string; solution: string }[];
  /** Only verified outcomes. Section hides when empty. */
  results?: string[];
  gallery?: ProjectImage[];
  seoDescription?: string;
}

export interface Service {
  title: string;
  description: string;
  deliverables: string[];
  technologies: string[];
}

export interface Capability {
  title: string;
  body: string;
  tags: string[];
}

export type SkillLevel = 'core' | 'working' | 'exploring';

export interface Skill {
  name: string;
  level: SkillLevel;
  /** simple-icons key, e.g. "react". Falls back to a typographic mark. */
  icon?: string;
}

export interface SkillGroup {
  title: string;
  description: string;
  skills: Skill[];
}

export type ExperienceKind = 'Role' | 'Freelance' | 'Project' | 'Milestone' | 'Education' | 'Certification';

export interface ExperienceItem {
  kind: ExperienceKind;
  title: string;
  organization?: string;
  period?: string;
  description: string;
  highlights?: string[];
  /** Placeholders render with a dashed outline and "add details" hint. */
  placeholder?: boolean;
}

export interface SocialLink {
  label: string;
  /** Profile URL. Empty shows the platform as "Link coming soon". */
  href: string;
  /** simple-icons key used for the icon and the 3D particle shape. */
  icon: string;
  handle?: string;
}

export interface Testimonial {
  quote: string;
  name: string;
  organization?: string;
  /** Only a rating the client actually gave (e.g. from a review platform). */
  rating?: number;
  role?: string;
  project?: string;
  /** Placeholders show only in development. */
  placeholder?: boolean;
}

export interface NavItem {
  label: string;
  to: string;
}

export interface ProcessStep {
  title: string;
  body: string;
}

export interface ServiceGroup {
  id: 'web' | 'interactive' | 'commerce' | 'backend';
  title: string;
  marquee: string[];
  description: string;
  technologies: string[];
  values: { title: string; body: string }[];
  capabilities: string[];
}

export interface Technology {
  name: string;
  icon?: string;
  category: 'Frontend' | 'Backend' | 'Database' | 'CMS' | 'Motion & 3D' | 'Tools' | 'Cloud';
  description: string;
}
