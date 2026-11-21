import type { Capability, ProcessStep, ServiceGroup, Technology } from '@/types/content';

/** EDIT ME — home page capability panels. */
export const capabilities: Capability[] = [
  { title: 'Full-Stack Development', body: 'Interfaces, APIs and databases designed together, so the product works as one system.', tags: ['React', 'Node.js', 'Express', 'MongoDB', 'MySQL'] },
  { title: 'Frontend Engineering', body: 'Typed, component-driven React with motion and accessibility built in from the start.', tags: ['TypeScript', 'React', 'Tailwind CSS', 'GSAP'] },
  { title: 'WordPress Development', body: 'Custom themes and editing experiences that keep content teams independent.', tags: ['WordPress', 'PHP', 'MySQL'] },
  { title: 'E-Commerce Solutions', body: 'Stores built around the catalogue, the checkout and the shipping that follows.', tags: ['Catalogue', 'Checkout', 'Shipping'] },
  { title: 'API & Payment Integrations', body: 'Payments, webhooks and third-party services connected reliably — including the failure cases.', tags: ['REST', 'Webhooks', 'Payments'] },
  { title: 'UI/UX Implementation', body: 'Design translated faithfully into responsive, fast, accessible interfaces.', tags: ['Figma', 'Motion', 'Accessibility'] },
];

/** EDIT ME — "How I work" steps. */
export const processSteps: ProcessStep[] = [
  { title: 'Listen', body: 'Your goals, your customers and what’s getting in the way. I ask a lot of questions before I suggest anything.' },
  { title: 'Shape', body: 'Structure, content and visual direction, shown as real screens you can react to — not abstract decks.' },
  { title: 'Build', body: 'Clean, fast code in small steps, with a live preview link so you can click through progress every week.' },
  { title: 'Launch', body: 'Testing, deployment and handover. Then I stay around to fix, tune and improve once real people use it.' },
];

/** Short professional introduction shown under the hero (words light up as you scroll). */
export const homeIntro =
  'I’m Waqar, a creative developer based in Delhi. I plan, design and build websites, web apps and online stores — and the payment and API work behind them — so they’re fast, accessible and genuinely good to use.';

/** About / creative developer section. */
export const aboutAreas = [
  { title: 'Web development', body: 'Fast, responsive websites built by hand, not stitched from templates.' },
  { title: 'Full-stack applications', body: 'Dashboards, accounts and data — React on the front, Node.js and databases behind it.' },
  { title: 'WordPress', body: 'Custom themes your team can edit without breaking the design.' },
  { title: 'E-commerce', body: 'Stores with clear product pages, a checkout people finish, and shipping that works.' },
  { title: 'API integrations', body: 'Payments, shipping, forms and third-party services wired in reliably.' },
  { title: 'UI/UX implementation', body: 'Designs turned into accessible, pixel-careful interfaces with considered motion.' },
];

export const creativeDev = {
  title: ['More than code.', 'Building digital experiences.'],
  body: 'Most projects need someone who can hold the whole picture: how it should look, how it should feel, and how it actually gets built and shipped. That’s the gap I like to work in.',
  disciplines: [
    { title: 'Design', body: 'Layout, typography and interaction, worked out with real content rather than lorem ipsum.' },
    { title: 'Development', body: 'React, TypeScript and Node.js on the product side; WordPress and PHP where a CMS fits better.' },
    { title: 'Motion', body: 'Scroll, hover and transition work that explains what is happening instead of decorating it.' },
  ],
};

export const marqueeWords = ['Design', 'Development', 'Interaction', 'Innovation', 'Experience'];

/** Technologies shown on the home page strip. Keys map to simple-icons. */
export const homeStack: { name: string; icon?: string }[] = [
  { name: 'React', icon: 'react' },
  { name: 'TypeScript', icon: 'typescript' },
  { name: 'JavaScript', icon: 'javascript' },
  { name: 'Node.js', icon: 'nodedotjs' },
  { name: 'Express', icon: 'express' },
  { name: 'HTML5', icon: 'html5' },
  { name: 'CSS3', icon: 'css3' },
  { name: 'Tailwind CSS', icon: 'tailwindcss' },
  { name: 'Bootstrap', icon: 'bootstrap' },
  { name: 'WordPress', icon: 'wordpress' },
  { name: 'PHP', icon: 'php' },
  { name: 'MongoDB', icon: 'mongodb' },
  { name: 'MySQL', icon: 'mysql' },
  { name: 'Firebase', icon: 'firebase' },
  { name: 'Git', icon: 'git' },
  { name: 'GitHub', icon: 'github' },
  { name: 'Vercel', icon: 'vercel' },
  { name: 'Google Cloud', icon: 'googlecloud' },
];

