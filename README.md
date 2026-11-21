# WAQAR. — Waqar Yunus · Creative Developer Portfolio

A light, editorial creative-developer portfolio built with React 19, TypeScript and Vite.
GSAP ScrollTrigger + Lenis drive scroll motion, Motion (Framer) handles transitions, and
React Three Fiber renders one deliberate WebGL moment (the particle social stage). Everything else
— the hero work stack, service demos, the draggable technology sphere — is lightweight DOM/CSS
or Canvas 2D. Content is fully editable, and reduced-motion, keyboard and touch are first-class.

**Design reference.** The visual philosophy (light editorial canvas, oversized weight-400
Space Grotesk, flat near-square geometry, dark product-stage panels for demos, restrained motion)
was informed by a design-system extraction of codeofsagar.in supplied by the owner. No code,
copy, imagery or 3D assets from that site are used; layouts, components, copy and visuals here
are original to WAQAR.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check → production build → static SEO pass (dist/)
npm run preview    # serve dist/ locally
npm run lint       # ESLint
npm run typecheck  # TypeScript only
```

Requires Node.js 18.18+ (tested on Node 22). Stack: React 19.2, React Router 7, Vite 5, Tailwind 3.4,
GSAP 3 + ScrollTrigger, Lenis, Motion 12, three.js + React Three Fiber 9, React Hook Form + Zod.

---

## 0. The home page: a project globe

| Piece | What it is | Files |
| --- | --- | --- |
| Grid header | In-flow "bento" header in three equal rows: Home/About and Work/Menu cells (mono caps), a small full-body waving 3D mascot, two serif taglines, the **Waqar** *Yunus* logo (bold grotesk + italic serif), and a red rounded **Start A Project** button inset in its cell that turns into ✕ while the contact panel is open. On long inner pages a slim bar slides in once the big one scrolls away. | `components/layout/Header.tsx`, `MascotScene` in `components/three/StageScenes.tsx` |
| Project globe | Full-screen WebGL globe under the header. The globe surface is the page colour with a fine cream grid; the camera sits low so the horizon lines up with the header's bottom edge and the far side fades into the dark. Each project is a 4 × 2 cluster of small tiles (cover, zoomed crop, number, title, stack, focus, glyph, dot pattern) drawn into one canvas texture and wrapped onto the sphere; clusters repeat around it (all of a project's clusters are one mesh, so it's ~11 draw calls). Drag, scroll, swipe or use the arrow keys to spin it; hovering a project dims the others and names it in the bottom pill; tapping one swings it to the middle, dives in and opens that project. Lat/long of the view centre is shown top-left / top-right. The round button bottom-left switches to a plain grid (also the fallback without WebGL or with reduced motion). | `components/home/GlobeHome.tsx`, `components/three/GlobeScene.tsx`, `lib/tiles.ts` |
| Project page | Opens with the same tiles as the globe, laid out as a big gallery, then the case study. A round globe button (bottom-left) returns to the globe; a pill marquee lists categories and stack. | `pages/ProjectDetail.tsx`, `components/projects/ProjectTiles.tsx` |
| Contact panel | Drops out from under the header from any **Start a project** button: pitch + details + turning wireframe globe, the enquiry form, and a tagline column. Esc closes it. `/contact` shows the same layout as a page. | `components/contact/ContactPanel.tsx`, `components/contact/ContactForm.tsx`, `app/panel.ts` |
| Menu | Dark full-height panel from the right with every page, status, socials and the CTA. | `components/navigation/MobileMenu.tsx` |
| Social page | `/social`: "Find me online." heading, the 3D particle carousel (each platform's icon built from particles on a misty stage — arrows, swipe, ← → keys, autoplay) and a grid cell per platform. Links come from `src/data/socials.ts`; empty ones show "Link coming soon". | `pages/Social.tsx`, `components/social/SocialOrbit.tsx`, `components/social/ParticleScene.tsx` |

The earlier home sections (keyboard hero, creative stage, work showcase…) are still in
`src/components/home/` and unused except `TechSphere` and `StudioTestimonials`, which now live on About.

**Your own avatar.** The character is the MIT-licensed Ready Player Me sample avatar from the
three.js examples, restyled in code (grey hoodie, curly hair, full beard, round glasses) — see
`CREDITS.md`. Poses are procedural, so no animation clips are needed. To use your own likeness,
create a full-body avatar (e.g. avaturn.me from a selfie, or any Mixamo-rigged character), export
GLB, save it as `public/models/avatar.glb` and set `ACCESSORIES = false` in
`src/components/three/Avatar.tsx` if it already has hair and glasses. Keep it under ~2 MB
(Draco/meshopt compression recommended).

**Work page.** `/work` opens with a pinned card deck (`components/projects/WorkDeck.tsx`): giant
WORK / SELECTED type with the avatar perched on the "O", one project card centre stage, and tilted
stacks of upcoming and past projects. Each scroll step flies the next card in and holds it; **Mix**
shuffles the order. Below it is the filterable "All projects" grid. With reduced motion the deck is
a plain list.

**Project covers.** Real screenshots live in `public/projects/<slug>/cover.webp` and are wired up
with `cover` in `src/data/projects.ts`; projects without one get a generated placeholder labelled
"Placeholder cover — add screenshot".

The old sky / hands hero (`components/home/SkyHero.tsx`, `components/three/SkyScene.tsx`,
`components/three/hands/`) is no longer used on any page and can be deleted.

All 3D canvases mount lazily, pause when off screen, use lower resolution and fewer clouds/grass
on phones, and fall back to a static sky gradient without WebGL. With reduced motion the scenes
render still frames and nothing is pinned.

## 1. Edit your content (no component changes needed)

Everything visitors read lives in `src/data/`. Look for `EDIT ME` and `[PLACEHOLDER]` comments.

| File | What it controls |
| --- | --- |
| `profile.ts` | Name, title, roles, location, **email**, availability badge, hero headline, rotating lines, bio, story, approach, values, achievements, **portrait** |
| `projects.ts` | Every project: slug, categories, featured flag, stack, URLs, year, role, status, problem/approach, features, challenges, results, cover, gallery, hover video |
| `services.ts` | Services page accordion (title, description, deliverables, technologies) |
| `skills.ts` | Skills grouped by category with an honest level: `core`, `working` or `exploring` |
| `experience.ts` | Timeline entries (currently all placeholders — replace and remove `placeholder: true`) |
| `socials.ts` | GitHub, LinkedIn, Instagram, WhatsApp — empty `href` hides a link everywhere |
| `navigation.ts` | Header, mobile menu and footer links |
| `home.ts` | Intro text, About areas, **four service groups** (value props, capabilities), **technology showcase** descriptions, How-I-work steps |
| `testimonials.ts` | Testimonial carousel (placeholders show in `npm run dev` only; section hidden in production until a real quote exists) |
| `playground.ts` | Playground experiment titles and descriptions |
| `contact.ts` | Contact form project types and budget ranges |
| `seo.ts` | Per-page titles and descriptions (used at runtime and in the build-time SEO pass) |

Types for every model are in `src/types/content.ts`.

Note: in development, empty sections show small "Dev only" hints (e.g. where to add social links).
They never appear in a production build — empty sections simply hide.

### Honesty rules baked into the content

The seed data contains **only** what was provided. Nothing was invented: no employers, dates,
years of experience, client names, testimonials, metrics or screenshots.

- Empty project fields simply don't render. Projects without a role, problem, features or gallery
  show a **"Details coming soon"** tag on cards and a "Full case study coming soon" panel on their page.
- Project covers are **generated abstract compositions**, each visibly labelled
  *"Placeholder cover — add screenshot"*. They are never presented as real screenshots.
- `profile.achievements` is empty, so the section is hidden until you add verified items.
- Experience entries are flagged `placeholder: true` and the page shows a note until you replace them.
- The About page portrait is a designed placeholder until you set `profile.portrait`.
- Skill levels are a suggested starting point — review them so they reflect your own assessment.

### Adding real project media

1. Export screenshots as WebP or AVIF (≈1600–2400px wide) into `public/projects/<slug>/`.
2. In `projects.ts` set the cover and gallery with **real pixel dimensions** (prevents layout shift):

```ts
cover: { src: '/projects/clipfetch/cover.webp', alt: 'ClipFetch home screen', width: 2400, height: 1500 },
gallery: [
  { src: '/projects/clipfetch/01.webp', alt: 'Download flow', width: 2400, height: 1500, caption: 'Paste a link, pick a format' },
],
previewVideo: { src: '/projects/clipfetch/preview.mp4', poster: '/projects/clipfetch/cover.webp' }, // optional, muted loop on hover
```

### Adding your photo

Put an image in `public/images/` and set `profile.portrait = { src, alt, width, height }`.

---

## 2. Environment variables

Copy `.env.example` to `.env`:

| Variable | Purpose |
| --- | --- |
| `VITE_SITE_URL` | Your production URL, no trailing slash. Used for canonical URLs, Open Graph, `sitemap.xml` and `robots.txt`. Until set, a placeholder domain is used and the build prints a warning. |
| `VITE_CONTACT_ENDPOINT` | URL that accepts a JSON `POST` of `{ name, email, projectType, budget, message }`. |

### Contact form

`src/lib/contact.ts` is the only integration point. It posts JSON to `VITE_CONTACT_ENDPOINT` and
treats **only a 2xx response** as success — the success state is never faked.

- **Formspree** (easiest): create a form, set `VITE_CONTACT_ENDPOINT=https://formspree.io/f/xxxxxxx`.
- **Getform / Basin**: same pattern with their endpoint URL.
- **Your own function**: any Vercel/Netlify/Cloudflare function that accepts the JSON body and returns 2xx.
- **Something else** (EmailJS, Supabase…): replace the body of `submitContact()`.

