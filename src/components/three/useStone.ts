import { useMemo } from 'react';
import * as THREE from 'three';
import { stoneTexture } from '@/components/three/textures';

/** Weathered stone material built from the procedural stone texture. */
export function useStone(color = '#d4d6da') {
  return useMemo(() => {
    const t = stoneTexture();
    const map = t.clone(); map.needsUpdate = true; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(1.5, 1.5);
    return new THREE.MeshStandardMaterial({ color, map, bumpMap: map, bumpScale: 0.18, roughness: 0.88, metalness: 0.0 });
  }, [color]);
}

