/**
 * Post-build static SEO pass (runs after `vite build`).
 *
 * The app is a client-rendered SPA. To give crawlers and social link previews correct
 * metadata without a server, this writes dist/<route>/index.html for every public route —
 * the same app shell, but with the route's <title>, description, canonical, Open Graph
 * and Twitter tags baked in. It also writes sitemap.xml and updates robots.txt.
 *
 * Page body content is still rendered client-side; see README › SEO for the trade-offs.
 */
import { build } from 'esbuild';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');

// Load .env* for VITE_SITE_URL the same way Vite does (simple parser, no extra deps).
async function readEnv() {
  const env = { ...process.env };
  for (const f of ['.env', '.env.production', '.env.local', '.env.production.local']) {
    try {
      const txt = await readFile(resolve(root, f), 'utf8');
      for (const line of txt.split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && !(m[1] in process.env)) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
      }
    } catch { /* optional */ }
  }
  return env;
}

async function loadData() {
  const out = resolve(root, 'node_modules/.tmp/seo-data.mjs');
  await build({
    stdin: {
      contents: "export { projects } from './src/data/projects.ts'; export { pageMeta } from './src/data/seo.ts';",
      resolveDir: root,
      loader: 'ts',
    },
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: out,
    alias: { '@': resolve(root, 'src') },
    logLevel: 'silent',
  });
  const mod = await import(pathToFileURL(out).href + `?t=${Date.now()}`);
  await rm(out, { force: true });
  return mod;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const env = await readEnv();
const site = (env.VITE_SITE_URL || 'https://your-domain.com').replace(/\/$/, '');
const { projects, pageMeta } = await loadData();
const shell = await readFile(resolve(dist, 'index.html'), 'utf8');
if (!shell.includes('<!--seo:start-->')) throw new Error('index.html is missing <!--seo:start--> markers');

const routes = [
  ...Object.entries(pageMeta).filter(([path]) => ['/', '/about', '/contact', '/social'].includes(path)).map(([path, m]) => ({ path, ...m, type: 'website', image: '/og-image.png' })),
  ...projects.map((p) => ({
    path: `/projects/${p.slug}`,
    title: p.title,
    description: p.seoDescription ?? p.summary ?? p.focus,
    type: 'article',
    image: p.cover?.src ?? '/og-image.png',
  })),
];

for (const r of routes) {
  const fullTitle = r.title ? `${r.title} — Waqar Yunus` : 'Waqar Yunus — Creative Developer';
  const url = `${site}${r.path === '/' ? '/' : r.path}`;
  const img = r.image.startsWith('http') ? r.image : `${site}${r.image}`;
  const head = [
    `<title data-seo="static">${esc(fullTitle)}</title>`,
    `<meta data-seo=\"static\" name="description" content="${esc(r.description)}" />`,
    `<link data-seo=\"static\" rel="canonical" href="${esc(url)}" />`,
    `<meta data-seo=\"static\" property="og:site_name" content="WAQAR." />`,
    `<meta data-seo=\"static\" property="og:type" content="${r.type}" />`,
    `<meta data-seo=\"static\" property="og:title" content="${esc(fullTitle)}" />`,
    `<meta data-seo=\"static\" property="og:description" content="${esc(r.description)}" />`,
    `<meta data-seo=\"static\" property="og:url" content="${esc(url)}" />`,
    `<meta data-seo=\"static\" property="og:image" content="${esc(img)}" />`,
    `<meta data-seo=\"static\" name="twitter:card" content="summary_large_image" />`,
    `<meta data-seo=\"static\" name="twitter:title" content="${esc(fullTitle)}" />`,
    `<meta data-seo=\"static\" name="twitter:description" content="${esc(r.description)}" />`,
    `<meta data-seo=\"static\" name="twitter:image" content="${esc(img)}" />`,
  ].join('\n    ');
  const html = shell.replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, `<!--seo:start-->\n    ${head}\n    <!--seo:end-->`);
  const file = r.path === '/' ? resolve(dist, 'index.html') : resolve(dist, `.${r.path}/index.html`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
}

// Fallback for unknown routes on static hosts that support 404.html (GitHub Pages, Netlify, etc.)
await writeFile(resolve(dist, '404.html'), shell.replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, '<!--seo:start-->\n    <title data-seo="static">Page not found — Waqar Yunus</title>\n    <meta data-seo="static" name="robots" content="noindex" />\n    <!--seo:end-->'));

const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((r) => `  <url><loc>${esc(`${site}${r.path === '/' ? '/' : r.path}`)}</loc><lastmod>${today}</lastmod><priority>${r.path === '/' ? '1.0' : r.path.startsWith("/projects/") ? '0.6' : '0.8'}</priority></url>`).join('\n')}
</urlset>
`;
await writeFile(resolve(dist, 'sitemap.xml'), sitemap);
await writeFile(resolve(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`);

console.log(`✓ postbuild: ${routes.length} route HTML files, sitemap.xml and robots.txt for ${site}`);
if (site.includes('your-domain.com')) console.warn('  ! VITE_SITE_URL is not set — using placeholder domain. Set it in .env before deploying.');
