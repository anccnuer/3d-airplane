export type Vec3 = [number, number, number];

export interface Aabb {
  min: Vec3;
  max: Vec3;
}

export const TICK_RATE = 60;
export const TICK_DT = 1 / TICK_RATE;
export const MAX_PLAYERS = 4;
export const ROOM_CODE_LENGTH = 5;
export const MATCH_SECONDS = 180;
export const RESPAWN_SECONDS = 2.5;
export const SPAWN_INVULNERABLE_SECONDS = 1.5;
export const DISCONNECT_GRACE_SECONDS = 10;

export const CLASSROOM_SCALE = 1.5;
export const PLANE_SCALE = 0.5;

export const WORLD = {
  width: 36 * CLASSROOM_SCALE,
  depth: 28 * CLASSROOM_SCALE,
  height: 9 * CLASSROOM_SCALE,
  wallThickness: 0.4 * CLASSROOM_SCALE
} as const;

export const MIN_FLIGHT_HEIGHT = 0.7 * CLASSROOM_SCALE;
export const PLAYER_RADIUS = 0.62 * PLANE_SCALE;
export const BULLET_RADIUS = 0.12;
export const COLLISION_DAMAGE = 4;
export const COLLISION_COOLDOWN_MS = 650;

function createDeskColliders(): Aabb[] {
  const desks: Aabb[] = [];
  const columns = 6;
  const rows = 4;
  const spacingX = 5.2 * CLASSROOM_SCALE;
  const spacingZ = 5 * CLASSROOM_SCALE;
  const startX = -((columns - 1) * spacingX) / 2;
  const startZ = -6.5 * CLASSROOM_SCALE;
  const halfWidth = 1.15 * CLASSROOM_SCALE;
  const halfDepth = 0.7 * CLASSROOM_SCALE;
  const deskBottom = 0.35 * CLASSROOM_SCALE;
  const deskTop = 1.65 * CLASSROOM_SCALE;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = startX + column * spacingX;
      const z = startZ + row * spacingZ;
      desks.push({
        min: [x - halfWidth, deskBottom, z - halfDepth],
        max: [x + halfWidth, deskTop, z + halfDepth]
      });
    }
  }

  return desks;
}

export const DESK_COLLIDERS: Aabb[] = createDeskColliders();

export const SPAWN_ROTATION: Vec3 = [Math.PI, 0, 0];
export const SPAWN_DESK_INDICES = [13, 16, 19, 22] as const;

export const SPAWN_POINTS: Vec3[] = SPAWN_DESK_INDICES.map((index) => {
  const desk = DESK_COLLIDERS[index];
  return [
    (desk.min[0] + desk.max[0]) / 2,
    desk.max[1] + PLAYER_RADIUS + 0.05,
    (desk.min[2] + desk.max[2]) / 2
  ];
});

export const PLAYER_COLORS = ['#22D3EE', '#F59E0B', '#A78BFA', '#34D399'];
