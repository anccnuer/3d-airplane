import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { PLANES } from '@classroom-arena/shared';
import { createPlaneMesh, getPlanePropellers } from '../scene/planeFactory';
import { disposeObject3D } from '../scene/disposal';

const PROP_COUNTS: Record<string, number> = {
  sparrow: 1,
  falcon: 0,
  anvil: 2,
  dragonfly: 1,
  comet: 0
};

const REQUIRED_PARTS: Record<string, string[]> = {
  sparrow: ['fuselage', 'cockpit', 'fin', 'wing-upper-left', 'wing-lower-left', 'tailplane-left'],
  falcon: ['fuselage', 'canopy', 'fin', 'wing-left', 'tailplane-left'],
  anvil: ['fuselage', 'canopy', 'fin', 'wing-left', 'tailplane-left', 'engine-nacelle'],
  dragonfly: ['fuselage', 'canopy', 'fin', 'wing-left', 'tailplane-left', 'tail-boom'],
  comet: ['fuselage', 'canopy', 'fin', 'wing-left', 'canard-left']
};

function signedVolume(geometry: THREE.BufferGeometry): number {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const triangleCount = index ? index.count / 3 : position.count / 3;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let volume = 0;

  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const ia = index ? index.getX(triangle * 3) : triangle * 3;
    const ib = index ? index.getX(triangle * 3 + 1) : triangle * 3 + 1;
    const ic = index ? index.getX(triangle * 3 + 2) : triangle * 3 + 2;
    a.fromBufferAttribute(position, ia);
    b.fromBufferAttribute(position, ib);
    c.fromBufferAttribute(position, ic);
    volume += a.dot(b.cross(c)) / 6;
  }

  return volume;
}

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
    assert.equal(getPlanePropellers(mesh).length, PROP_COUNTS[plane.id]);

    for (const part of REQUIRED_PARTS[plane.id]) {
      assert.ok(mesh.getObjectByName(part), `${plane.id} is missing part ${part}`);
    }

    for (const propeller of getPlanePropellers(mesh)) {
      assert.equal(propeller.parent, mesh, `${plane.id} propeller is not attached to the plane`);
    }

    const bounds = new THREE.Box3().setFromObject(mesh);
    const size = bounds.getSize(new THREE.Vector3());
    assert.ok(size.x > 0.5 && size.y > 0.1 && size.z > 1, `${plane.id} has an implausible bounds`);
    disposeObject3D(mesh);
  }
});

test('custom loft geometry is closed and wound outward', () => {
  for (const plane of PLANES) {
    const mesh = createPlaneMesh(plane.id, plane.color);
    mesh.traverse((object) => {
      const child = object as THREE.Mesh;
      if (!child.isMesh || !child.geometry.userData.closed) return;
      assert.ok(
        signedVolume(child.geometry) > 0,
        `${plane.id} ${child.name || 'unnamed'} has inward-facing geometry`
      );
    });
    disposeObject3D(mesh);
  }
});