When no endpoint is set the form still validates, shows a clear "not connected yet" notice, and
returns an explanatory error on submit (plus an email link once `profile.email` is set).

Spam protection: a hidden honeypot field and a minimum time-to-submit check on the client. For
stronger protection enable your provider's server-side filtering (Formspree/Getform include it) or
add Cloudflare Turnstile / hCaptcha in `Contact.tsx` and verify on your endpoint.

---

## 3. Architecture

```
src/
  app/            App shell, routes (lazy), intro context
  components/
    animations/   SplitText, Reveal, ClipImage, Magnetic, Cursor, Marquee, Loader
    home/         Hero, AboutPreview, FeaturedWork (pinned horizontal), Capabilities, TechStack, Process, FinalCta
    layout/       Header, Footer, PageShell (transitions + scroll restore), SmoothScroll, ScrollProgress
    navigation/   MobileMenu
    projects/     ProjectCard, ProjectCover (placeholder art), ProjectMedia, HoverList, Lightbox, TechList
    three/        HeroScene (R3F + custom GLSL), HeroFallback (SVG)
    ui/           Brand (WY monogram, WAQAR. wordmark), Button, Accordion, Seo, PageHeader, CtaBand, BrandIcon, Availability
  data/           All editable content (see above)
  hooks/          useMediaQuery, useLenis, useScrollLock, useLocalTime
  lib/            gsap registration, site config, contact adapter, icon map, intro + scroll state
  pages/          One file per route
  styles/         Tailwind layers, tokens, type scale
  types/          Content models
  utils/          cn, motion/WebGL detection, project helpers
public/           favicon.svg, og-image.png (+ editable og-image.svg), icons/, images/, projects/, fonts/
scripts/          postbuild.mjs (static SEO pass)
```

