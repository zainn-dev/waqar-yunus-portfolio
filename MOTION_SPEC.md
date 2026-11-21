# Motion spec — the home globe, the project sheet, the contact panel and the CTA

These timings were measured from frame captures of labs.griflan.com at 1536×730, 60 fps. Each phase was then re-recorded on this site at the same size and checked against the reference. The constants live in code, so change them there; this file only records what each one means.

| Where | What |
|---|---|
| `src/lib/horizon.ts` (`HZ`) | globe geometry, scroll travel, motion table |
| `src/lib/gsap.ts` | the `snappy` curve: `M0,0 C0.094,0.026 0.124,0.127 0.157,0.29 0.197,0.486 0.254,0.8 0.348,0.884 0.42,0.949 0.374,1 1,1` (most of the move in the first third, then a long settle) |
| `src/components/three/GlobeScene.tsx` | the globe engine: tile flights, aim (miniature), intro |
| `src/app/panel.ts` | `DOME_IN = 1.4 s`, `DOME_OUT = 1.1 s`, `domeAim` |

Easing names: `p1o` = power1.out, `p2io` = power2.inOut, `p3io` = power3.inOut. τ is a tile's own clock (0→1). T is the flight's clock in seconds.

## 1. Intro: loader → globe

1. The logo rises and fades (0.6 s, expo.in).
2. At 0.2 s before the logo is gone, the loader hands over (`onReveal`):
   - It stores the ball's place, `horizon.introBall = {x, y, d}` in window px, with d = 0.92 × the canvas width.
   - The page renders under the loader.
   - The loader background fades out over 0.4 s, power2.out.
   - The ball's canvas fades out over 0.45 s, starting 0.12 s later.
3. The home canvas is mounted while the loader is still running, so its shaders and pictures are ready. Its intro starts on its first drawn frame:
   - aim 1→0: grows from the loader ball (crest = top of the ball, diameter d) to the full horizon. 1.5 s, snappy, delay 0.05 s.
   - tiles 0→1: 1 s, power1.out, delay 0.6 s.
   - Without a loader (a reload in the same session), it grows from a ball at 23 % of the field height, diameter 0.47 × field height.

## 2. Globe → project sheet (cluster click)

- The world stays still: no zoom, no pan, no flattening.
- The other clusters dim to 38 % (dim factor 0.62), and the lattice fades within ~0.3 s.
- Tile order: the bottom row first, left to right, then the top row (`[3,4,5,0,1,2]`).
  - Stagger 0.08 s; glide 1.25 s per tile.
- For each tile:
  - box = snappy(τ)
  - release from the sphere = 1 − p2io(clamp(τ·1.25/0.5))
  - spin = p3io(τ)
- Roll per tile (span = the tile's height), with t = flight progress:
  - climb = −0.12·span·sin(πt)
  - sway = 0.04·span·sin(2πt)
  - slide = 0.4·span·sin(πt)·(1−t)^1.6
- The back face is shaded 22 %, and the shade is gone by t = 1.
- On landing, the page's own tiles cross-fade in over 0.3 s. The sheet background fades in over 0.5 s. The details rise 50 px over 0.9 s, expo.out, starting at 1.1 s.

## 3. Project sheet → globe (close)

- The flight reverses: the top row goes first, box = 1 − snappy(τ), and the release amount = snappy(τ).
- The grid comes back early: view = 1 − p1o(clamp((T − 0.1)/0.3)).
- The other clusters undim on 1 − p1o((T − 0.3)/0.6). The tiles are home in about 0.8–1 s.

## 4. Project page → globe (W button)

- The page around the visible gallery fades over 0.4 s, and the header unfolds over 0.45 s, power3.inOut.
- At the same moment, the home chunk, the globe chunk and the project's atlas start loading, so the change of page never blanks.
- The gallery's tiles stay where they are, as page copies. Their pictures come from the cache, so they show without a fade.
- The canvas takes over once that project's texture is on the GPU (at most 1.5 s), then runs the close flight from the page boxes into the nearest copy of the cluster.

## 5. Contact panel open (over the home globe)

- The panel appears at once, with no fade. Its pitch column (and the panel behind it) is see-through, so the home globe itself is what shows there.
- The form and mark columns wipe in from the right edge of the screen to the pitch column's right edge. The clip is `inset(0 0 0 X)`, over 0.6 s, expo.out.
- The home globe aims at the dome:
  - crest = dome top + 5 % of the dome height
  - diameter = 1.18 × the dome width
  - 1.4 s, snappy, no delay
  - tiles → 0 over 0.4 s, delay 0.15 s
- The home readouts and ticker fade out over 0.3 s.
- The dome takes clicks. Clicking it, or Home, closes the panel.

## 6. Contact panel close

- The columns wipe back to the right edge: 0.5 s, power2.in.
- The panel content fades: 0.3 s, delay 0.25 s.
- The globe aims back to the full horizon: 1.1 s, snappy, so it is about 90 % there by ~0.45 s, as in the reference.
- Tiles → 1 over 0.5 s, delay 0.05 s. The readouts and ticker return after 0.25 s.

## 7. CTA liquid

- Soft white liquid, drawn as a metaball field on a grid of 2 css-px cells.
- Rim at field = 1, with a soft band of ±0.22, scaled up smoothly.
- Balls:
  - The main blob: radius 0.24 × max(w, h), on a spring (k 170, c 19). Its radius uses an underdamped spring: 220/12 going in, 70/14 draining out.
  - The main blob stretches along its velocity (up to +55 %) and is squashed on impact.
  - 3 orbiting lobes.
  - A smear of 6 drops, each chasing the one in front (k 70 − 8i, c 10 − 0.8i).
  - 4–5 splash drops when the pointer enters or leaves.
- Where the liquid covers the label, the label is painted again in the button's own colour (`source-atop`), so the text reads red on white and cream on red.
- Press: the button tips toward the press point, ±12° on each axis, scaling to 0.93, with perspective 420 px, over 0.16 s.
- Release: it springs back with elastic.out(1, 0.4) over 1 s, and the label becomes ✕.

## Not exact, and why

- **The CTA liquid.** The reference runs a GPU fluid simulation (WebGPU). Here it is a 2D metaball field with a spring smear. The shape, softness, lag and colour inversion match closely. The swirl inside the fluid does not.
- **The project's 5 clusters repeat round the globe.** They are spaced as far apart as the 10-column ring allows. With 5 projects, a wide screen will sometimes show two copies of one project at the same time; this cannot be avoided without fewer columns, which would change the globe's look.
- **Landing hand-over.** The canvas's tile pictures are drawn into an atlas, so text and photo edges are not pixel-identical to the page's own tiles. The 0.3 s cross-fade hides the switch.
- **W-button landing.** The page copies wait about 0.4–0.5 s on a cold load before they fly: the globe's canvas has to start and compile first. Once the globe has been seen in the session, the wait is much shorter.
