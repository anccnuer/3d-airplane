import * as THREE from 'three';
import { PLANE_SCALE, getPlane, type PlaneConfig, type PlaneModelKind } from '@classroom-arena/shared';

export interface PlaneMesh extends THREE.Group {
  userData: THREE.Object3D['userData'] & {
    propeller?: THREE.Group;
    propellers?: THREE.Group[];
  };
}

interface ModelMaterials {
  body: THREE.MeshStandardMaterial;
  wing: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
}

type Vec3Tuple = [number, number, number];

function createMaterials(plane: PlaneConfig, tint?: string): ModelMaterials {
  const color = tint ?? plane.color;
  return {
    body: new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.22, flatShading: true }),
    wing: new THREE.MeshStandardMaterial({
      color,
      roughness: 0.48,
      metalness: 0.16,
      flatShading: true,
      side: THREE.DoubleSide
    }),
    dark: new THREE.MeshStandardMaterial({ color: '#162033', roughness: 0.36, metalness: 0.4 }),
    accent: new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      emissive: color,
      emissiveIntensity: 0.28,
      roughness: 0.5
    })
  };
}

function addBox(
  group: THREE.Group,
  size: Vec3Tuple,
  position: Vec3Tuple,
  material: THREE.Material,
  rotation?: Vec3Tuple
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  group.add(mesh);
  return mesh;
}

function addBody(
  group: THREE.Group,
  materials: ModelMaterials,
  length: number,
  radius: number,
  noseHeight = 0.8
): void {
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.82, radius, length, 6),
    materials.body
  );
  body.rotation.x = Math.PI / 2;
  group.add(body);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.9, noseHeight, 6), materials.body);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = length / 2 + noseHeight / 2;
  group.add(nose);
}

function addCockpit(group: THREE.Group, materials: ModelMaterials, z: number, scale = 1): void {
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.34 * scale, 8, 6), materials.dark);
  cockpit.scale.set(1, 0.65, 1.35);
  cockpit.position.set(0, 0.36 * scale, z);
  group.add(cockpit);
}

function createWingGeometry(
  span: number,
  rootChord: number,
  tipChord: number,
  sweep: number
): THREE.BufferGeometry {
  const half = span / 2;
  const positions = new Float32Array([
    0, 0, rootChord / 2,
    0, 0, -rootChord / 2,
    half, 0, sweep + tipChord / 2,
    half, 0, sweep - tipChord / 2,
    0, 0, rootChord / 2,
    0, 0, -rootChord / 2,
    -half, 0, sweep + tipChord / 2,
    -half, 0, sweep - tipChord / 2
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex([0, 2, 1, 1, 2, 3, 4, 5, 6, 5, 7, 6]);
  geometry.computeVertexNormals();
  return geometry;
}

function addWing(
  group: THREE.Group,
  materials: ModelMaterials,
  span: number,
  rootChord: number,
  tipChord: number,
  sweep: number,
  y: number,
  z = 0.1
): void {
  const wing = new THREE.Mesh(createWingGeometry(span, rootChord, tipChord, sweep), materials.wing);
  wing.position.set(0, y, z);
  group.add(wing);
}

function addTail(
  group: THREE.Group,
  materials: ModelMaterials,
  span: number,
  z: number,
  finHeight = 0.72,
  twin = false
): void {
  addWing(group, materials, span, 0.62, 0.42, -0.12, 0.02, z);
  if (twin) {
    for (const x of [-0.46, 0.46]) {
      addBox(group, [0.1, finHeight, 0.5], [x, finHeight / 2, z - 0.05], materials.accent);
    }
    return;
  }
  addBox(group, [0.12, finHeight, 0.62], [0, finHeight / 2, z - 0.08], materials.accent);
}

function addPropeller(
  group: THREE.Group,
  materials: ModelMaterials,
  z: number,
  x = 0,
  size = 1
): THREE.Group {
  const propeller = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.15 * size, 6, 5), materials.dark);
  propeller.add(hub);
  propeller.add(
    new THREE.Mesh(new THREE.BoxGeometry(0.1 * size, 1.5 * size, 0.08 * size), materials.dark),
    new THREE.Mesh(new THREE.BoxGeometry(1.5 * size, 0.1 * size, 0.08 * size), materials.dark)
  );
  propeller.position.set(x, 0, z);
  group.add(propeller);
  return propeller;
}

