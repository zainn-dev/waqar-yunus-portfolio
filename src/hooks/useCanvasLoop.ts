import { useEffect, useRef, type RefObject } from 'react';
import { prefersReducedMotion } from '@/utils/motion';

export interface LoopState {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  t: number;
  dt: number;
  /** Pointer in CSS pixels relative to the canvas; null when outside. */
  pointer: { x: number; y: number } | null;
  reduced: boolean;
}

/**
 * Runs `draw` every frame while the canvas is on screen. Handles device pixel ratio, resizing,
 * pointer tracking and cleanup. With reduced motion it renders a single still frame.
 * `setup` runs on mount and on every resize (re-seed particles there).
 */
export function useCanvasLoop(
  ref: RefObject<HTMLCanvasElement | null>,
  draw: (s: LoopState) => void,
  setup?: (s: LoopState) => void,
) {
  const drawRef = useRef(draw);
  const setupRef = useRef(setup);
  drawRef.current = draw;
  setupRef.current = setup;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = prefersReducedMotion();
    const state: LoopState = { ctx, w: 0, h: 0, t: 0, dt: 0, pointer: null, reduced };
    let raf = 0;
    let visible = false;
    let last = performance.now();

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      state.w = r.width;
      state.h = r.height;
      setupRef.current?.(state);
      if (reduced || !visible) drawRef.current(state);
    };
    const frame = (now: number) => {
      state.dt = Math.min((now - last) / 1000, 1 / 20);
      state.t += state.dt;
      last = now;
      drawRef.current(state);
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (reduced || raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start(); else stop();
    });
    io.observe(canvas);

    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      state.pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (reduced) drawRef.current(state);
    };
    const leave = () => { state.pointer = null; };
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerdown', move);
    canvas.addEventListener('pointerleave', leave);
    canvas.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') leave(); });

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerdown', move);
      canvas.removeEventListener('pointerleave', leave);
    };
  }, [ref]);
}
