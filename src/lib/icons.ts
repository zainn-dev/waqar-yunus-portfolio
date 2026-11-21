import {
  siReact, siTypescript, siJavascript, siNodedotjs, siExpress, siHtml5, siCss3, siTailwindcss,
  siBootstrap, siWordpress, siPhp, siMongodb, siMysql, siFirebase, siGit, siGithub, siVercel,
  siGooglecloud, siVite, siCapacitor, siWoocommerce, siNetlify, siNpm, siPostman, siFigma,
  siGreensock, siFramer, siThreedotjs, siInstagram, siX, siLinkedin, siYoutube, siWhatsapp,
} from 'simple-icons';

type Icon = { path: string; hex: string; title: string };

/** Explicit imports keep the bundle small (only these icons are shipped). */
export const brandIcons: Record<string, Icon> = {
  react: siReact, typescript: siTypescript, javascript: siJavascript, nodedotjs: siNodedotjs,
  express: siExpress, html5: siHtml5, css3: siCss3, tailwindcss: siTailwindcss, bootstrap: siBootstrap,
  wordpress: siWordpress, php: siPhp, mongodb: siMongodb, mysql: siMysql, firebase: siFirebase,
  git: siGit, github: siGithub, vercel: siVercel, googlecloud: siGooglecloud, vite: siVite,
  capacitor: siCapacitor, woocommerce: siWoocommerce, netlify: siNetlify, npm: siNpm,
  postman: siPostman, figma: siFigma, greensock: siGreensock, framer: siFramer, threedotjs: siThreedotjs,
  instagram: siInstagram, x: siX, linkedin: siLinkedin, youtube: siYoutube, whatsapp: siWhatsapp,
};