**Routes:** `/`, `/about`, `/projects`, `/projects/:slug`, `/services`, `/skills`, `/experience`, `/contact`, `*` (404).

### Design system

Colours are CSS variables (`src/styles/index.css`) consumed by Tailwind (`tailwind.config.ts`).
Wrap any section in `.theme-dark` and every utility (`bg-ink`, `text-bone`, `border-line`,
`bg-lime`, …) flips to its dark value — used by the footer, demo stages and playground frames.

The whole site is dark (`:root` and `.theme-dark` share the same values):

| Role | Value |
| --- | --- |
| Surface `ink` / `ink-2` / `ink-3` | `#181719` / `#201F22` / `#2B2A2E` |
| Foreground `bone` | `#F5F0DE` cream |
| Muted text `mute` | `#9E988C` |
| Grid lines `--grid` / hairline `--line` | cream at 13% / 14% |
| Accent: fill `lime`, `border-lime` | `#DF3329` signal red (white text on fills) |
| Accent text `accent` | `#FF6B5E` (lighter red, readable on charcoal) |

**Want a different accent?** Change `--c-fill`, `--c-onfill`, `--c-edge` and `--c-accent` (RGB triplets)
and `--dot` in `src/styles/index.css` — one place, everything follows. (The token names `lime` /
`accent` are historical; they hold whatever accent you set.)

Fonts: **Antonio** (condensed display, uppercase headings), **Space Grotesk** (the "Waqar" in the
logo), **Instrument Serif** (italic "Yunus" in the logo, header taglines and CTA, focus tiles), Inter (body), JetBrains Mono (labels) —
all self-hosted via Fontsource. Fluid type uses `clamp()` (`.t-mega`, `.t-display`, `.t-h2`,
`.t-h3`, `.t-lead`, `.t-label` in `src/styles/index.css`).

The brand device is the **square full stop** in red — in the WY monogram, the loader and the 404 headline.
The main logo is the two-word **Waqar** *Yunus* lockup without it.

### Interface sound

`src/lib/sound.ts` synthesises short UI sounds with the Web Audio API (no audio files). It is
**off by default**; the SOUND toggle in the header turns it on for the session (click sounds on
links/buttons, a tick on nav hover, open/close tones for the menu).

### Motion system

| Library | Used for |
| --- | --- |
| GSAP + ScrollTrigger (`@gsap/react` `useGSAP`) | Split-text reveals, scroll reveals, clip-path image reveals, parallax, pinned horizontal showcase, process/experience timelines, CTA colour flood, footer reveal, magnetic + cursor physics |
| Lenis | Smooth scrolling, driven by GSAP's ticker so ScrollTrigger stays in sync |
| Framer Motion | Route transitions (curtain wipe), dropdown menu panel, accordion height, filter pill, project grid layout animation, lightbox |
| React Three Fiber + three | Particle social stage: icons sampled into ~13k shaded particles that morph between platforms (lazy, only when near the viewport) |

