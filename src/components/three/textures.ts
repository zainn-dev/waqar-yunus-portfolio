import * as THREE from 'three';

/** Procedural textures drawn on a canvas — no external image files. */
const cache = new Map<string, THREE.Texture>();

function canvas(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, key: string, srgb = true) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

/** Weathered stone: mottled greys with fine speckle (used as map and bump). */
export const stoneTexture = () =>
  canvas(512, 512, (g) => {
    g.fillStyle = '#c9cbcf';
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * 512, y = Math.random() * 512, r = Math.random() * 18 + 2;
      const v = 165 + Math.random() * 60;
      g.fillStyle = `rgba(${v},${v + 2},${v + 6},${Math.random() * 0.18})`;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 9000; i++) {
      const v = Math.random() > 0.5 ? 60 : 200;
      g.fillStyle = `rgba(${v},${v},${v},0.25)`;
      g.fillRect(Math.random() * 512, Math.random() * 512, 1, 1);
    }
    g.strokeStyle = 'rgba(40,42,46,.25)';
    for (let i = 0; i < 14; i++) {
      g.beginPath(); let x = Math.random() * 512, y = Math.random() * 512; g.moveTo(x, y);
      for (let k = 0; k < 8; k++) { x += (Math.random() - 0.5) * 60; y += (Math.random() - 0.5) * 60; g.lineTo(x, y); }
      g.stroke();
    }
  }, 'stone');

/** Code-editor screen for the monitor and laptop (emissive). */
export const screenTexture = (variant: 'monitor' | 'laptop') =>
  canvas(512, 320, (g) => {
    g.fillStyle = '#0f1117'; g.fillRect(0, 0, 512, 320);
    g.fillStyle = '#1b1e27'; g.fillRect(0, 0, 512, 22);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(14 + i * 14, 11, 4, 0, 7); g.fill(); });
    g.fillStyle = '#161922'; g.fillRect(0, 22, 90, 298);
    const cols = ['#c792ea', '#82aaff', '#c3e88d', '#f78c6c', '#89ddff', '#e7e9ee'];
    for (let i = 0; i < 17; i++) {
      g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(100, 36 + i * 16, 10, 6);
      let x = 118 + (i % 4) * 16;
      const n = 2 + ((i * 7) % 4);
      for (let k = 0; k < n; k++) { const w = 20 + ((i * 13 + k * 29) % 70); g.fillStyle = cols[(i + k) % cols.length]; g.fillRect(x, 36 + i * 16, w, 6); x += w + 8; }
    }
    for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(12, 40 + i * 18, 50 + ((i * 17) % 20), 6); }
    if (variant === 'monitor') { g.fillStyle = '#FF3831'; g.fillRect(118, 300, 120, 6); }
  }, `screen-${variant}`);

/** Soft-edged ground patch alpha for the grass island. */
export const islandAlpha = () =>
  canvas(256, 256, (g) => {
    const grd = g.createRadialGradient(128, 128, 40, 128, 128, 128);
    grd.addColorStop(0, '#fff'); grd.addColorStop(0.72, '#fff'); grd.addColorStop(1, '#000');
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 400; i++) {
      const a = Math.random() * Math.PI * 2, r = 92 + Math.random() * 36;
      g.fillStyle = Math.random() > 0.5 ? '#000' : '#fff';
      g.beginPath(); g.arc(128 + Math.cos(a) * r, 128 + Math.sin(a) * r, Math.random() * 7 + 2, 0, 7); g.fill();
    }
  }, 'island', false);

/** Grass + soil colour map. */
export const groundTexture = () =>
  canvas(512, 512, (g) => {
    g.fillStyle = '#5b6b3a'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 6000; i++) {
      const v = Math.random();
      g.fillStyle = v > 0.85 ? 'rgba(120,98,70,.5)' : v > 0.5 ? 'rgba(98,122,58,.5)' : 'rgba(60,78,36,.5)';
      g.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    }
    for (let i = 0; i < 7; i++) {
      g.fillStyle = 'rgba(150,150,145,.75)';
      g.beginPath(); g.ellipse(80 + Math.random() * 350, 80 + Math.random() * 350, 30 + Math.random() * 40, 20 + Math.random() * 25, Math.random() * 3, 0, 7); g.fill();
    }
  }, 'ground');
