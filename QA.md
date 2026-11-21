# QA report — 3D reference-style home (latest)

Executed against the production build in headless Chromium (software WebGL), November 2026.

- `tsc`, `eslint`, `npm run build`: pass.
- Layout matrix, 12 URLs × 9 widths (320–1920px), fully scrolled: **108/108 clean** — no
  horizontal overflow, no console errors.
- Interaction suite: **30/30** — header (monogram, centred wordmark, sound off by default, menu),
  hero 3D canvas, headline, annotation, intro, day/sunset/night switching, header ink flips at
  night, menu links/CTA/socials, Creative stage (title, avatar canvas, capabilities, labels,
  desktop pin), workstation canvas + testimonial empty state, ticker, work showcase, all lower
  sections mount, footer, all routes, contact validation, mobile menu navigation, reduced motion
  (no loader, visible headline, no pin), zero console errors.
- Visual review at 1440px and 390px for all three sky modes and both stages; fixes made for sky
  colour, stone material, avatar seating, framing and three mobile overlaps.

**Not measured for this version:** Lighthouse (the sandbox renders WebGL in software, which makes
performance numbers meaningless for a 3D hero) and real-GPU frame rates. Test on real devices.

---

# QA report

Executed against the production build in headless Chromium (Playwright), November 2026.
This file covers the current light editorial design; earlier sections below are kept for history.

## Current design — checks run

- `tsc` strict, `eslint`, `npm run build`: pass (18 route HTML files + sitemap).
- Layout matrix: 12 URLs × 9 widths (320–1920px), each fully scrolled — see "Matrix" below.
- Interaction tests (all pass after fixes): nav order; hero headline, name/role, two CTAs; ticker
  values derived from data; **sound off by default** and toggles; MENU opens on desktop with
  CTA + 6 socials and closes with Escape; testimonials unpublished in production; hero work stack
  shuffles; work showcase (5 featured rows) ↔ index view (10); logo marquee links (10); four
  service groups; cart demo adds items; API demo log; responsive demo slider; tech sphere (17
  items) rotates, drag rotates, keyboard selection shows description, list fallback; "GOT A
  PROJECT IN MIND?"; dark footer with GMT +5:30, availability and year; Services page groups +
  detail list; Playground (particle type, magnetic grid, flow field, image distortion, text
  scramble, pinned scroll story, social particles); contact validation; LinkWallah case-study
  route; mobile menu navigation; no WebGL on mobile load; reduced-motion hero; no console errors.

### Bugs found and fixed in this round
- Tech sphere ignored keyboard selection after a mouse drag (stale drag distance).
- Particle wordmark / image distortion sampled a zero-size canvas before layout (console error).
- Tech sphere pause-when-off-screen observer never resumed; replaced with per-frame visibility.
- "Close" label invisible in the header (conflicting transform classes); button sized to "Menu".
- Character masks clipped descenders ("y" in "stay").
- Horizontal overflow on phones: header at 320px, service-group grids sized to the demo's
  min-content, transition curtain label, hero work stack.
- Experience timeline slide-in caused overflow; long project titles at 320px.

- **Final round:** heavy home sections now mount in idle-time steps (or when scrolled near), and
  the page tree no longer re-renders when the intro finishes. That exposed a back/forward bug:
  the browser's own scroll restoration (reset to `auto` by a library) and positions saved
  mid-transition sent Back to a clamped position. Fixed (manual restoration enforced, positions
  saved only for the page on screen, deferred sections mounted on back/forward, Lenis
  re-measured). Verified: Back restores 3407/11344/15078px exactly (±41px where late sections
  settle), Forward restores Contact's position, push navigation starts at top, reduced motion too.

### Final results
- Layout matrix: 12 URLs × 9 widths (320, 360, 375, 390, 414, 768, 1024, 1440, 1920) — **108/108
  clean**, no horizontal overflow, no console errors.
- Interaction suite: **44/44 pass** (two consecutive runs).
- Lighthouse 12 (local production build):

| Page | Mobile perf | Desktop perf | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- | --- |
| `/` | 64 | 92 | 96 | 100 | 100 |
| `/work` | 78 | 99 | 100 | 100 | 100 |
| `/contact` | 79 | 96 | 100 | 100 | 100 |

  The home page's remaining accessibility flag is the intentional scroll-lit introduction (words
  start at low opacity and brighten as you scroll). Mobile performance is below 90: the page body
  renders client-side, so first paint waits for React, GSAP, Lenis and Motion on a throttled phone.
  Server-rendering/prerendering the body would be the next step if mobile scores matter.

### Not tested
Real Safari/Firefox/Edge and physical devices; screen readers; a real form provider; the WebGL
stage on a real GPU (this sandbox renders WebGL in software).

---

## Previous design (history)

All checks below were **executed** against the production build (`npm run build` + `vite preview`)
in headless Chromium 153 via Playwright, in November 2026. Nothing here is estimated.

## Build & static checks

