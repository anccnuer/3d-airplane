import assert from 'node:assert/strict';
import test from 'node:test';
import { PLANES, type PlaneConfig } from '@classroom-arena/shared';

const MECHANICAL_FIELDS = [
  'minSpeed',
  'maxSpeed',
  'acceleration',
  'turnRate',
  'pitchRate',
  'hp',
  'damage',
  'fireRate',
  'bulletSpeed'
] as const satisfies ReadonlyArray<keyof PlaneConfig>;

test('all plane models share identical mechanical stats', () => {
  const [reference, ...rest] = PLANES;
  for (const plane of rest) {
    for (const field of MECHANICAL_FIELDS) {
      assert.equal(plane[field], reference[field], `${plane.id}.${field} differs`);
    }
  }
});

test('plane identities keep distinct visual data', () => {
  assert.equal(new Set(PLANES.map((plane) => plane.id)).size, PLANES.length);
  assert.equal(new Set(PLANES.map((plane) => plane.color)).size, PLANES.length);
});
