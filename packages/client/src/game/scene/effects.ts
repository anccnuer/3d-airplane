import * as THREE from 'three';
import type { BulletState, GameEvent, Vec3 } from '@classroom-arena/shared';
import { disposeObject3D } from './disposal';

interface BulletView {
  mesh: THREE.Mesh;
  active: boolean;
}

interface ParticleView {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  velocity: Vec3;
  life: number;
  maxLife: number;
  size: number;
  active: boolean;
}

const FORWARD = new THREE.Vector3(0, 0, 1);

export class Effects {
  readonly group = new THREE.Group();

  private readonly bullets: BulletView[] = [];
  private readonly particles: ParticleView[] = [];
  private lastEventId = 0;

  constructor() {
    this.group.name = 'effects';

    const bulletGeometry = new THREE.SphereGeometry(0.12, 6, 6);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: '#a5f3fc' });

    for (let index = 0; index < 96; index += 1) {
      const mesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
      mesh.scale.set(1, 1, 3.4);
      mesh.visible = false;
      this.bullets.push({ mesh, active: false });
      this.group.add(mesh);
    }

    const particleGeometry = new THREE.IcosahedronGeometry(0.14, 0);
    for (let index = 0; index < 180; index += 1) {
      const material = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 1 });
      const mesh = new THREE.Mesh(particleGeometry, material);
      mesh.visible = false;
      this.particles.push({
        mesh,
        material,
        velocity: [0, 0, 0],
        life: 0,
        maxLife: 1,
        size: 1,
        active: false
      });
      this.group.add(mesh);
    }
  }

  syncBullets(bullets: BulletState[]): void {
    for (const view of this.bullets) {
      view.active = false;
      view.mesh.visible = false;
    }

    for (let index = 0; index < Math.min(bullets.length, this.bullets.length); index += 1) {
      const bullet = bullets[index];
      const view = this.bullets[index];
      const direction = new THREE.Vector3(...bullet.direction).normalize();

      view.mesh.position.set(...bullet.position);
      view.mesh.quaternion.setFromUnitVectors(FORWARD, direction);
      view.mesh.visible = true;
      view.active = true;
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

    for (const particle of this.particles) {
      if (spawned >= count) break;
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
      particle.material.color.set(color);
      particle.material.opacity = 1;
      particle.mesh.position.set(...position);
      particle.mesh.scale.setScalar(particle.size);
      particle.mesh.visible = true;
      spawned += 1;
    }
  }

  update(dt: number): void {
    for (const particle of this.particles) {
      if (!particle.active) continue;

      particle.life -= dt;
      if (particle.life <= 0) {
        particle.active = false;
        particle.mesh.visible = false;
        continue;
      }

      particle.mesh.position.x += particle.velocity[0] * dt;
      particle.mesh.position.y += particle.velocity[1] * dt;
      particle.mesh.position.z += particle.velocity[2] * dt;
      particle.velocity[1] -= 4.5 * dt;

      const ratio = particle.life / particle.maxLife;
      particle.material.opacity = ratio;
      particle.mesh.scale.setScalar(particle.size * (0.5 + ratio * 0.5));
    }
  }

  dispose(): void {
    disposeObject3D(this.group);
  }
}
