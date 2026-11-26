import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Vec3 } from '../packages/shared/src/constants';
import { advanceFlight, type FlightBody } from '../packages/shared/src/math';
import { getPlane } from '../packages/shared/src/planes';
import type { InputCommand as Command } from '../packages/shared/src/protocol';

interface GoldenVector {
  name: string;
  planeId: string;
  body: {
    position: Vec3;
    rotation: Vec3;
    velocity: Vec3;
    speed: number;
    parked: boolean;
  };
  input: {
    throttle: number;
    pitch: number;
    yaw: number;
    roll: number;
  };
  dt: number;
  expected: {
    position: Vec3;
    rotation: Vec3;
    velocity: Vec3;
    speed: number;
    parked: boolean;
  };
}

function body(position: Vec3, rotation: Vec3, speed: number, parked = false): FlightBody {
  return { position: [...position], rotation: [...rotation], velocity: [0, 0, 0], speed, parked };
}

function input(throttle: number, pitch: number, yaw: number, roll: number): Pick<Command, 'throttle' | 'pitch' | 'yaw' | 'roll'> {
  return { throttle, pitch, yaw, roll };
}

const cases: GoldenVector[] = [];
const dt = 1 / 60;
const rotations: Vec3[] = [
  [Math.PI, 0, 0],
  [0, 0, 0],
  [3.1, 0.2, -0.1],
  [-3.1, -0.3, 0.15]
];
const inputs = [
  input(1, 0, 0, 0),
  input(1, 0, 1, 0),
  input(1, 0, -1, 0),
  input(1, 0.6, 0.4, 0),
  input(1, -0.5, -0.3, 0),
  input(0, 0, 0.2, 1),
  input(-1, 0.3, -0.2, -1)
];

for (const planeId of ['sparrow', 'falcon', 'anvil', 'dragonfly', 'comet']) {
  rotations.forEach((rotation, index) => {
    const command = inputs[index % inputs.length];
    const initial = body([0, 2, 0], rotation, 10);
    advanceFlight(initial, command, getPlane(planeId), dt);
    cases.push({
      name: `${planeId}-${index}`,
      planeId,
      body: {
        position: [0, 2, 0],
        rotation: [...rotation],
        velocity: [0, 0, 0],
        speed: 10,
        parked: false
      },
      input: { ...command },
      dt,
      expected: {
        position: [...initial.position],
        rotation: [...initial.rotation],
        velocity: [...initial.velocity],
        speed: initial.speed,
        parked: initial.parked
      }
    });
  });
}

const parkedBody = body([1, 3, 2], [Math.PI, 0, 0], 0, true);
const parkedBefore = { ...parkedBody, position: [...parkedBody.position] as Vec3 };
advanceFlight(parkedBody, input(0, 0, 0, 0), getPlane('sparrow'), dt);
cases.push({
  name: 'parked-no-throttle',
  planeId: 'sparrow',
  body: {
    position: parkedBefore.position,
    rotation: [...parkedBefore.rotation],
    velocity: [0, 0, 0],
    speed: 0,
    parked: true
  },
  input: { throttle: 0, pitch: 0, yaw: 0, roll: 0 },
  dt,
  expected: {
    position: [...parkedBody.position],
    rotation: [...parkedBody.rotation],
    velocity: [...parkedBody.velocity],
    speed: parkedBody.speed,
    parked: parkedBody.parked
  }
});

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(root, 'server/internal/simulation/testdata/golden.json');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(cases, null, 2)}\n`);
console.log(`wrote ${target} (${cases.length} vectors)`);
