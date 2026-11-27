import * as THREE from 'three';
import type { BulletState, GameEvent, Vec3 } from '@classroom-arena/shared';

interface BulletView {
  mesh: THREE.Mesh;
  id: number | null;
  active: boolean;
}

interface ParticleView {
  color: THREE.Color;
  velocity: Vec3;
  life: number;
  maxLife: number;
  size: number;
  active: boolean;
}

const FORWARD = new THREE.Vector3(0, 0, 1);
const BULLET_CAPACITY = 96;
const PARTICLE_CAPACITY = 180;

export class Effects {
  readonly group = new THREE.Group();

  private readonly bullets: BulletView[] = [];
  private readonly bulletSlots = new Map<number, number>();
  private readonly particles: ParticleView[] = [];
  private readonly particleMesh: THREE.InstancedMesh;
  private readonly matrix = new THREE.Matrix4();
  private readonly position = new THREE.Vector3();
  private readonly scale = new THREE.Vector3();
  private readonly quaternion = new THREE.Quaternion();
  private readonly scratchDirection = new THREE.Vector3();
  private readonly scratchPosition = new THREE.Vector3();
  private readonly scratchMatrix = new THREE.Matrix4();
  private lastEventId = 0;

  constructor() {
    this.group.name = 'effects';

    const bulletGeometry = new THREE.SphereGeometry(0.12, 6, 6);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: '#a5f3fc' });
    for (let index = 0; index < BULLET_CAPACITY; index += 1) {
      const mesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
      mesh.scale.set(1, 1, 3.4);
      mesh.visible = false;
      this.bullets.push({ mesh, id: null, active: false });
      this.group.add(mesh);
    }

    const particleGeometry = new THREE.IcosahedronGeometry(0.14, 0);
    const particleMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.82, depthWrite: false });
    this.particleMesh = new THREE.InstancedMesh(particleGeometry, particleMaterial, PARTICLE_CAPACITY);
    this.particleMesh.frustumCulled = false;
    for (let index = 0; index < PARTICLE_CAPACITY; index += 1) {
      this.particles.push({
        color: new THREE.Color(),
        velocity: [0, 0, 0],
        life: 0,
        maxLife: 1,
        size: 1,
        active: false
      });
      this.writeParticle(index);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    this.group.add(this.particleMesh);
  }

  syncBullets(bullets: BulletState[]): void {
    const seen = new Set<number>();
    for (const bullet of bullets) {
      let slot = this.bulletSlots.get(bullet.id);
      if (slot === undefined) {
        slot = this.bullets.findIndex((view) => !view.active);
        if (slot < 0) break;
        this.bulletSlots.set(bullet.id, slot);
        this.bullets[slot].id = bullet.id;
      }
      seen.add(bullet.id);
      const view = this.bullets[slot];
      view.active = true;
      view.mesh.visible = true;
      view.mesh.position.set(...bullet.position);
      view.mesh.quaternion.setFromUnitVectors(FORWARD, this.scratchDirection.set(...bullet.direction).normalize());
    }
    for (const [id, slot] of this.bulletSlots) {
      if (seen.has(id)) continue;
      this.bullets[slot].active = false;
      this.bullets[slot].mesh.visible = false;
      this.bullets[slot].id = null;
      this.bulletSlots.delete(id);
    }
  }

  handleEvents(events: GameEvent[]): void {
    for (const event of events) {
      if (event.id <= this.lastEventId || !event.position) continue;
      this.lastEventId = event.id;
      if (event.type === 'hit') this.spawnBurst(event.position, 6, '#67e8f9', 0.7);
      if (event.type === 'collision') this.spawnBurst(event.position, 8, '#fbbf24', 0.9);
      if (event.type === 'kill') this.spawnBurst(event.position, 24, '#fb923c', 1.8);
      if (event.type === 'respawn') this.spawnBurst(event.position, 12, '#34d399', 1.2);
    }
  }

  private spawnBurst(position: Vec3, count: number, color: string, size: number): void {
    let spawned = 0;
    for (let index = 0; index < this.particles.length && spawned < count; index += 1) {
      const particle = this.particles[index];
      if (particle.active) continue;
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.35) * 1.4;
      const speed = 2 + Math.random() * 5;
      particle.active = true;
      particle.life = 0.45 + Math.random() * 0.45;
      particle.maxLife = particle.life;
      particle.size = size * (0.55 + Math.random() * 0.65);
      particle.velocity = [
        Math.cos(angle) * Math.cos(elevation) * speed,
        Math.sin(elevation) * speed,
        Math.sin(angle) * Math.cos(elevation) * speed
      ];
      particle.color.set(color);
      this.writeParticle(index, this.scratchPosition.set(...position));
      spawned += 1;
    }
  }

  update(dt: number): void {
    let dirty = false;
    for (let index = 0; index < this.particles.length; index += 1) {
      const particle = this.particles[index];
      if (!particle.active) continue;
      particle.life -= dt;
      if (particle.life <= 0) {
        particle.active = false;
        this.writeParticle(index);
        dirty = true;
        continue;
      }
      this.particleMesh.getMatrixAt(index, this.scratchMatrix);
      this.scratchPosition.setFromMatrixPosition(this.scratchMatrix);
      this.scratchPosition.x += particle.velocity[0] * dt;
      this.scratchPosition.y += particle.velocity[1] * dt;
      this.scratchPosition.z += particle.velocity[2] * dt;
      particle.velocity[1] -= 4.5 * dt;
      this.writeParticle(index, this.scratchPosition);
      dirty = true;
    }
    if (dirty) this.particleMesh.instanceMatrix.needsUpdate = true;
  }

  private writeParticle(index: number, position?: THREE.Vector3): void {
    const particle = this.particles[index];
    const ratio = particle.active ? particle.life / particle.maxLife : 0;
    const target = position ?? new THREE.Vector3(0, -1000, 0);
    this.scale.setScalar(particle.active ? particle.size * (0.5 + ratio * 0.5) : 0);
    this.matrix.compose(target, this.quaternion, this.scale);
    this.particleMesh.setMatrixAt(index, this.matrix);
    this.particleMesh.setColorAt(index, particle.color);
  }

  dispose(): void {
    this.bulletSlots.clear();
    this.group.clear();
    this.group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) material.forEach((value) => value.dispose());
      else if (material) material.dispose();
    });
  }
}
