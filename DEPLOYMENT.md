# Deployment

| Setting | Value |
| --- | --- |
| Install command | `npm install` (or `npm ci`) |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | 18.18+ (20 or 22 recommended) |
| Environment variables | `VITE_SITE_URL` (required for correct canonical/OG/sitemap), `VITE_CONTACT_ENDPOINT` (optional) |

`VITE_*` variables are inlined at **build time**, so set them in your host's dashboard *before*
building and redeploy after changing them.

## Vercel

1. Import the repository. Framework preset: **Vite** (auto-detected).
2. Add `VITE_SITE_URL=https://your-domain.com` and, if you have one, `VITE_CONTACT_ENDPOINT`.
3. Deploy. `vercel.json` serves the prerendered route folders first and rewrites everything else to
   `index.html`, and sets long-term caching for `/assets/*`.

CLI: `npm i -g vercel && vercel --prod`.

## Netlify

1. New site from Git — build command and publish directory are read from `netlify.toml`.
2. Add environment variables under *Site configuration › Environment variables*.
3. Deploy. `netlify.toml` (and `public/_redirects`) provide the SPA fallback.

CLI: `npm i -g netlify-cli && netlify deploy --prod --dir=dist` (after `npm run build`).

## Any static host (Cloudflare Pages, GitHub Pages, S3 + CloudFront, Nginx, Apache)

Upload the contents of `dist/`. Configure a fallback so unknown paths serve `/index.html`:

- **Cloudflare Pages:** works out of the box with `_redirects` (copied into `dist`).
- **GitHub Pages:** `dist/404.html` is the app shell, so deep links still load the app (served with a 404 status).
- **Nginx:**
  ```nginx
  location / { try_files $uri $uri/ $uri/index.html /index.html; }
  location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable"; }
  ```
- **Apache (.htaccess):**
  ```apache
  RewriteEngine On
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ /index.html [L]
  ```

## After the first deploy

- Set `VITE_SITE_URL` to the real domain and redeploy (fixes canonical URLs, OG URLs, sitemap).
- Submit `https://your-domain.com/sitemap.xml` in Google Search Console.
- Test link previews with the LinkedIn Post Inspector or opengraph.xyz.
- Run Lighthouse on the production URL (mobile + desktop). Performance targets in the brief were
  goals, not measured results — see the QA notes in the delivery message.
