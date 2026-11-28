import * as THREE from 'three';
import {
  PLAYER_COLORS,
  TICK_RATE,
  WORLD,
  clamp,
  forwardFromRotation,
  getPlane,
  type GameEvent,
  type PlayerState,
  type PublicPlayer,
  type RoomInfo,
  type Snapshot,
  type Vec3
} from '@classroom-arena/shared';
import { sharedRenderer } from './render/Renderer';
import { createClassroom } from './scene/classroom';
import { disposeObject3D } from './scene/disposal';
import { Effects } from './scene/effects';
import { createPlaneMesh, getPlanePropellers, type PlaneMesh } from './scene/planeFactory';
import { InputSystem } from './systems/input';
import { JitterBuffer } from './systems/jitterBuffer';
import { RenderStateSystem } from './systems/renderState';

export interface HudState {
  hp: number;
  maxHp: number;
  speed: number;
  altitude: number;
  score: number;
  kills: number;
  alive: boolean;
  respawnIn: number;
  invulnerable: boolean;
  parked: boolean;
  timeLeft: number;
}

export interface ThreeGameCallbacks {
  sendInput: (input: ReturnType<InputSystem['sample']>) => void;
  onHud: (hud: HudState) => void;
  getClockOffsetMs?: () => number;
  hasClock?: () => boolean;
}

interface PlayerMeta {
  name: string;
  planeId: string;
  color: string;
}

interface PlaneView {
  mesh: PlaneMesh;
  planeId: string;
  color: string;
  position: Vec3;
  rotation: Vec3;
  alive: boolean;
}

export class ThreeGame {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly cameraLookTarget = new THREE.Vector3();
  private lastFrameTime = 0;
  private readonly classroom = createClassroom();
  private readonly effects = new Effects();
  private readonly input: InputSystem;
  private readonly renderState = new RenderStateSystem();
  private readonly jitter = new JitterBuffer<Snapshot>(100);
  private readonly planes = new Map<string, PlaneView>();
  private readonly metadata = new Map<string, PlayerMeta>();

  private roomInfo: RoomInfo | null = null;
  private localId = '';
  private running = false;
  private frameId = 0;
  private hudAccumulator = 0;
  private inputSendAccumulator = 0;
  private inputTick = 0;
  private lastLocalState: PlayerState | null = null;
  private serverClockOffsetMs = 0;
  private hasServerClock = false;
  private readonly resizeObserver: ResizeObserver;

  constructor(
    private readonly container: HTMLElement,
    private readonly callbacks: ThreeGameCallbacks
  ) {
    this.renderer = sharedRenderer.acquire();
    sharedRenderer.attach(container);

    this.camera = new THREE.PerspectiveCamera(
      68,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      200
    );
    this.camera.position.set(0, 5, 14);

    this.scene.background = new THREE.Color('#b9d7ec');
    this.scene.fog = new THREE.Fog('#b9d7ec', 40, 90);
    this.scene.add(this.classroom.group, this.effects.group);

    const hemisphere = new THREE.HemisphereLight('#ffffff', '#8b6f50', 1.5);
    this.scene.add(hemisphere);

    const sun = new THREE.DirectionalLight('#fff3d6', 2.1);
    sun.position.set(-10, 16, 8);
    this.scene.add(sun);

    this.input = new InputSystem(this.renderer.domElement);
    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(container);
  }

  private handleResize = (): void => {
    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    sharedRenderer.resize(width, height);
  };

  setLocalPlayer(playerId: string): void {
    if (this.localId && this.localId === playerId) return;
    this.localId = playerId;
    this.renderState.configureLocal(playerId);
    this.renderState.reset();
    this.jitter.reset();
    this.input.resetMotion();
    this.lastLocalState = null;
  }

  setRoomInfo(room: RoomInfo): void {
    this.roomInfo = room;
    room.players.forEach((player, index) => {
      this.metadata.set(player.id, {
        name: player.name,
        planeId: player.planeId,
        color: PLAYER_COLORS[index % PLAYER_COLORS.length]
      });
    });
  }

  private serverNow(): number {
    if (this.callbacks.hasClock?.()) {
      return Date.now() + (this.callbacks.getClockOffsetMs?.() ?? 0);
    }
    return Date.now() + this.serverClockOffsetMs;
  }

  private trackServerClock(serverTime: number): void {
    if (this.callbacks.hasClock?.()) return;
    const observed = serverTime - Date.now();
    if (!this.hasServerClock) {
      this.serverClockOffsetMs = observed;
      this.hasServerClock = true;
      return;
    }
    this.serverClockOffsetMs = clamp(
      this.serverClockOffsetMs + (observed - this.serverClockOffsetMs) * 0.1,
      -5000,
      5000
    );
  }

  applySnapshot(snapshot: Snapshot): void {
    this.trackServerClock(snapshot.serverTime);
    this.jitter.push(snapshot);
  }

  private consumeSnapshot(snapshot: Snapshot): void {
    const previous = this.renderState.getLocalState();
    const wasParked = previous?.parked ?? false;
    this.renderState.applySnapshot(snapshot);
    const local = this.renderState.getLocalState();
    if (local?.parked && !wasParked) {
      this.input.resetMotion();
    }
    this.effects.syncBullets(snapshot.bullets);
  }

