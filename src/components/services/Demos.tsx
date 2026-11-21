import { useEffect, useRef, useState } from 'react';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import { prefersReducedMotion } from '@/utils/motion';

/** Browser chrome used by all demos (mockup elevation is reserved for these panels). */
function Browser({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="shadow-mockup overflow-hidden rounded-t-[6px] border border-[#ffffff1f] bg-[#1f1e1c]">
      <div className="flex items-center gap-1.5 border-b border-[#ffffff1f] px-3 py-2">
        {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 rounded-full bg-[#ffffff38]" />)}
        <span className="ml-3 truncate font-mono text-[10px] text-[#fffaf3]/60">{label}</span>
      </div>
      {children}
    </div>
  );
}

/** Websites: drag the slider to resize the viewport; the layout reflows like a real responsive site. */
export function ResponsiveDemo() {
  const [w, setW] = useState(100);
  const cols = w > 70 ? 3 : w > 45 ? 2 : 1;
  return (
    <div>
      <div className="mx-auto transition-[width] duration-300" style={{ width: `${w}%` }}>
        <Browser label={`${Math.round(320 + (w / 100) * 1120)}px — responsive`}>
          <div className="space-y-2 p-3">
            <div className="flex items-center justify-between"><span className="h-2 w-10 rounded-sm bg-neon" /><span className="flex gap-1">{Array.from({ length: cols === 1 ? 1 : 3 }, (_, i) => <span key={i} className="h-1.5 w-5 rounded-sm bg-[#ffffff38]" />)}</span></div>
            <div className="h-10 rounded-[3px] bg-[#ffffff14]" />
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {Array.from({ length: 3 }, (_, i) => <div key={i} className="h-10 rounded-[3px] bg-[#ffffff1f]" />)}
            </div>
          </div>
        </Browser>
      </div>
      <label className="mt-5 flex items-center gap-3 text-xs text-mute">
        <span className="shrink-0 font-mono">Viewport</span>
        <input type="range" min={20} max={100} value={w} onChange={(e) => setW(Number(e.target.value))} className="w-full accent-[#FF3831]" aria-label="Simulated viewport width" />
      </label>
    </div>
  );
}

/** 3D: drag (or use arrow keys) to spin a CSS 3D cube with inertia. */
export function CubeDemo() {
  const cube = useRef<HTMLDivElement>(null);
  const st = useRef({ rx: -20, ry: 30, vx: 0, vy: 0.25, drag: false, lx: 0, ly: 0 });
  useEffect(() => {
    let raf = 0;
    const reduced = prefersReducedMotion();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const box = cube.current?.getBoundingClientRect();
      if (!box || box.bottom < 0 || box.top > window.innerHeight) return; // paused off screen
      const s = st.current;
      if (!s.drag) { s.ry += s.vy; s.rx += s.vx; s.vx *= 0.95; s.vy = s.vy * 0.95 + (reduced ? 0 : 0.25) * 0.05; }
      if (cube.current) cube.current.style.transform = `rotateX(${s.rx}deg) rotateY(${s.ry}deg)`;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const faces = ['React', 'Three', 'GSAP', 'GLSL', 'Motion', 'WebGL'];
  const tf = ['rotateY(0deg)', 'rotateY(90deg)', 'rotateY(180deg)', 'rotateY(-90deg)', 'rotateX(90deg)', 'rotateX(-90deg)'];
  return (
    <div
      className="flex h-56 cursor-grab touch-none select-none items-center justify-center active:cursor-grabbing"
      style={{ perspective: '700px' }}
      tabIndex={0}
      role="img"
      aria-label="A cube you can spin by dragging or with arrow keys"
      onKeyDown={(e) => {
        const s = st.current;
        if (e.key === 'ArrowLeft') s.vy -= 3; if (e.key === 'ArrowRight') s.vy += 3;
        if (e.key === 'ArrowUp') s.vx += 3; if (e.key === 'ArrowDown') s.vx -= 3;
      }}
      onPointerDown={(e) => { const s = st.current; s.drag = true; s.lx = e.clientX; s.ly = e.clientY; (e.target as Element).setPointerCapture?.(e.pointerId); }}
      onPointerMove={(e) => {
        const s = st.current; if (!s.drag) return;
        const dx = e.clientX - s.lx, dy = e.clientY - s.ly;
        s.ry += dx * 0.5; s.rx -= dy * 0.5; s.vy = dx * 0.5; s.vx = -dy * 0.5; s.lx = e.clientX; s.ly = e.clientY;
      }}
      onPointerUp={() => { st.current.drag = false; }}
      onPointerCancel={() => { st.current.drag = false; }}
    >
      <div ref={cube} className="relative h-28 w-28" style={{ transformStyle: 'preserve-3d' }}>
        {faces.map((f, i) => (
          <div key={f} className="absolute inset-0 flex items-center justify-center border border-[#fff6] bg-[#ffffff0d] font-mono text-xs text-[#fffaf3]" style={{ transform: `${tf[i]} translateZ(56px)` }}>
            {i === 0 ? <span className="text-neon">{f}</span> : f}
          </div>
        ))}
      </div>
    </div>
  );
}

/** E-commerce: a working mini cart (quantity, add, running total). */
export function CartDemo() {
  const [qty, setQty] = useState(1);
  const [cart, setCart] = useState(0);
  const [bump, setBump] = useState(false);
  const price = 1499;
  const add = () => { setCart((c) => c + qty); setBump(true); window.setTimeout(() => setBump(false), 300); };
  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  return (
    <Browser label="store.example — product">
      <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 p-3 text-[#fffaf3] sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-4 sm:p-4">
        <div className="aspect-square rounded-[3px] bg-[linear-gradient(135deg,#FF3831,#FF3831)]" aria-hidden="true" />
        <div>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm">Sample tee</p>
            <span className={`relative inline-flex items-center gap-1 font-mono text-xs transition-transform ${bump ? 'scale-125' : ''}`} aria-live="polite">
              <ShoppingBag className="h-4 w-4" aria-hidden="true" /> {cart}<span className="sr-only"> items in cart</span>
            </span>
          </div>
          <p className="font-mono text-xs text-[#fffaf3]/60">{fmt(price)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity" className="flex h-8 w-8 items-center justify-center rounded-[3px] border border-[#ffffff38]"><Minus className="h-3 w-3" /></button>
            <span className="w-6 text-center font-mono text-sm" aria-label={`Quantity ${qty}`}>{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(9, q + 1))} aria-label="Increase quantity" className="flex h-8 w-8 items-center justify-center rounded-[3px] border border-[#ffffff38]"><Plus className="h-3 w-3" /></button>
            <button type="button" onClick={add} className="h-8 rounded-[3px] bg-neon px-3 text-xs font-semibold text-[#111] sm:ml-auto">Add {fmt(price * qty)}</button>
          </div>
          <p className="mt-3 font-mono text-[10px] text-[#fffaf3]/50">Cart total: {fmt(price * cart)}</p>
        </div>
      </div>
    </Browser>
  );
}

/** Backend: a simulated request/response log (clearly labelled — no network calls). */
export function ApiDemo() {
  const [log, setLog] = useState<{ t: string; line: string; ok?: boolean }[]>([]);
  const [busy, setBusy] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const send = () => {
    if (busy) return;
    setBusy(true);
    const steps = [
      { d: 0, line: 'POST /api/orders  { items: 2 }' },
      { d: 350, line: '→ validate payload … ok' },
      { d: 700, line: '→ create payment intent … ok' },
      { d: 1100, line: '201 Created  · 124 ms', ok: true },
      { d: 1700, line: 'webhook payment.succeeded → order #1042 paid', ok: true },
    ];
    setLog([]);
    steps.forEach((s, i) => {
      timers.current.push(window.setTimeout(() => {
        setLog((l) => [...l, { t: new Date().toLocaleTimeString('en-GB'), line: s.line, ok: s.ok }]);
        if (i === steps.length - 1) setBusy(false);
      }, prefersReducedMotion() ? 0 : s.d));
    });
  };
  return (
    <Browser label="terminal — simulated demo">
      <div className="p-4 font-mono text-[11px] leading-relaxed text-[#fffaf3]/80">
        <div className="min-h-[7.5rem]" aria-live="polite">
          {log.length === 0 && <p className="text-[#fffaf3]/40">Press send to watch an order flow through an API.</p>}
          {log.map((l, i) => (
            <p key={i} className={l.ok ? 'text-neon' : ''}><span className="text-[#fffaf3]/40">{l.t}</span> {l.line}</p>
          ))}
        </div>
        <button type="button" onClick={send} disabled={busy} className="mt-3 h-8 rounded-[3px] bg-neon px-3 font-display text-xs font-semibold text-[#111] disabled:opacity-50">
          {busy ? 'Sending…' : 'Send request'}
        </button>
      </div>
    </Browser>
  );
}