| Check | Result |
| --- | --- |
| `tsc` (strict) | Pass, 0 errors |
| `eslint .` | Pass, 0 errors, 0 warnings |
| `npm run build` | Pass; 17 route HTML files, `sitemap.xml`, `robots.txt`, `404.html` generated |
| three.js chunk | Lazy; **not** preloaded on first paint (verified in `dist/index.html`) |

## Layout matrix — 11 URLs × 9 widths = 99 combinations

Widths 320, 360, 375, 390, 414, 768, 1024, 1440, 1920. URLs: all 8 pages, two project pages,
an unknown route and an unknown project slug. Each page was scrolled top to bottom so every
scroll animation ran.

- Horizontal overflow: **none** (one 320px card overflow found and fixed).
- Console errors / uncaught exceptions: **none**.
- Unknown routes and unknown project slugs render the 404 page with `noindex`.

## Interaction tests (all pass)

**Navigation & transitions.** Every route loads directly (deep links) and via client navigation ·
a project page opens scrolled to top · back restores the previous scroll position exactly ·
forward works · next-project link is correct · rapid clicking across five routes settles on the
last one · page exit is never blocked after using accordions, filters, search or the contact form.

**Mobile menu (375px).** Opens as a modal dialog · scroll locked · focus moves inside and is
trapped (incl. the toggle) · current page marked with `aria-current` · Escape closes · focus
returns to the toggle · scroll unlocked · choosing a link navigates and closes.

**Projects.** Category filter (URL-synced) · search by name/technology · empty state with a
working "Clear filters" · count announced to screen readers.

**Contact.** Required-field errors with `aria-invalid` and linked messages · email format error ·
`?type=` preselects the service · *with an endpoint configured and the network mocked*: loading
state shown, success shown **only after a 2xx**, payload correct (honeypot never sent), HTTP 500
shows an error, network failure shows an error · honeypot filled by typing blocks sending ·
submitting within 2.5s of page load is blocked · *without an endpoint*: visitor-friendly notice,
no fake success.

**Keyboard.** Skip link is the first tab stop and moves focus to `<main>` · accordions open and
close with Enter and Space, one panel at a time.

**Reduced motion** (`prefers-reduced-motion: reduce`). No intro loader · no WebGL (SVG
sculpture) · hero text fully visible with no transform · no custom cursor · horizontal showcase
not pinned.

**Intro loader.** Plays on the first home visit in a session, not on reload, and never on deep
links to inner pages.

**Production content.** No developer hints (`src/data…`, `VITE_…`) appear on any production page.

## Lighthouse 12 (local `vite preview`, default throttling)

| Page | Mobile perf | Desktop perf | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- | --- |
| `/` | 81 | 99 | 100 mobile / 96 desktop¹ | 100 | 100 |
| `/projects` | 86 | 100 | 100 | 100 | 100 |
| `/contact` | 85 | 99 | 100 | 100 | 100 |
| `/projects/clipfetch` | 86 | 100 | 100 | 100 | 100 |

CLS ≤ 0.04 everywhere. Desktop LCP 0.7–0.9s; mobile LCP 3.3–3.5s (simulated slow 4G + 4× CPU).

¹ The desktop home audit captures the hero's meta text mid-fade during its entrance animation
(a fresh Lighthouse session also plays the intro), which axe reads as low contrast. The text is
full contrast once the entrance finishes. A second issue in that run (link accessible names not
matching visible text) was fixed and re-verified at 100.

**Mobile performance is below the 90 target.** The limit is JavaScript start-up on a throttled
mid-range phone: the page body is rendered client-side, so first paint waits for React, GSAP,
Lenis and Framer Motion (~165 kB gzip). Options if you need 90+: server-render or prerender the
page body (see README › SEO), or drop Framer Motion in favour of GSAP for the transitions and
menu. Your real-world numbers will depend on your host and CDN, so re-run Lighthouse on the
deployed URL.

## Bugs found and fixed during QA

- Clicking a category filter left a shared-layout (`layoutId`) animation pending inside the
  page-transition `AnimatePresence`, so **navigation away from /projects silently stalled**.
  Replaced with a CSS active state; covered by a regression test.
- Card title + "Details coming soon" tag overflowed at 320px.
- The WebGL support probe leaked a GL context on every check.
- Static SEO tags could conflict with runtime tags on hosts that serve the generic shell
  (two canonicals); static tags are now removed at boot.
- Footer text briefly failed contrast during its scroll-linked fade; the fade was removed.
- Eager idle preloading of every route chunk competed with first load; replaced with
  intent-based prefetch (hover / focus / touch) and an 8s idle fallback.
- Mobile hero headline was undersized; it now stacks one word per line on phones.

## Not tested

- Real Safari, Firefox and Edge, and real iOS/Android devices (only Chromium with mobile
  emulation was available). Areas to check by hand: Lenis on iOS Safari, `backdrop-filter`
  on the header, the WebGL shader on Safari's ANGLE/Metal backend.
- A real form provider (only a mocked endpoint was tested).
- Screen readers (VoiceOver, NVDA). Semantics and ARIA were checked programmatically only.
- Deployed-host behaviour (Vercel/Netlify rewrites); the configs follow each host's documented format.
