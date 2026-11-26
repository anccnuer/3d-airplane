import * as THREE from 'three';
import { PLANE_SCALE } from '@classroom-arena/shared';
import { createClassroom, type ClassroomScene } from './classroom';
import { disposeObject3D } from './disposal';
import { createPlaneMesh, type PlaneMesh } from './planeFactory';
import { createAmbientLights } from './lighting';

/** 大厅暮色天空：比对局内的白天更暗，让教室边缘没入夜色，同时保证文字对比度。 */
const DUSK = '#39495f';

/** 环绕中心：教室前方、黑板一侧。 */
const ORBIT_CENTER = new THREE.Vector3(0, 4, -2);
const ORBIT_RADIUS = 20;
const ORBIT_HEIGHT = 6.5;
const ORBIT_PERIOD_SECONDS = 80;

const PATROL_SPECS = [
  { planeId: 'sparrow', tint: '#22D3EE', radiusX: 13, radiusZ: 9, speed: 0.28, offset: 0 },
  { planeId: 'falcon', tint: '#F59E0B', radiusX: 10, radiusZ: 12, speed: -0.22, offset: Math.PI }
];

interface PatrolPlane {
  mesh: PlaneMesh;
  radiusX: number;
  radiusZ: number;
  speed: number;
  offset: number;
}

/**
 * 大厅的实时 3D 背景：复用教室场景与战机模型，用缓慢环绕的镜头和巡游战机
 * 营造“机库”氛围。不接收输入、不参与对局，只负责渲染与释放。
 */
export class LobbyScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly classroom: ClassroomScene;
  private readonly patrols: PatrolPlane[] = [];
  private readonly reducedMotion: boolean;
  private frameId = 0;
  private lastFrameTime = 0;
  private elapsed = 0;
  private running = false;
  private disposed = false;
  private visible = true;

  private readonly handleVisibility = (): void => {
    this.visible = !document.hidden;
    if (this.visible && this.running && !this.reducedMotion) {
      this.lastFrameTime = performance.now();
    }
  };

  constructor(container: HTMLElement) {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.inset = '0';
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(DUSK);
    this.scene.fog = new THREE.Fog(DUSK, 30, 75);

    this.camera = new THREE.PerspectiveCamera(
      62,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      200
    );

    const lights = createAmbientLights();
    this.scene.add(lights.hemisphere, lights.sun);

    this.classroom = createClassroom();
    this.scene.add(this.classroom.group);

    for (const spec of PATROL_SPECS) {
      const mesh = createPlaneMesh(spec.planeId, spec.tint);
      mesh.scale.setScalar(1 / PLANE_SCALE);
      this.scene.add(mesh);
      this.patrols.push({
        mesh,
        radiusX: spec.radiusX,
        radiusZ: spec.radiusZ,
        speed: spec.speed,
        offset: spec.offset
      });
    }

    document.addEventListener('visibilitychange', this.handleVisibility);
    this.positionCamera(0);
  }

  start(): void {
    if (this.running || this.disposed) return;
    this.running = true;
    this.lastFrameTime = performance.now();

    if (this.reducedMotion) {
      // CSS 的 prefers-reduced-motion 降级不会影响 rAF，这里必须自行静止机位。
      this.renderer.render(this.scene, this.camera);
      return;
    }
    this.frameId = requestAnimationFrame(this.animate);
  }

  resize(width: number, height: number): void {
    if (this.disposed) return;
    const widthValue = Math.max(width, 1);
    const heightValue = Math.max(height, 1);
    this.renderer.setSize(widthValue, heightValue);
    this.camera.aspect = widthValue / heightValue;
    this.camera.updateProjectionMatrix();
    if (this.reducedMotion) this.renderer.render(this.scene, this.camera);
  }

  private animate = (): void => {
    if (!this.running || this.disposed) return;
    this.frameId = requestAnimationFrame(this.animate);
    if (!this.visible) return;

    const frameTime = performance.now();
    const dt = Math.min((frameTime - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = frameTime;
    this.elapsed += dt;

    this.positionCamera(this.elapsed);
    this.updatePatrols(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private positionCamera(elapsed: number): void {
    const angle = (elapsed / ORBIT_PERIOD_SECONDS) * Math.PI * 2;
    const breathe = 1 + Math.sin(elapsed * 0.12) * 0.06;
    this.camera.position.set(
      ORBIT_CENTER.x + Math.sin(angle) * ORBIT_RADIUS * breathe,
      ORBIT_CENTER.y + ORBIT_HEIGHT + Math.sin(elapsed * 0.35) * 0.4,
      ORBIT_CENTER.z + Math.cos(angle) * ORBIT_RADIUS * breathe
    );
    this.camera.lookAt(ORBIT_CENTER);
  }

  private updatePatrols(dt: number): void {
    for (const patrol of this.patrols) {
      const t = this.elapsed * patrol.speed + patrol.offset;
      const x = Math.cos(t) * patrol.radiusX;
      const z = Math.sin(t) * patrol.radiusZ;
      const directionX = -Math.sin(t) * patrol.radiusX;
      const directionZ = Math.cos(t) * patrol.radiusZ;

      patrol.mesh.position.set(x, 6 + Math.sin(t * 2) * 0.6, z);
      patrol.mesh.rotation.set(0, Math.atan2(directionX, directionZ), Math.sin(t * 2) * 0.18);

      const propeller = patrol.mesh.userData.propeller;
      if (propeller) propeller.rotation.z += dt * 6;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.running = false;

    if (this.frameId) cancelAnimationFrame(this.frameId);
    document.removeEventListener('visibilitychange', this.handleVisibility);

    for (const patrol of this.patrols) {
      this.scene.remove(patrol.mesh);
      disposeObject3D(patrol.mesh);
    }
    this.patrols.length = 0;

    this.scene.remove(this.classroom.group);
    this.classroom.dispose();

    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
