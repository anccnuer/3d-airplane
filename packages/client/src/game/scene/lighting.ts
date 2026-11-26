import * as THREE from 'three';

export interface AmbientLights {
  hemisphere: THREE.HemisphereLight;
  sun: THREE.DirectionalLight;
}

/**
 * 大厅与对局共用的光照设定。
 * 值与 ThreeGame 内联的光照保持一致，保证两处渲染的明暗风格统一。
 */
export function createAmbientLights(): AmbientLights {
  const hemisphere = new THREE.HemisphereLight('#ffffff', '#8b6f50', 1.5);
  const sun = new THREE.DirectionalLight('#fff3d6', 2.1);
  sun.position.set(-10, 16, 8);
  return { hemisphere, sun };
}
