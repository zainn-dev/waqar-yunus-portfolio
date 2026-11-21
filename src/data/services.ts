import type { Service } from '@/types/content';

/** EDIT ME — services offered. Order here is the order on the page. */
export const services: Service[] = [
  {
    title: 'Custom Website Development',
    description: 'Fast, hand-built websites shaped around your content and goals rather than a theme’s limits.',
    deliverables: ['Responsive build', 'CMS or editable content', 'SEO-ready markup', 'Deployment'],
    technologies: ['React', 'Vite', 'Tailwind CSS', 'WordPress'],
  },
  {
    title: 'React Frontend Development',
    description: 'Component-driven interfaces in React and TypeScript, built to be maintained and extended.',
    deliverables: ['Component library', 'State and data fetching', 'Accessibility pass', 'Performance tuning'],
    technologies: ['React', 'TypeScript', 'Tailwind CSS', 'GSAP'],
  },
  {
    title: 'Full-Stack Web Applications',
    description: 'Products with accounts, dashboards and data — from database schema to the interface people use.',
    deliverables: ['API design', 'Authentication', 'Admin tools', 'Database modelling'],
    technologies: ['Node.js', 'Express', 'MongoDB', 'MySQL', 'Firebase'],
  },
  {
    title: 'WordPress Development',
    description: 'Custom WordPress themes and setups that your team can edit without breaking the design.',
    deliverables: ['Custom theme', 'Block or field-based editing', 'Plugin setup', 'Migration'],
    technologies: ['WordPress', 'PHP', 'MySQL'],
  },
  {
    title: 'E-Commerce Development',
    description: 'Online stores with clear product pages, a checkout people finish, and operations that scale.',
    deliverables: ['Catalogue and product pages', 'Cart and checkout', 'Shipping setup', 'Order flows'],
    technologies: ['React', 'Node.js', 'WordPress', 'Payment gateways'],
  },
  {
    title: 'Payment Gateway Integrations',
    description: 'Secure payment flows, webhooks and reconciliation wired into your site or app.',
    deliverables: ['Checkout integration', 'Webhook handling', 'Test and live modes', 'Failure handling'],
    technologies: ['Node.js', 'REST APIs', 'Webhooks'],
  },
  {
    title: 'API Development & Integrations',
    description: 'REST APIs and third-party integrations — shipping, email, forms, CRMs — that hold up in production.',
    deliverables: ['REST endpoints', 'Validation', 'Documentation', 'Third-party connectors'],
    technologies: ['Node.js', 'Express', 'TypeScript'],
  },
  {
    title: 'Website Optimization',
    description: 'Audits and fixes for load time, Core Web Vitals, accessibility and search visibility.',
    deliverables: ['Performance audit', 'Image and bundle optimisation', 'Accessibility fixes', 'SEO metadata'],
    technologies: ['Lighthouse', 'Vite', 'WordPress'],
  },
  {
    title: 'UI/UX Implementation',
    description: 'Turning designs into pixel-careful, responsive interfaces with considered motion.',
    deliverables: ['Design-to-code', 'Responsive layouts', 'Micro-interactions', 'Design tokens'],
    technologies: ['Figma', 'Tailwind CSS', 'GSAP', 'Framer Motion'],
  },
  {
    title: 'Maintenance & Technical Support',
    description: 'Updates, fixes and small improvements so your site keeps working after launch.',
    deliverables: ['Updates and patches', 'Bug fixes', 'Backups and monitoring', 'Small feature work'],
    technologies: ['WordPress', 'React', 'Vercel', 'Google Cloud'],
  },
];
