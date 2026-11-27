import {
  TICK_RATE,
  advanceFlight,
  clampToWorld,
  getPlane,
  resolveDeskCollisions,
  type FlightBody,
  type InputCommand,
  type PlayerState,
  type Vec3
} from '@classroom-arena/shared';

const DT = 1 / TICK_RATE;

function cloneVec3(value: Vec3): Vec3 {
  return [value[0], value[1], value[2]];
}

function toBody(state: PlayerState): FlightBody {
  return {
    position: cloneVec3(state.position),
    rotation: cloneVec3(state.rotation),
    velocity: cloneVec3(state.velocity),
    speed: state.speed,
    parked: state.parked
  };
}

export class PredictionSystem {
  private body: FlightBody | null = null;
  private planeId = 'sparrow';
  private readonly inputs = new Map<number, InputCommand>();
  private lastServerTick = 0;

  configurePlane(planeId: string): void {
    this.planeId = planeId;
  }

  reset(): void {
    this.body = null;
    this.inputs.clear();
    this.lastServerTick = 0;
  }

  rebase(state: PlayerState, tick: number): void {
    this.lastServerTick = tick;
    this.body = toBody(state);
    for (const inputTick of this.inputs.keys()) {
      if (inputTick <= tick) this.inputs.delete(inputTick);
    }
    const pending = [...this.inputs.entries()].sort((a, b) => a[0] - b[0]);
    for (const [inputTick, input] of pending) this.step(input, inputTick);
  }

  predict(input: InputCommand, tick: number): void {
    this.inputs.set(tick, input);
    if (this.inputs.size > 32) {
      const oldest = Math.min(...this.inputs.keys());
      this.inputs.delete(oldest);
    }
    if (this.body) this.step(input, tick);
  }

  getState(): PlayerState | null {
    if (!this.body) return null;
    return {
      id: '',
      position: cloneVec3(this.body.position),
      rotation: cloneVec3(this.body.rotation),
      velocity: cloneVec3(this.body.velocity),
      speed: this.body.speed,
      hp: 0,
      alive: true,
      invulnerableUntil: 0,
      respawnAt: 0,
      parked: this.body.parked
    };
  }

  getLastServerTick(): number {
    return this.lastServerTick;
  }

  private step(input: InputCommand, tick: number): void {
    if (!this.body || tick <= this.lastServerTick) return;
    const plane = getPlane(this.planeId);
    advanceFlight(this.body, input, plane, DT);
    resolveDeskCollisions(this.body);
    const bounds = clampToWorld(this.body.position);
    this.body.position = bounds.position;
  }
}
