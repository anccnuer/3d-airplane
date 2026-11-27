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
  glass: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
}

type Vec3Tuple = [number, number, number];

function createMaterials(plane: PlaneConfig, tint?: string): ModelMaterials {
  const color = tint ?? plane.color;
  return {
    body: new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.12, flatShading: true }),
    wing: new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      metalness: 0.1,
      flatShading: true,
      side: THREE.DoubleSide
    }),
    dark: new THREE.MeshStandardMaterial({ color: '#162033', roughness: 0.42, metalness: 0.25 }),
    accent: new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      emissive: color,
      emissiveIntensity: 0.22,
      roughness: 0.55,
      side: THREE.DoubleSide
    }),
    glass: new THREE.MeshStandardMaterial({
      color: '#9ed8f2',
      emissive: color,
      emissiveIntensity: 0.18,
      transparent: true,
      opacity: 0.82,
      roughness: 0.18,
      metalness: 0.1
    }),
    metal: new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.38, metalness: 0.35 })
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
  const barrelLength = length * 0.62;
  const tailLength = length - barrelLength;
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.9, barrelLength, 8),
    materials.body
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = tailLength / 2;
  group.add(barrel);

  const tail = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.9, radius * 0.52, tailLength, 8),
    materials.body
  );
  tail.rotation.x = Math.PI / 2;
  tail.position.z = -barrelLength / 2;
  group.add(tail);

  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(radius * 0.9, noseHeight, 8),
    materials.body
  );
  nose.rotation.x = Math.PI / 2;
  nose.position.z = barrelLength / 2 + noseHeight / 2;
  group.add(nose);

  addBox(group, [0.12, 0.08, length * 0.48], [0, radius * 0.92, -length * 0.08], materials.accent);
}

function addCockpit(group: THREE.Group, materials: ModelMaterials, z: number, scale = 1): void {
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.34 * scale, 10, 7), materials.glass);
  canopy.scale.set(1, 0.66, 1.35);
  canopy.position.set(0, 0.36 * scale, z);
  group.add(canopy);

  addBox(group, [0.06, 0.32 * scale, 0.72 * scale], [0, 0.5 * scale, z - 0.26 * scale], materials.dark);
  addBox(group, [0.52 * scale, 0.05, 0.06], [0, 0.54 * scale, z + 0.2 * scale], materials.accent);
}

function createWingGeometry(
  span: number,
  rootChord: number,
  tipChord: number,
  sweep: number,
  dihedral = 0
): THREE.BufferGeometry {
  const half = span / 2;
  const tipY = half * Math.tan(dihedral);
  const positions = new Float32Array([
    0, 0, rootChord / 2,
    0, 0, -rootChord / 2,
    half, tipY, sweep + tipChord / 2,
    half, tipY, sweep - tipChord / 2,
    0, 0, rootChord / 2,
    0, 0, -rootChord / 2,
    -half, tipY, sweep + tipChord / 2,
    -half, tipY, sweep - tipChord / 2
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
  z = 0.1,
  dihedral = 0
): void {
  const wing = new THREE.Mesh(
    createWingGeometry(span, rootChord, tipChord, sweep, dihedral),
    materials.wing
  );
  wing.position.set(0, y, z);
  group.add(wing);

  const tipY = y + (span / 2) * Math.tan(dihedral);
  for (const x of [-span / 2, span / 2]) {
    addBox(group, [0.06, 0.05, tipChord * 0.72], [x, tipY, z + sweep], materials.accent);
  }
}

function createFinGeometry(height: number, chord: number, sweep: number): THREE.BufferGeometry {
  const positions = new Float32Array([
    0, 0, chord / 2,
    0, 0, -chord / 2,
    0, height, -chord / 2 + sweep,
    0, 0, chord / 2,
    0, height, -chord / 2 + sweep,
    0, height, chord / 2 + sweep * 0.35
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function addFin(
  group: THREE.Group,
  materials: ModelMaterials,
  x: number,
  z: number,
  height: number,
  chord: number,
  sweep = -0.14
): void {
  const fin = new THREE.Mesh(createFinGeometry(height, chord, sweep), materials.accent);
  fin.position.set(x, 0, z);
  group.add(fin);
  addBox(group, [0.035, height * 0.62, 0.08], [x + 0.03, height * 0.52, z - chord * 0.18], materials.dark);
}

function addTail(
  group: THREE.Group,
  materials: ModelMaterials,
  span: number,
  z: number,
  finHeight = 0.72,
  twin = false
): void {
  addWing(group, materials, span, 0.62, 0.42, -0.12, 0.02, z, 0.08);
  if (twin) {
    for (const x of [-0.46, 0.46]) addFin(group, materials, x, z - 0.05, finHeight, 0.5, -0.12);
    return;
  }
  addFin(group, materials, 0, z - 0.08, finHeight, 0.62, -0.18);
}

function addPropeller(
  group: THREE.Group,
  materials: ModelMaterials,
  z: number,
  x = 0,
  size = 1
): THREE.Group {
  const propeller = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.15 * size, 8, 6), materials.dark);
  propeller.add(hub);

  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.17 * size, 0.28 * size, 8), materials.metal);
  spinner.rotation.x = Math.PI / 2;
  spinner.position.z = 0.16 * size;
  propeller.add(spinner);

  propeller.add(
    new THREE.Mesh(new THREE.BoxGeometry(0.1 * size, 1.5 * size, 0.08 * size), materials.dark),
    new THREE.Mesh(new THREE.BoxGeometry(1.5 * size, 0.1 * size, 0.08 * size), materials.dark)
  );
  propeller.position.set(x, 0, z);
  group.add(propeller);
  return propeller;
}

function addEngine(group: THREE.Group, materials: ModelMaterials, x: number, z: number): THREE.Group {
  const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.9, 8), materials.body);
  engine.rotation.x = Math.PI / 2;
  engine.position.set(x, -0.06, z);
  group.add(engine);

  const cowling = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.26, 0.24, 8), materials.metal);
  cowling.rotation.x = Math.PI / 2;
  cowling.position.set(x, -0.06, z + 0.48);
  group.add(cowling);
  addBox(group, [0.16, 0.1, 0.34], [x, -0.28, z - 0.1], materials.dark);

  return addPropeller(group, materials, z + 0.66, x, 0.85);
}

