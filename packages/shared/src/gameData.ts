import {
  BULLET_RADIUS,
  COLLISION_COOLDOWN_MS,
  COLLISION_DAMAGE,
  DESK_COLLIDERS,
  DISCONNECT_GRACE_SECONDS,
  MATCH_SECONDS,
  MAX_PLAYERS,
  MIN_FLIGHT_HEIGHT,
  PLAYER_COLORS,
  PLAYER_RADIUS,
  RESPAWN_SECONDS,
  ROOM_CODE_LENGTH,
  SPAWN_INVULNERABLE_SECONDS,
  SPAWN_POINTS,
  SPAWN_ROTATION,
  TICK_RATE,
  WORLD,
  type Aabb,
  type Vec3
} from './constants';
import { PLANES, type PlaneConfig } from './planes';

export interface GameData {
  tickRate: number;
  matchSeconds: number;
  respawnSeconds: number;
  spawnInvulnerableSeconds: number;
  disconnectGraceSeconds: number;
  maxPlayers: number;
  roomCodeLength: number;
  world: {
    width: number;
    depth: number;
    height: number;
    wallThickness: number;
  };
  minFlightHeight: number;
  playerRadius: number;
  bulletRadius: number;
  collisionDamage: number;
  collisionCooldownMs: number;
  spawnRotation: Vec3;
  spawnPoints: Vec3[];
  deskColliders: Aabb[];
  planes: PlaneConfig[];
  playerColors: string[];
}

export function buildGameData(): GameData {
  return {
    tickRate: TICK_RATE,
    matchSeconds: MATCH_SECONDS,
    respawnSeconds: RESPAWN_SECONDS,
    spawnInvulnerableSeconds: SPAWN_INVULNERABLE_SECONDS,
    disconnectGraceSeconds: DISCONNECT_GRACE_SECONDS,
    maxPlayers: MAX_PLAYERS,
    roomCodeLength: ROOM_CODE_LENGTH,
    world: { ...WORLD },
    minFlightHeight: MIN_FLIGHT_HEIGHT,
    playerRadius: PLAYER_RADIUS,
    bulletRadius: BULLET_RADIUS,
    collisionDamage: COLLISION_DAMAGE,
    collisionCooldownMs: COLLISION_COOLDOWN_MS,
    spawnRotation: [...SPAWN_ROTATION],
    spawnPoints: SPAWN_POINTS.map((point) => [...point]),
    deskColliders: DESK_COLLIDERS.map((box) => ({
      min: [...box.min],
      max: [...box.max]
    })),
    planes: PLANES.map((plane) => ({ ...plane })),
    playerColors: [...PLAYER_COLORS]
  };
}