/** EDIT ME — the four service groups (home + Services page). */
export const serviceGroups: ServiceGroup[] = [
  {
    id: 'web',
    title: 'Websites & Web Applications',
    marquee: ['Websites', 'Web apps', 'Dashboards', 'Portals'],
    description: 'Custom websites and web apps that load fast, read clearly and turn visitors into enquiries — built to be edited and extended.',
    technologies: ['React', 'TypeScript', 'Node.js', 'Tailwind CSS', 'WordPress'],
    values: [
      { title: 'Fast by default', body: 'Lean bundles, optimised images and good Core Web Vitals.' },
      { title: 'Editable', body: 'Content you can update without calling a developer.' },
      { title: 'Built to last', body: 'Typed, tested, documented code that scales with you.' },
    ],
    capabilities: ['Marketing & portfolio sites', 'React single-page apps', 'Admin dashboards', 'Custom WordPress themes', 'Accessibility & SEO foundations', 'Performance optimisation'],
  },
  {
    id: 'interactive',
    title: '3D & Interactive Experiences',
    marquee: ['3D', 'Motion', 'WebGL', 'Interaction'],
    description: 'Scroll stories, animated interfaces and lightweight 3D that make a brand memorable — without making the site slow or confusing.',
    technologies: ['GSAP', 'Three.js', 'React Three Fiber', 'Framer Motion', 'Canvas'],
    values: [
      { title: 'Purposeful motion', body: 'Animation that explains and guides, never just decorates.' },
      { title: 'Runs everywhere', body: 'Lighter fallbacks for phones and reduced-motion users.' },
      { title: 'Memorable', body: 'One signature moment people talk about.' },
    ],
    capabilities: ['Scroll-driven storytelling', 'Interactive 3D product views', 'Micro-interactions', 'Animated page transitions', 'Generative & particle visuals', 'Reduced-motion alternatives'],
  },
  {
    id: 'commerce',
    title: 'E-Commerce Solutions',
    marquee: ['Stores', 'Checkout', 'Catalogue', 'Shipping'],
    description: 'Online stores designed around how your customers actually buy: clear products, a checkout that converts, and operations that run smoothly.',
    technologies: ['WooCommerce', 'React', 'Node.js', 'Payment gateways', 'Shipping APIs'],
    values: [
      { title: 'Checkout that converts', body: 'Fewer steps, clear costs, trusted payment options.' },
      { title: 'Easy to run', body: 'Products, orders and stock you can manage yourself.' },
      { title: 'Connected', body: 'Payments, shipping and email working together.' },
    ],
    capabilities: ['Custom storefronts', 'Product & catalogue setup', 'Cart & checkout flows', 'Payment gateway integration', 'Shipping & tracking integration', 'Order notifications'],
  },
  {
    id: 'backend',
    title: 'Backend, APIs & Integrations',
    marquee: ['APIs', 'Webhooks', 'Databases', 'Automation'],
    description: 'The plumbing behind the product: REST APIs, databases, authentication and integrations that keep working when traffic and edge cases arrive.',
    technologies: ['Node.js', 'Express', 'MongoDB', 'MySQL', 'Firebase'],
    values: [
      { title: 'Reliable', body: 'Validation, retries and clear error handling.' },
      { title: 'Secure', body: 'Sensible auth, secrets management and least access.' },
      { title: 'Documented', body: 'Endpoints your team can understand and extend.' },
    ],
    capabilities: ['REST API design', 'Authentication & roles', 'Database modelling', 'Webhooks & payment callbacks', 'Third-party service integration', 'Form & email automation'],
  },
];

/** EDIT ME — technology showcase (3D arrangement). Descriptions describe how you use each tool. */
export const technologies: Technology[] = [
  { name: 'React', icon: 'react', category: 'Frontend', description: 'My default for interfaces: component-driven UIs, from marketing sites to dashboards.' },
  { name: 'TypeScript', icon: 'typescript', category: 'Frontend', description: 'Types across frontend and backend so bugs surface in the editor, not in production.' },
  { name: 'JavaScript', icon: 'javascript', category: 'Frontend', description: 'The foundation under everything — modern ES features, browser APIs and tooling.' },
  { name: 'Tailwind CSS', icon: 'tailwindcss', category: 'Frontend', description: 'Utility-first styling for consistent, responsive layouts built quickly.' },
  { name: 'Node.js', icon: 'nodedotjs', category: 'Backend', description: 'APIs, integrations and scripts — the server side of most projects I build.' },
  { name: 'Express', icon: 'express', category: 'Backend', description: 'Lightweight HTTP layer for REST APIs, webhooks and payment callbacks.' },
  { name: 'PHP', icon: 'php', category: 'Backend', description: 'Custom WordPress work and legacy migrations.' },
  { name: 'WordPress', icon: 'wordpress', category: 'CMS', description: 'Custom themes and editing setups for content-heavy and nonprofit sites.' },
  { name: 'MongoDB', icon: 'mongodb', category: 'Database', description: 'Flexible document storage for app data that changes shape.' },
  { name: 'MySQL', icon: 'mysql', category: 'Database', description: 'Relational data for WordPress, stores and structured records.' },
  { name: 'Firebase', icon: 'firebase', category: 'Database', description: 'Auth, realtime data and hosting for fast-moving app prototypes.' },
  { name: 'GSAP', icon: 'greensock', category: 'Motion & 3D', description: 'Scroll-driven and timeline animation with precise control.' },
  { name: 'Three.js', icon: 'threedotjs', category: 'Motion & 3D', description: 'WebGL scenes and particle work, used where 3D genuinely adds something.' },
  { name: 'Git', icon: 'git', category: 'Tools', description: 'Version control for every project, with clean history and branches.' },
  { name: 'GitHub', icon: 'github', category: 'Tools', description: 'Code hosting, reviews and CI workflows.' },
  { name: 'Vercel', icon: 'vercel', category: 'Cloud', description: 'Deployments with preview links for every change.' },
  { name: 'Google Cloud', icon: 'googlecloud', category: 'Cloud', description: 'Cloud services and hosting for backends that need more room.' },
];