Libraries don't overlap: GSAP owns scroll-linked work, Framer Motion owns React mount/unmount and
layout. Every GSAP animation runs inside `useGSAP`, which reverts tweens and ScrollTriggers on
unmount; listeners, observers, intervals and WebGL geometries/materials are cleaned up explicitly.

**Rules followed:** transforms/opacity only (plus clip-path and CSS custom properties for colour);
no scroll-jacking (the pinned showcase maps native vertical scroll 1:1); content is visible without
JavaScript and only hidden by GSAP at runtime; custom cursor only on fine pointers; `@react-three/drei`
was evaluated and dropped — its `Float` and `PerformanceMonitor` were replaced by a few lines of code.

**Reduced motion** (`prefers-reduced-motion: reduce`): no intro loader, no Lenis (native scroll),
no custom cursor, no magnetic pull, no WebGL (static social icon instead), no sphere auto-spin, no split-text or scroll
reveals, horizontal showcase becomes a vertical list, page transitions become a quick fade, the
marquee and CSS transitions are stopped.

### Performance notes

- Route-level code splitting; a route's chunk is prefetched on hover, focus or touch of a link
  to it, and the rest are warmed 8s after load so they never compete with first paint.
- The only WebGL scene (three.js, ≈235 kB gzip) loads lazily when the social stage is within
  ~400px of the viewport, renders fewer particles on small screens, pauses off screen, and is
  replaced by a static icon with reduced motion or without WebGL.
- The technology showcase is DOM + CSS 3D (no WebGL) and has a plain list view.
- Intro loader runs once per browser session and is skippable (click, tap, Escape or Enter).
- Self-hosted variable fonts with `font-display: swap` and unicode-range subsets.
- Images: provide explicit `width`/`height`, `loading="lazy"`, `decoding="async"`; hover videos use
  `preload="none"` with a poster.

**Measured** (Lighthouse 12, local production build): desktop performance 99–100, mobile 81–86;
accessibility, best practices and SEO 100 on the audited pages. Mobile is below the 90 target —
see **QA.md** for why and what would close the gap.

---

## 4. SEO

- Build-time tags carry `data-seo="static"` and are removed when the app boots, so they never
  duplicate the runtime tags.
- `react-helmet-async` sets title, description, canonical, Open Graph, Twitter Card and JSON-LD
  (`Person` on the home page, `CreativeWork` on case studies) for every route.
- `npm run build` runs `scripts/postbuild.mjs`, which writes **static HTML per route**
  (`dist/about/index.html`, `dist/projects/<slug>/index.html`, …) with that route's metadata baked
  in, plus `sitemap.xml`, `robots.txt` and a `404.html` (noindex).
- `og-image.png` (1200×630) is generated from `public/og-image.svg` — edit the SVG and re-export.

**Trade-off:** this is a client-rendered SPA. Link previews (WhatsApp, LinkedIn, X, Slack) and
crawlers that don't execute JavaScript receive correct per-page titles and descriptions from the
prerendered HTML, but the visible page **body** is rendered client-side. Google renders JavaScript
and will index the content; some other crawlers may not. Full static rendering of body content would
require SSR/SSG (e.g. migrating to Astro or a React framework with prerendering, or adding
`vite-react-ssg`) — feasible, but it conflicts with the WebGL/GSAP-heavy runtime and was not worth
the complexity for a portfolio. Revisit if organic search for the page text matters to you.

---

## 5. Accessibility

Skip link · semantic landmarks and one `h1` per page · visible lime focus rings · full keyboard
support (menu, accordions, filters, lightbox arrows) · mobile menu and lightbox are `aria-modal`
dialogs with focus trap, Escape to close and focus restoration · form fields have labels,
`aria-invalid`, linked error messages and a live error/success region · filter results are announced ·
split-text headings keep a readable `aria-label` · 44px+ tap targets · colour contrast checked
(`bone` on `ink` ≈ 17:1, `mute` on `ink` ≈ 6:1, white on red `lime` ≈ 4.5:1, `accent` on `ink` ≈ 6.4:1).

---

## 6. Deployment

See **DEPLOYMENT.md**. Short version: build command `npm run build`, output directory `dist`,
set `VITE_SITE_URL` (and optionally `VITE_CONTACT_ENDPOINT`). `vercel.json`, `netlify.toml` and
`public/_redirects` already contain SPA fallbacks.

---

## 7. Licences

Technology logos come from [Simple Icons](https://simpleicons.org) (CC0); they remain trademarks
of their owners and are used only to identify technologies. Fonts are SIL Open Font License.
