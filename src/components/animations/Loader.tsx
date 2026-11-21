import { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { SESSION_KEY } from '@/lib/intro';
import { horizon } from '@/lib/horizon';
import { Logo } from '@/components/ui/Brand';

/** Wireframe globe for the intro: lat/lon lines, coloured top → bottom, back side faint. */
function drawGlobe(g: CanvasRenderingContext2D, size: number, t: number) {
  const R = size * 0.46;
  const cx = size / 2;
  const cy = size / 2;
  const spin = t * 0.35;
  const tilt = -0.32; // look slightly from below, so the south pole's rings bunch up
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const front = new Path2D();
  const rim = new Path2D();
  const back = new Path2D();

  const P = (lat: number, lon: number) => {
    const cl = Math.cos(lat);
    let x = cl * Math.sin(lon + spin);
    let y = Math.sin(lat);
    let z = cl * Math.cos(lon + spin);
    const y2 = y * ct - z * st;
    z = y * st + z * ct;
    y = y2;
    x = cx + R * x;
    return [x, cy - R * y, z] as const;
  };
  const seg = (a: readonly [number, number, number], b: readonly [number, number, number]) => {
    const z = (a[2] + b[2]) / 2;
    const path = z < 0 ? back : z < 0.45 ? rim : front;
    path.moveTo(a[0], a[1]);
    path.lineTo(b[0], b[1]);
  };
  const D = Math.PI / 180;
  for (let lat = -80; lat <= 80; lat += 10) {
    let prev = P(lat * D, 0);
    for (let lon = 5; lon <= 360; lon += 5) {
      const p = P(lat * D, lon * D);
      seg(prev, p);
      prev = p;
    }
  }
  for (let lon = 0; lon < 360; lon += 10) {
    let prev = P(-90 * D, lon * D);
    for (let lat = -85; lat <= 90; lat += 5) {
      const p = P(lat * D, lon * D);
      seg(prev, p);
      prev = p;
    }
  }

  // colour runs top → bottom and drifts slowly
  const shift = (Math.sin(t * 0.8) + 1) * 0.06;
  const grad = g.createLinearGradient(0, cy - R, 0, cy + R);
  grad.addColorStop(0, '#FF3831');
  grad.addColorStop(0.3 + shift, '#FF3831');
  grad.addColorStop(0.5 + shift, '#3D3BFF');
  grad.addColorStop(0.7, '#A34BFF');
  grad.addColorStop(1, '#2BD46A');

  g.clearRect(0, 0, size, size);
  g.lineWidth = 1;
  g.strokeStyle = 'rgba(255, 253, 219, 0.1)';
  g.stroke(back);
  g.globalAlpha = 0.45;
  g.strokeStyle = grad;
  g.stroke(rim);
  g.globalAlpha = 1;
  g.stroke(front);
}

/**
 * Intro — shown once per browser session, skipped for reduced motion. The colour-flowing logo
 * over a turning wireframe globe; when the page is ready the globe swells and the screen fades
 * into the site. Click, tap, Escape or Enter skips it.
 */
export function Loader({ onDone, onReveal }: { onDone: () => void; onReveal?: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const el = root.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* private mode */ }

    // globe
    const css = cv.clientWidth || 280;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(css * dpr);
    cv.height = Math.round(css * dpr);
    const g = cv.getContext('2d');
    let raf = 0;
    const t0 = performance.now();
    const loop = () => {
      if (g) {
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawGlobe(g, css, (performance.now() - t0) / 1000);
      }
      raf = requestAnimationFrame(loop);
    };
    loop();

    const ctx = gsap.context(() => {
      gsap.from('[data-intro-logo]', { yPercent: 40, opacity: 0, duration: 1.1, ease: 'expo.out' });
      gsap.from(cv, { scale: 0.6, opacity: 0, duration: 1.4, delay: 0.15, ease: 'expo.out' });
    }, el);

    const finish = () => {
      if (done.current) return;
      done.current = true;
      // the ball stays put: the home globe takes over from it at exactly its size and grows out of it
      gsap.timeline({ onComplete: onDone })
        .to(el.querySelector('[data-intro-logo]'), { y: -30, opacity: 0, duration: 0.6, ease: 'expo.in' })
        .add(() => {
          const r = cv.getBoundingClientRect();
          horizon.introBall = { x: r.left + r.width / 2, y: r.top + r.height / 2, d: r.width * 0.92 };
          el.style.pointerEvents = 'none';
          onReveal?.();
        }, '-=0.2')
        .to(el, { backgroundColor: 'rgba(24, 22, 22, 0)', duration: 0.4, ease: 'power2.out' }, '<')
        .to(cv, { opacity: 0, duration: 0.45, ease: 'power1.out' }, '<0.12');
    };

    const fonts = document.fonts?.ready ?? Promise.resolve();
    const loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise((r) => window.addEventListener('load', r, { once: true }));
    const minTime = new Promise((r) => setTimeout(r, 2200));
    Promise.all([fonts, loaded, minTime]).then(finish);
    const failSafe = setTimeout(finish, 5000);

    const skip = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape' && e.key !== 'Enter') return;
      finish();
    };
    window.addEventListener('keydown', skip);
    el.addEventListener('pointerdown', skip);

    return () => {
      ctx.revert();
      cancelAnimationFrame(raf);
      clearTimeout(failSafe);
      window.removeEventListener('keydown', skip);
      el.removeEventListener('pointerdown', skip);
    };
  }, [onDone]);

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-[clamp(1.5rem,4vh,3rem)] bg-ink"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div data-intro-logo>
        <Logo className="logo-flow text-[clamp(2.6rem,5.2vw,5rem)]" />
      </div>
      <canvas ref={canvas} aria-hidden="true" className="h-[clamp(200px,30vh,290px)] w-[clamp(200px,30vh,290px)]" />
    </div>
  );
}