function addEngine(group: THREE.Group, materials: ModelMaterials, x: number, z: number): THREE.Group {
  const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.9, 6), materials.body);
  engine.rotation.x = Math.PI / 2;
  engine.position.set(x, -0.06, z);
  group.add(engine);
  return addPropeller(group, materials, z + 0.58, x, 0.85);
}

const BUILDERS: Record<PlaneModelKind, (group: PlaneMesh, materials: ModelMaterials, plane: PlaneConfig) => THREE.Group[]> = {
  biplane(group, materials, plane) {
    addBody(group, materials, 2.7, 0.36);
    addWing(group, materials, plane.wingspan, 0.92, 0.92, 0, 0.34, 0.12);
    addWing(group, materials, plane.wingspan * 0.92, 0.82, 0.82, 0, -0.28, 0.02);
    for (const x of [-0.82, 0.82]) {
      addBox(group, [0.06, 0.66, 0.06], [x, 0.03, 0.08], materials.dark);
    }
    addTail(group, materials, 1.2, -1.28, 0.72);
    addCockpit(group, materials, 0.18);
    addBox(group, [0.16, 0.12, 2.1], [0, 0.29, -0.1], materials.accent);
    return [addPropeller(group, materials, 2.18)];
  },

  swept(group, materials, plane) {
    addBody(group, materials, 2.9, 0.34, 0.95);
    addWing(group, materials, plane.wingspan, 1.05, 0.46, -0.62, 0, 0.16);
    addTail(group, materials, 1.05, -1.42, 0.68);
    addCockpit(group, materials, 0.34, 0.92);
    addBox(group, [0.16, 0.1, 2.2], [0, 0.3, -0.08], materials.accent);
    for (const x of [-0.22, 0.22]) {
      addBox(group, [0.16, 0.16, 0.34], [x, -0.05, -1.55], materials.dark);
    }
    return [];
  },

  heavy(group, materials, plane) {
    addBody(group, materials, 3.2, 0.45, 0.65);
    addWing(group, materials, plane.wingspan, 1.1, 1.0, 0, -0.02, 0.12);
    addTail(group, materials, 1.6, -1.62, 0.8, true);
    addCockpit(group, materials, 0.55, 1.05);
    addBox(group, [0.34, 0.16, 2.6], [0, 0.34, -0.16], materials.accent);
    return [
      addEngine(group, materials, -1.18, 0.42),
      addEngine(group, materials, 1.18, 0.42)
    ];
  },

  twinboom(group, materials, plane) {
    addBody(group, materials, 2.35, 0.32, 0.72);
    addWing(group, materials, plane.wingspan, 0.95, 0.7, -0.18, 0, 0.22);
    for (const x of [-0.92, 0.92]) {
      addBox(group, [0.14, 0.14, 1.85], [x, 0.02, -1.05], materials.body);
      addBox(group, [0.1, 0.66, 0.44], [x, 0.36, -1.92], materials.accent);
    }
    addBox(group, [1.98, 0.1, 0.56], [0, 0.04, -1.96], materials.wing);
    addCockpit(group, materials, 0.32, 1.05);
    addBox(group, [0.14, 0.1, 1.9], [0, 0.28, -0.1], materials.accent);
    return [addPropeller(group, materials, 1.82)];
  },

  delta(group, materials, plane) {
    addBody(group, materials, 2.8, 0.32, 1.1);
    addWing(group, materials, plane.wingspan, 1.9, 0.22, -0.88, -0.02, 0.18);
    addBox(group, [0.12, 0.8, 0.66], [0, 0.42, -1.18], materials.accent);
    addCockpit(group, materials, 0.28, 0.85);
    addBox(group, [0.14, 0.1, 2.2], [0, 0.3, -0.12], materials.accent);
    return [];
  }
};

export function createPlaneMesh(planeId: string, tint?: string): PlaneMesh {
  const plane = getPlane(planeId);
  const group = new THREE.Group() as PlaneMesh;
  group.name = `plane-${plane.id}`;

  const materials = createMaterials(plane, tint);
  const propellers = BUILDERS[plane.model](group, materials, plane);

  group.userData.propeller = propellers[0];
  group.userData.propellers = propellers;
  group.scale.setScalar(PLANE_SCALE);

  return group;
}
