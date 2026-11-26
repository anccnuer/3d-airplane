import {
  MIN_FLIGHT_HEIGHT,
  PLAYER_RADIUS,
  WORLD,
  clamp,
  lerp,
  lerpAngle,
  lerpVec3,
  wrapAngle,
  type PlayerState,
  type Snapshot,
  type Vec3
} from '@classroom-arena/shared';

const EXTRAPOLATION_WINDOW = 0.1;
const LOCAL_FOLLOW_RATE = 30;
const REMOTE_FOLLOW_RATE = 18;

function cloneState(player: PlayerState): PlayerState {
  return {
    ...player,
    position: [...player.position] as Vec3,
    rotation: [...player.rotation] as Vec3,
    velocity: [...player.velocity] as Vec3
  };
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function clampPosition(position: Vec3): Vec3 {
  const radius = PLAYER_RADIUS;
  return [
    clamp(position[0], -WORLD.width / 2 + radius, WORLD.width / 2 - radius),
    clamp(position[1], MIN_FLIGHT_HEIGHT, WORLD.height - radius),
    clamp(position[2], -WORLD.depth / 2 + radius, WORLD.depth / 2 - radius)
  ];
}

interface RemoteState {
  current: PlayerState;
  target: PlayerState;
  elapsed: number;
  interval: number;
}

export class RenderStateSystem {
  private localId = '';
  private localBase: PlayerState | null = null;
  private localVisual: PlayerState | null = null;
  private localLinearVelocity: Vec3 = [0, 0, 0];
  private localAngularVelocity: Vec3 = [0, 0, 0];
  private localElapsed = 0;
  private lastSnapshotAt = 0;
  private readonly remotes = new Map<string, RemoteState>();

  configureLocal(playerId: string): void {
    this.localId = playerId;
  }

  reset(): void {
    this.localBase = null;
    this.localVisual = null;
    this.localLinearVelocity = [0, 0, 0];
    this.localAngularVelocity = [0, 0, 0];
    this.localElapsed = 0;
    this.lastSnapshotAt = 0;
    this.remotes.clear();
  }

  applySnapshot(snapshot: Snapshot): void {
    const now = snapshot.serverTime;
    const interval = this.lastSnapshotAt > 0 ? Math.min(0.25, Math.max(0.001, (now - this.lastSnapshotAt) / 1000)) : 1 / 60;
    this.lastSnapshotAt = now;
    const seen = new Set<string>();

    for (const player of snapshot.players) {
      seen.add(player.id);
      if (player.id === this.localId) {
        this.updateLocal(player, interval);
        continue;
      }
      const remote = this.remotes.get(player.id);
      if (!remote) {
        const state = cloneState(player);
        this.remotes.set(player.id, { current: state, target: cloneState(player), elapsed: 0, interval });
      } else {
        remote.current = cloneState(remote.current);
        remote.target = cloneState(player);
        remote.elapsed = 0;
        remote.interval = interval;
      }
    }

    for (const id of this.remotes.keys()) {
      if (!seen.has(id)) this.remotes.delete(id);
    }
  }

  update(dt: number): void {
    if (this.localBase && this.localVisual) {
      this.localElapsed += dt;
      const follow = 1 - Math.exp(-dt * LOCAL_FOLLOW_RATE);
      const targetPosition = this.localElapsed <= EXTRAPOLATION_WINDOW
        ? clampPosition([
            this.localBase.position[0] + this.localLinearVelocity[0] * this.localElapsed,
            this.localBase.position[1] + this.localLinearVelocity[1] * this.localElapsed,
            this.localBase.position[2] + this.localLinearVelocity[2] * this.localElapsed
          ])
        : this.localBase.position;
      const targetRotation: Vec3 = this.localElapsed <= EXTRAPOLATION_WINDOW
        ? [
            wrapAngle(this.localBase.rotation[0] + this.localAngularVelocity[0] * this.localElapsed),
            this.localBase.rotation[1] + this.localAngularVelocity[1] * this.localElapsed,
            this.localBase.rotation[2] + this.localAngularVelocity[2] * this.localElapsed
          ]
        : this.localBase.rotation;

      this.localVisual.position = lerpVec3(this.localVisual.position, targetPosition, follow);
      this.localVisual.rotation = [
        lerpAngle(this.localVisual.rotation[0], targetRotation[0], follow),
        lerp(this.localVisual.rotation[1], targetRotation[1], follow),
        lerp(this.localVisual.rotation[2], targetRotation[2], follow)
      ];
    }

    for (const remote of this.remotes.values()) {
      remote.elapsed += dt;
      const amount = clamp(remote.elapsed / remote.interval, 0, 1);
      const follow = 1 - Math.exp(-dt * REMOTE_FOLLOW_RATE);
      const blend = Math.min(1, Math.max(amount, follow));
      remote.current.position = lerpVec3(remote.current.position, remote.target.position, blend);
      remote.current.rotation = [
        lerpAngle(remote.current.rotation[0], remote.target.rotation[0], blend),
        lerp(remote.current.rotation[1], remote.target.rotation[1], blend),
        lerp(remote.current.rotation[2], remote.target.rotation[2], blend)
      ];
      remote.current.speed = lerp(remote.current.speed, remote.target.speed, blend);
      remote.current.velocity = lerpVec3(remote.current.velocity, remote.target.velocity, blend);
      remote.current.hp = remote.target.hp;
      remote.current.alive = remote.target.alive;
      remote.current.invulnerableUntil = remote.target.invulnerableUntil;
      remote.current.respawnAt = remote.target.respawnAt;
      remote.current.parked = remote.target.parked;
    }
  }

  getPlayers(): PlayerState[] {
    const players: PlayerState[] = [];
    if (this.localBase && this.localVisual) {
      players.push({
        ...this.localVisual,
        hp: this.localBase.hp,
        alive: this.localBase.alive,
        invulnerableUntil: this.localBase.invulnerableUntil,
        respawnAt: this.localBase.respawnAt,
        parked: this.localBase.parked,
        speed: this.localBase.speed,
        velocity: this.localBase.velocity
      });
    }
    for (const remote of this.remotes.values()) players.push(remote.current);
    return players;
  }

  getLocalState(): PlayerState | null {
    if (!this.localBase || !this.localVisual) return null;
    return {
      ...this.localVisual,
      hp: this.localBase.hp,
      alive: this.localBase.alive,
      invulnerableUntil: this.localBase.invulnerableUntil,
      respawnAt: this.localBase.respawnAt,
      parked: this.localBase.parked,
      speed: this.localBase.speed,
      velocity: this.localBase.velocity
    };
  }

  private updateLocal(player: PlayerState, interval: number): void {
    if (!this.localBase || !this.localVisual || distance(this.localBase.position, player.position) > 6 || this.localBase.alive !== player.alive) {
      this.localBase = cloneState(player);
      this.localVisual = cloneState(player);
      this.localLinearVelocity = [0, 0, 0];
      this.localAngularVelocity = [0, 0, 0];
      this.localElapsed = 0;
      return;
    }

    this.localLinearVelocity = [
      (player.position[0] - this.localBase.position[0]) / interval,
      (player.position[1] - this.localBase.position[1]) / interval,
      (player.position[2] - this.localBase.position[2]) / interval
    ];
    this.localAngularVelocity = [
      wrapAngle(player.rotation[0] - this.localBase.rotation[0]) / interval,
      (player.rotation[1] - this.localBase.rotation[1]) / interval,
      (player.rotation[2] - this.localBase.rotation[2]) / interval
    ];
    this.localBase = cloneState(player);
    this.localElapsed = 0;
  }
}
