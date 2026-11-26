import {
  DESK_COLLIDERS,
  MIN_FLIGHT_HEIGHT,
  PLAYER_RADIUS,
  SPAWN_POINTS,
  WORLD,
  type Aabb,
  type Vec3
} from './constants';
import type { PlaneConfig } from './planes';
import type { InputCommand } from './protocol';

export interface FlightBody {
  position: Vec3;
  rotation: Vec3;
  velocity: Vec3;
  speed: number;
  parked: boolean;
}

export interface CollisionResult {
  position: Vec3;
  normal: Vec3;
  hit: boolean;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

export function wrapAngle(angle: number): number {
  const twoPi = Math.PI * 2;
  return ((angle + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
}

export function lerpAngle(from: number, to: number, amount: number): number {
  return wrapAngle(from + wrapAngle(to - from) * amount);
}

export function lerpVec3(from: Vec3, to: Vec3, amount: number): Vec3 {
  return [
    lerp(from[0], to[0], amount),
    lerp(from[1], to[1], amount),
    lerp(from[2], to[2], amount)
  ];
}

export function forwardFromRotation(rotation: Vec3): Vec3 {
  const [yaw, pitch] = rotation;
  const horizontal = Math.cos(pitch);
  return [Math.sin(yaw) * horizontal, Math.sin(pitch), Math.cos(yaw) * horizontal];
}

export function normalizeVec3(vector: Vec3): Vec3 {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

export function spawnPosition(index: number): Vec3 {
  return [...SPAWN_POINTS[index % SPAWN_POINTS.length]] as Vec3;
}

export function advanceFlight(
  body: FlightBody,
  input: Pick<InputCommand, 'throttle' | 'pitch' | 'yaw' | 'roll'>,
  plane: PlaneConfig,
  dt: number
): void {
  if (body.parked) {
    if (input.throttle <= 0) {
      body.velocity = [0, 0, 0];
      body.speed = 0;
      return;
    }
    body.parked = false;
    body.speed = plane.minSpeed;
  }

  const yawInput = clamp(input.yaw + input.roll * 0.18, -1, 1);

  body.rotation[0] = wrapAngle(body.rotation[0] - yawInput * plane.turnRate * dt);
  body.rotation[1] = clamp(body.rotation[1] + input.pitch * plane.pitchRate * dt, -1.25, 1.25);

  const targetRoll = clamp(-input.roll * 0.65 - yawInput * 0.32, -0.9, 0.9);
  body.rotation[2] = lerp(body.rotation[2], targetRoll, Math.min(1, dt * 8));

  const throttle = clamp(input.throttle, -1, 1);
  const acceleration = plane.acceleration * (throttle < 0 ? 1.5 : 1);
  body.speed = clamp(body.speed + throttle * acceleration * dt, plane.minSpeed, plane.maxSpeed);

  const forward = forwardFromRotation(body.rotation);
  body.velocity = [forward[0] * body.speed, forward[1] * body.speed, forward[2] * body.speed];
  body.position[0] += body.velocity[0] * dt;
  body.position[1] += body.velocity[1] * dt;
  body.position[2] += body.velocity[2] * dt;
}

export function resolveSphereAabb(position: Vec3, radius: number, box: Aabb): CollisionResult {
  const closest: Vec3 = [
    clamp(position[0], box.min[0], box.max[0]),
    clamp(position[1], box.min[1], box.max[1]),
    clamp(position[2], box.min[2], box.max[2])
  ];
  const delta: Vec3 = [position[0] - closest[0], position[1] - closest[1], position[2] - closest[2]];
  const distanceSq = delta[0] ** 2 + delta[1] ** 2 + delta[2] ** 2;

  if (distanceSq > radius * radius) {
    return { position: [...position] as Vec3, normal: [0, 0, 0], hit: false };
  }

  if (distanceSq > 1e-8) {
    const distance = Math.sqrt(distanceSq);
    const normal: Vec3 = [delta[0] / distance, delta[1] / distance, delta[2] / distance];
    const push = radius - distance;
    return {
      position: [
        position[0] + normal[0] * push,
        position[1] + normal[1] * push,
        position[2] + normal[2] * push
      ],
      normal,
      hit: true
    };
  }

  const faces = [
    { distance: position[0] - box.min[0], normal: [-1, 0, 0] as Vec3 },
    { distance: box.max[0] - position[0], normal: [1, 0, 0] as Vec3 },
    { distance: position[1] - box.min[1], normal: [0, -1, 0] as Vec3 },
    { distance: box.max[1] - position[1], normal: [0, 1, 0] as Vec3 },
    { distance: position[2] - box.min[2], normal: [0, 0, -1] as Vec3 },
    { distance: box.max[2] - position[2], normal: [0, 0, 1] as Vec3 }
  ];
  const nearest = faces.reduce((best, face) => (face.distance < best.distance ? face : best), faces[0]);
  const push = nearest.distance + radius;

  return {
    position: [
      position[0] + nearest.normal[0] * push,
      position[1] + nearest.normal[1] * push,
      position[2] + nearest.normal[2] * push
    ],
    normal: nearest.normal,
    hit: true
  };
}

export function clampToWorld(position: Vec3, radius = PLAYER_RADIUS): CollisionResult {
  const result: CollisionResult = { position: [...position] as Vec3, normal: [0, 0, 0], hit: false };
  const minX = -WORLD.width / 2 + radius;
  const maxX = WORLD.width / 2 - radius;
  const minZ = -WORLD.depth / 2 + radius;
  const maxZ = WORLD.depth / 2 - radius;
  const minY = MIN_FLIGHT_HEIGHT;
  const maxY = WORLD.height - radius;

  if (result.position[0] < minX) {
    result.position[0] = minX;
    result.normal = [1, 0, 0];
    result.hit = true;
  } else if (result.position[0] > maxX) {
    result.position[0] = maxX;
    result.normal = [-1, 0, 0];
    result.hit = true;
  }

  if (result.position[1] < minY) {
    result.position[1] = minY;
    result.normal = [0, 1, 0];
    result.hit = true;
  } else if (result.position[1] > maxY) {
    result.position[1] = maxY;
    result.normal = [0, -1, 0];
    result.hit = true;
  }

  if (result.position[2] < minZ) {
    result.position[2] = minZ;
    result.normal = [0, 0, 1];
    result.hit = true;
  } else if (result.position[2] > maxZ) {
    result.position[2] = maxZ;
    result.normal = [0, 0, -1];
    result.hit = true;
  }

  return result;
}

export function resolveDeskCollisions(body: FlightBody): boolean {
  let collided = false;

  for (const desk of DESK_COLLIDERS) {
    const result = resolveSphereAabb(body.position, PLAYER_RADIUS, desk);
    if (!result.hit) continue;

    body.position = result.position;
    body.speed *= 0.82;
    collided = true;
  }

  return collided;
}

export function pointInsideAabb(point: Vec3, box: Aabb, padding = 0): boolean {
  return (
    point[0] >= box.min[0] - padding &&
    point[0] <= box.max[0] + padding &&
    point[1] >= box.min[1] - padding &&
    point[1] <= box.max[1] + padding &&
    point[2] >= box.min[2] - padding &&
    point[2] <= box.max[2] + padding
  );
}

export function distanceSq(a: Vec3, b: Vec3): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}
