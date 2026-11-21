/** EDIT ME — Playground experiments. `id` must match a component in src/components/playground. */
export const experiments = [
  { id: 'particle-type', title: 'Particle type', description: 'Two thousand particles hold the wordmark together until your cursor scatters them. They find their way home.', tags: ['Canvas 2D', 'Physics'] },
  { id: 'magnetic-grid', title: 'Magnetic grid', description: 'A field of points that leans towards the pointer, like iron filings near a magnet.', tags: ['Canvas 2D', 'Interaction'] },
  { id: 'flow-field', title: 'Flow field', description: 'Lines drifting through layered noise. Move your cursor to stir the current.', tags: ['Canvas 2D', 'Generative'] },
  { id: 'image-distort', title: 'Image distortion', description: 'An image sliced into strips that ripple away from your cursor, like a finger dragged through water.', tags: ['Canvas 2D', 'Distortion'] },
  { id: 'text-scramble', title: 'Text scramble', description: 'Words decode character by character when you hover or focus them.', tags: ['DOM', 'Typography'] },
  { id: 'social-orbit', title: 'Social particles', description: 'Social icons rebuilt from thousands of shaded particles that morph from one platform to the next.', tags: ['WebGL', 'GLSL', 'three.js'] },
] as const;

export type ExperimentId = (typeof experiments)[number]['id'];
