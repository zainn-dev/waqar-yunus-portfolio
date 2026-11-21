import type { SkillGroup } from '@/types/content';

/**
 * EDIT ME — skills. Levels are self-assessed and fully editable:
 *   core      → used regularly in production work
 *   working   → used on projects, comfortable but not daily
 *   exploring → learning / experimenting
 * The defaults below are a starting point. Adjust them to match your honest view.
 */
export const skillGroups: SkillGroup[] = [
  {
    title: 'Frontend',
    description: 'Interfaces, components and the browser platform.',
    skills: [
      { name: 'React', level: 'core', icon: 'react' },
      { name: 'TypeScript', level: 'core', icon: 'typescript' },
      { name: 'JavaScript', level: 'core', icon: 'javascript' },
      { name: 'HTML5', level: 'core', icon: 'html5' },
      { name: 'CSS3', level: 'core', icon: 'css3' },
      { name: 'Tailwind CSS', level: 'core', icon: 'tailwindcss' },
      { name: 'Bootstrap', level: 'working', icon: 'bootstrap' },
      { name: 'Vite', level: 'working', icon: 'vite' },
      { name: 'Capacitor', level: 'working', icon: 'capacitor' },
    ],
  },
  {
    title: 'Backend',
    description: 'APIs, integrations and server logic.',
    skills: [
      { name: 'Node.js', level: 'core', icon: 'nodedotjs' },
      { name: 'Express', level: 'core', icon: 'express' },
      { name: 'PHP', level: 'working', icon: 'php' },
      { name: 'REST APIs', level: 'core' },
      { name: 'Payment integrations', level: 'working' },
    ],
  },
  {
    title: 'Database',
    description: 'Modelling and storing data.',
    skills: [
      { name: 'MongoDB', level: 'working', icon: 'mongodb' },
      { name: 'MySQL', level: 'working', icon: 'mysql' },
      { name: 'Firebase', level: 'working', icon: 'firebase' },
    ],
  },
  {
    title: 'CMS',
    description: 'Content that teams can manage themselves.',
    skills: [
      { name: 'WordPress', level: 'core', icon: 'wordpress' },
      { name: 'WooCommerce', level: 'working', icon: 'woocommerce' },
    ],
  },
  {
    title: 'Cloud & Deployment',
    description: 'Shipping and running things.',
    skills: [
      { name: 'Vercel', level: 'core', icon: 'vercel' },
      { name: 'Google Cloud', level: 'working', icon: 'googlecloud' },
      { name: 'Netlify', level: 'working', icon: 'netlify' },
    ],
  },
  {
    title: 'Tools',
    description: 'Day-to-day workflow.',
    skills: [
      { name: 'Git', level: 'core', icon: 'git' },
      { name: 'GitHub', level: 'core', icon: 'github' },
      { name: 'npm', level: 'core', icon: 'npm' },
      { name: 'Postman', level: 'working', icon: 'postman' },
    ],
  },
  {
    title: 'Design & Animation',
    description: 'From layout to motion.',
    skills: [
      { name: 'Figma', level: 'working', icon: 'figma' },
      { name: 'GSAP', level: 'working', icon: 'greensock' },
      { name: 'Framer Motion', level: 'working', icon: 'framer' },
      { name: 'Three.js', level: 'exploring', icon: 'threedotjs' },
    ],
  },
];

export const levelLabels = {
  core: 'Core technologies',
  working: 'Working knowledge',
  exploring: 'Exploring',
} as const;
