import type { Profile } from '@/types/content';

/**
 * EDIT ME — personal identity and About page content.
 * Anything marked [PLACEHOLDER] is written as a neutral starting point; rewrite in your own voice.
 */
export const profile: Profile = {
  name: 'Zain',
  brand: 'ZAIN',
  monogram: 'Z',
  title: 'Creative Developer',
  roles: [
    'Full-Stack Web Developer',
    'React & Node.js Developer',
    'WordPress Developer & Designer',
    'UI/UX Enthusiast',
    'E-Commerce Website Developer',
    'Web Application Developer',
    'API & Payment Integration Developer',
  ],
  location: 'Delhi, India',
  timezone: 'Asia/Kolkata',
  email: '', // [PLACEHOLDER] e.g. 'hello@your-domain.com'
  availability: { available: true, label: 'Available for new projects' }, // EDIT ME — shown in hero, menu and footer
  heroHeadline: ['Websites that work.', 'Experiences that stay.'],
  heroDescription:
    'I design and develop modern websites, interactive applications and digital products that combine thoughtful design with powerful technology.',
  rotatingHeadlines: [
    'I build digital experiences.',
    'Design meets development.',
    'Turning ideas into interactive reality.',
  ],
  shortBio:
    'I’m Zain, a full-stack developer in Delhi. I build websites and web apps end to end — React and Node.js products, WordPress sites, online stores, and the payment and API plumbing that keeps them running. I care about the parts people feel: speed, clarity, and motion that has a reason to exist.',
  story: [
    // [PLACEHOLDER] Replace with your own story.
    'I started building for the web because I liked seeing an idea become something people could actually use. That habit stuck: most of my work today sits where design, engineering and real-world constraints meet.',
    'Much of what I build is for organisations doing meaningful work — nonprofits running sponsorship and mentorship programmes, small brands selling online, and teams who need a tool that fits the way they already work.',
    'I work across the stack: interfaces in React and TypeScript, APIs in Node.js, content in WordPress, and the integrations — payments, shipping, forms — that turn a website into a working product.',
  ],
  approach: [
    { title: 'Start with the job', body: 'Before choosing a stack or a layout, I want to know what the site has to do and for whom. Everything else follows from that.' },
    { title: 'Build the real thing early', body: 'Working prototypes surface problems that mockups hide. I get something clickable in front of people as soon as it’s useful.' },
    { title: 'Motion with a purpose', body: 'Animation should explain, guide or reward. If it only decorates, it goes.' },
    { title: 'Leave it maintainable', body: 'Clean data models, readable code and documentation, so the next change is cheap — whether I make it or someone else does.' },
  ],
  values: [
    { title: 'Honesty', body: 'Clear estimates, clear trade-offs, and saying so when something isn’t a good idea.' },
    { title: 'Craft', body: 'Details like focus states, loading states and empty states are part of the work, not extras.' },
    { title: 'Impact', body: 'I enjoy work that helps people — especially for organisations doing social good.' },
  ],
  achievements: [], // Only add verified items, e.g. { title: '...', detail: '...', year: '2025' }
  portrait: undefined, // e.g. { src: '/images/zain.webp', alt: 'Zain', width: 1200, height: 1500 }
};