const BUILDERS: Record<PlaneModelKind, (group: PlaneMesh, materials: ModelMaterials, plane: PlaneConfig) => THREE.Group[]> = {
  biplane(group, materials, plane) {
    addBody(group, materials, 2.7, 0.36);
    addWing(group, materials, plane.wingspan, 0.92, 0.92, 0, 0.52, 0.16, 0.06);
    addWing(group, materials, plane.wingspan * 0.92, 0.82, 0.82, 0, -0.26, 0.04, -0.04);
    for (const x of [-0.82, 0.82]) {
      addBox(group, [0.06, 0.88, 0.06], [x, 0.12, 0.1], materials.dark, [0, 0, 0.05]);
      addBox(group, [0.06, 0.06, 0.44], [x, 0.08, 0.12], materials.dark, [0.3, 0, 0]);
      addBox(group, [0.16, 0.16, 0.16], [x * 0.7, -0.56, 0.12], materials.dark);
    }
    addTail(group, materials, 1.2, -1.32, 0.72);
    addCockpit(group, materials, -0.55, 0.8);
    return [addPropeller(group, materials, 1.78)];
  },

  swept(group, materials, plane) {
    addBody(group, materials, 2.9, 0.34, 1.02);
    addWing(group, materials, plane.wingspan, 1.05, 0.46, -0.62, 0, 0.16, 0.1);
    addTail(group, materials, 1.05, -1.42, 0.68);
    addCockpit(group, materials, 0.34, 0.92);
    for (const x of [-0.28, 0.28]) {
      addBox(group, [0.18, 0.12, 0.42], [x, -0.24, -0.1], materials.dark);
      addBox(group, [0.06, 0.18, 0.46], [x, 0.06, -0.66], materials.accent);
    }
    addBox(group, [0.22, 0.14, 0.4], [0, -0.04, -1.58], materials.metal);
    return [];
  },

  heavy(group, materials, plane) {
    addBody(group, materials, 3.2, 0.45, 0.68);
    addWing(group, materials, plane.wingspan, 1.1, 1.0, 0, -0.02, 0.12, 0.06);
    addTail(group, materials, 1.6, -1.62, 0.8, true);
    addCockpit(group, materials, 0.55, 1.05);
    addBox(group, [0.3, 0.22, 0.5], [0, -0.42, 0.86], materials.dark);
    return [
      addEngine(group, materials, -1.18, 0.42),
      addEngine(group, materials, 1.18, 0.42)
    ];
  },

  twinboom(group, materials, plane) {
    addBody(group, materials, 2.35, 0.32, 0.75);
    addWing(group, materials, plane.wingspan, 0.95, 0.7, -0.18, 0, 0.22, 0.08);
    for (const x of [-0.92, 0.92]) {
      addBox(group, [0.14, 0.14, 1.85], [x, 0.02, -1.05], materials.body);
      addBox(group, [0.1, 0.1, 0.6], [x, 0.02, -1.85], materials.metal);
      addFin(group, materials, x, -2.0, 0.66, 0.44, -0.1);
    }
    addBox(group, [1.98, 0.1, 0.56], [0, 0.04, -1.96], materials.wing, [0, 0, 0.04]);
    addCockpit(group, materials, 0.32, 1.05);
    addBox(group, [0.22, 0.12, 0.28], [0, -0.26, 1.02], materials.dark);
    return [addPropeller(group, materials, 1.93)];
  },

  delta(group, materials, plane) {
    addBody(group, materials, 2.8, 0.32, 1.1);
    addWing(group, materials, plane.wingspan, 1.9, 0.22, -0.88, -0.02, 0.18, 0.04);
    addFin(group, materials, 0, -1.18, 0.8, 0.66, -0.24);
    addCockpit(group, materials, 0.28, 0.85);
    for (const x of [-0.52, 0.52]) {
      addBox(group, [0.28, 0.06, 0.34], [x, 0.04, 1.02], materials.wing, [0, x > 0 ? -0.16 : 0.16, 0]);
    }
    for (const x of [-0.25, 0.25]) addBox(group, [0.16, 0.12, 0.36], [x, -0.04, -1.38], materials.metal);
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
