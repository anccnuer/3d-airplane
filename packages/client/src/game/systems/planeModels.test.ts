import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { PLANES } from '@classroom-arena/shared';
import { createPlaneMesh } from '../scene/planeFactory';
import { disposeObject3D } from '../scene/disposal';

const PROP_COUNTS: Record<string, number> = {
  sparrow: 1,
  falcon: 0,
  anvil: 2,
  dragonfly: 1,
  comet: 0
};

test('every plane builds finite geometry with expected propellers', () => {
  for (const plane of PLANES) {
    const mesh = createPlaneMesh(plane.id, plane.color);
    let meshCount = 0;
    mesh.traverse((object) => {
      const child = object as THREE.Mesh;
      if (!child.isMesh) return;
      meshCount += 1;
      child.geometry.computeBoundingBox();
      const box = child.geometry.boundingBox;
      assert.ok(box, `${plane.id} geometry has no bounding box`);
      for (const value of [...box.min.toArray(), ...box.max.toArray()]) {
        assert.ok(Number.isFinite(value), `${plane.id} contains non-finite geometry`);
      }
    });

    assert.ok(meshCount > 5, `${plane.id} has too few meshes`);
    assert.equal(mesh.userData.propellers?.length ?? 0, PROP_COUNTS[plane.id]);

    const bounds = new THREE.Box3().setFromObject(mesh);
    const size = bounds.getSize(new THREE.Vector3());
    assert.ok(size.x > 0.5 && size.y > 0.1 && size.z > 1, `${plane.id} has an implausible bounds`);
    disposeObject3D(mesh);
  }
});