  handleEvents(events: GameEvent[]): void {
    this.effects.handleEvents(events);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = performance.now();
    this.frameId = requestAnimationFrame(this.animate);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frameId);
  }

  private animate = (): void => {
    if (!this.running) return;
    this.frameId = requestAnimationFrame(this.animate);

    const frameTime = performance.now();
    const dt = Math.min((frameTime - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = frameTime;

    this.inputSendAccumulator += dt;
    const inputInterval = 1 / TICK_RATE;
    while (this.inputSendAccumulator >= inputInterval) {
      this.inputSendAccumulator -= inputInterval;
      this.inputTick += 1;
      this.callbacks.sendInput(this.input.sample(this.inputTick, inputInterval));
    }

    const ready = this.jitter.take(this.serverNow());
    if (ready) this.consumeSnapshot(ready);
    this.renderState.update(dt);

    const players = this.renderState.getPlayers();
    this.syncPlaneMeshes(players, dt);
    this.effects.update(dt);
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);

    this.hudAccumulator += dt;
    if (this.hudAccumulator >= 0.1) {
      this.hudAccumulator = 0;
      this.callbacks.onHud(this.buildHud());
    }
  };

  private syncPlaneMeshes(players: ReturnType<RenderStateSystem['getPlayers']>, dt: number): void {
    const seen = new Set<string>();
    const now = this.serverNow();

    for (const player of players) {
      seen.add(player.id);
      const meta = this.metadata.get(player.id);
      const planeId = meta?.planeId ?? 'sparrow';
      const color = meta?.color ?? PLAYER_COLORS[0];
      let view = this.planes.get(player.id);

      if (!view || view.planeId !== planeId || view.color !== color) {
        if (view) disposeObject3D(view.mesh);
        const mesh = createPlaneMesh(planeId, color);
        mesh.rotation.order = 'YXZ';
        this.scene.add(mesh);
        view = {
          mesh,
          planeId,
          color,
          position: [...player.position] as Vec3,
          rotation: [...player.rotation] as Vec3,
          alive: player.alive
        };
        this.planes.set(player.id, view);
      }

      const mesh = view.mesh;
      const invulnerable = now < player.invulnerableUntil;
      mesh.visible = player.alive && (!invulnerable || Math.floor(now / 140) % 2 === 0);

      view.position = [...player.position] as Vec3;
      view.rotation = [...player.rotation] as Vec3;
      view.alive = player.alive;

      mesh.position.set(...view.position);
      mesh.rotation.set(-view.rotation[1], view.rotation[0], view.rotation[2]);

      for (const propeller of getPlanePropellers(mesh)) {
        propeller.rotation.z += dt * (8 + player.speed * 0.8);
      }
    }

    for (const [id, view] of this.planes) {
      if (seen.has(id)) continue;
      this.scene.remove(view.mesh);
      disposeObject3D(view.mesh);
      this.planes.delete(id);
    }
  }

  private updateCamera(dt: number): void {
    const local = this.planes.get(this.localId) ?? (this.planes.values().next().value as PlaneView | undefined);
    if (!local) return;

    const forward = forwardFromRotation(local.rotation);
    const desired = new THREE.Vector3(
      clamp(local.position[0] - forward[0] * 4.2, -WORLD.width / 2 + 1, WORLD.width / 2 - 1),
      clamp(local.position[1] - forward[1] * 4.2 + 1.7, 1, WORLD.height - 1),
      clamp(local.position[2] - forward[2] * 4.2, -WORLD.depth / 2 + 1, WORLD.depth / 2 - 1)
    );
    const desiredLook = new THREE.Vector3(
      local.position[0] + forward[0] * 6,
      local.position[1] + forward[1] * 6 + 0.5,
      local.position[2] + forward[2] * 6
    );

    const follow = 1 - Math.exp(-dt * 20);
    this.camera.position.lerp(desired, follow);
    if (this.cameraLookTarget.lengthSq() === 0) {
      this.cameraLookTarget.copy(desiredLook);
    } else {
      this.cameraLookTarget.lerp(desiredLook, follow);
    }
    this.camera.lookAt(this.cameraLookTarget);
  }

  private buildHud(): HudState {
    const local = this.renderState.getLocalState();
    if (local) this.lastLocalState = local;
    const source = local ?? this.lastLocalState;
    const meta = this.roomInfo?.players.find((player) => player.id === this.localId);
    const maxHp = getPlane(meta?.planeId ?? 'sparrow').hp;
    const now = this.serverNow();
    const respawnAt = source?.respawnAt ?? 0;
    const alive = !source || source.alive || respawnAt <= now;

    return {
      hp: Math.max(0, Math.round(source?.hp ?? 0)),
      maxHp,
      speed: Math.round((source?.speed ?? 0) * 3.6),
      altitude: Math.max(0, Math.round(source?.position[1] ?? 0)),
      score: meta?.score ?? 0,
      kills: meta?.kills ?? 0,
      alive,
      respawnIn: alive ? 0 : Math.max(0, (respawnAt - now) / 1000),
      invulnerable: (source?.invulnerableUntil ?? 0) > now,
      parked: source?.parked ?? false,
      timeLeft: Math.max(0, Math.round(((this.roomInfo?.endsAt ?? now) - now) / 1000))
    };
  }

  dispose(): void {
    this.stop();
    this.resizeObserver.disconnect();
    this.input.dispose();

    for (const view of this.planes.values()) {
      this.scene.remove(view.mesh);
      disposeObject3D(view.mesh);
    }
    this.planes.clear();

    this.scene.remove(this.classroom.group, this.effects.group);
    this.classroom.dispose();
    this.effects.dispose();
    sharedRenderer.detach(this.container);
  }
}
