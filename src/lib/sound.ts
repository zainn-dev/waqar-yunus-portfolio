/**
 * Tiny UI sound system — synthesised with Web Audio, so there are no audio files to load.
 * OFF by default. The visitor's choice is remembered for the session.
 */
type Listener = () => void;
const KEY = 'wy-sound';
let enabled = false;
try { enabled = sessionStorage.getItem(KEY) === '1'; } catch { /* storage unavailable */ }
const listeners = new Set<Listener>();
let ctx: AudioContext | null = null;

export const sound = {
  get enabled() { return enabled; },
  subscribe(fn: Listener) { listeners.add(fn); return () => { listeners.delete(fn); }; },
  toggle() {
    enabled = !enabled;
    try { sessionStorage.setItem(KEY, enabled ? '1' : '0'); } catch { /* ignore */ }
    listeners.forEach((l) => l());
    if (enabled) play('on');
  },
};

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

const presets = {
  tick: { f: 1800, f2: 1200, d: 0.035, g: 0.025, type: 'triangle' as OscillatorType },
  click: { f: 520, f2: 260, d: 0.08, g: 0.06, type: 'sine' as OscillatorType },
  open: { f: 220, f2: 440, d: 0.22, g: 0.05, type: 'sine' as OscillatorType },
  close: { f: 440, f2: 200, d: 0.2, g: 0.05, type: 'sine' as OscillatorType },
  key: { f: 340, f2: 120, d: 0.05, g: 0.045, type: 'triangle' as OscillatorType },
  on: { f: 660, f2: 990, d: 0.14, g: 0.05, type: 'sine' as OscillatorType },
};

export function play(name: keyof typeof presets) {
  if (!enabled || typeof window === 'undefined') return;
  const a = audio();
  if (!a) return;
  const p = presets[name];
  const t = a.currentTime;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = p.type;
  osc.frequency.setValueAtTime(p.f, t);
  osc.frequency.exponentialRampToValueAtTime(p.f2, t + p.d);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(p.g, t + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + p.d);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + p.d + 0.02);
}
