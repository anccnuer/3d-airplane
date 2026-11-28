import * as THREE from 'three';
import { PLANE_SCALE, getPlane, type PlaneConfig, type PlaneModelKind } from '@classroom-arena/shared';

export interface PlaneMesh extends THREE.Group {
  userData: THREE.Object3D['userData'] & {
    propeller?: THREE.Group;
    propellers?: THREE.Group[];
  };
}

/** 返回模型上的所有螺旋桨，兼容只记录首个桨的旧数据。 */
export function getPlanePropellers(mesh: PlaneMesh): THREE.Group[] {
  if (mesh.userData.propellers) return mesh.userData.propellers;
  return mesh.userData.propeller ? [mesh.userData.propeller] : [];
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
type Point3 = [number, number, number];

function createMaterials(plane: PlaneConfig, tint?: string): ModelMaterials {
  const color = tint ?? plane.color;
  return {
    body: new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1, flatShading: true }),
    wing: new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.08, flatShading: true }),
    dark: new THREE.MeshStandardMaterial({ color: '#1b2436', roughness: 0.5, metalness: 0.25, flatShading: true }),
    accent: new THREE.MeshStandardMaterial({
      color: '#f6ead2',
      emissive: color,
      emissiveIntensity: 0.16,
      roughness: 0.6,
      flatShading: true
    }),
    glass: new THREE.MeshStandardMaterial({
      color: '#9ed8f2',
      emissive: color,
      emissiveIntensity: 0.12,
      transparent: true,
      opacity: 0.82,
      roughness: 0.18,
      metalness: 0.1,
      flatShading: true
    }),
    metal: new THREE.MeshStandardMaterial({ color: '#7c8798', roughness: 0.4, metalness: 0.45, flatShading: true })
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

function addStrut(
  group: THREE.Group,
  from: Vec3Tuple,
  to: Vec3Tuple,
  thickness: number,
  material: THREE.Material
): THREE.Mesh {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const direction = new THREE.Vector3().subVectors(end, start);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, direction.length(), thickness), material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  group.add(mesh);
  return mesh;
}

function signedVolume(geometry: THREE.BufferGeometry): number {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const triangleCount = index ? index.count / 3 : position.count / 3;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let volume = 0;

  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const ia = index ? index.getX(triangle * 3) : triangle * 3;
    const ib = index ? index.getX(triangle * 3 + 1) : triangle * 3 + 1;
    const ic = index ? index.getX(triangle * 3 + 2) : triangle * 3 + 2;
    a.fromBufferAttribute(position, ia);
    b.fromBufferAttribute(position, ib);
    c.fromBufferAttribute(position, ic);
    volume += a.dot(b.cross(c)) / 6;
  }

  return volume;
}

/** 放样几何统一按“外表面”朝向输出，避免镜像机翼或座舱出现内外面翻转。 */
function ensureOutwardWinding(geometry: THREE.BufferGeometry): void {
  if (signedVolume(geometry) >= 0) {
    geometry.computeVertexNormals();
    return;
  }

  const index = geometry.getIndex();
  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      const second = index.getX(i + 1);
      index.setX(i + 1, index.getX(i + 2));
      index.setX(i + 2, second);
    }
    index.needsUpdate = true;
  } else {
    const position = geometry.getAttribute('position');
    for (let i = 0; i < position.count; i += 3) {
      const x = position.getX(i + 1);
      const y = position.getY(i + 1);
      const z = position.getZ(i + 1);
      position.setXYZ(i + 1, position.getX(i + 2), position.getY(i + 2), position.getZ(i + 2));
      position.setXYZ(i + 2, x, y, z);
    }
    position.needsUpdate = true;
  }
  geometry.computeVertexNormals();
}

interface LoftSection {
  points: Point3[];
}

/**
 * 将若干同点数截面沿首尾方向放样成封闭实体。
 * 截面点序保持一致即可，函数会自动修正整体朝向。
 */
function createLoftGeometry(sections: LoftSection[], capStart = true, capEnd = true): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const sideCount = sections[0].points.length;

  for (const section of sections) {
    for (const [x, y, z] of section.points) positions.push(x, y, z);
  }

  const at = (section: number, point: number): number => section * sideCount + (point % sideCount);

  for (let section = 0; section < sections.length - 1; section += 1) {
    for (let point = 0; point < sideCount; point += 1) {
      const a = at(section, point);
      const b = at(section, point + 1);
      const c = at(section + 1, point + 1);
      const d = at(section + 1, point);
      indices.push(a, c, b, a, d, c);
    }
  }

  const addCap = (sectionIndex: number, reverse: boolean): void => {
    const section = sections[sectionIndex];
    const center = section.points.reduce<Point3>(
      (sum, point) => [sum[0] + point[0] / sideCount, sum[1] + point[1] / sideCount, sum[2] + point[2] / sideCount],
      [0, 0, 0]
    );
    const centerIndex = positions.length / 3;
    positions.push(...center);
    for (let point = 0; point < sideCount; point += 1) {
      const first = at(sectionIndex, point);
      const second = at(sectionIndex, point + 1);
      if (reverse) indices.push(centerIndex, second, first);
      else indices.push(centerIndex, first, second);
    }
  };

  if (capStart) addCap(0, false);
  if (capEnd) addCap(sections.length - 1, true);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  ensureOutwardWinding(geometry);
  geometry.userData.closed = true;
  return geometry;
}

function ringPoints(radiusX: number, radiusY: number, z: number, sides = 8): Point3[] {
  const points: Point3[] = [];
  for (let i = 0; i < sides; i += 1) {
    const angle = ((i + 0.5) / sides) * Math.PI * 2;
    points.push([Math.cos(angle) * radiusX, Math.sin(angle) * radiusY, z]);
  }
  return points;
}

function addFuselage(
  group: THREE.Group,
  materials: ModelMaterials,
  profile: Array<[z: number, radiusX: number, radiusY?: number]>,
  sides = 8
): THREE.Mesh {
  const sections = profile.map(([z, radiusX, radiusY = radiusX]) => ({
    points: ringPoints(radiusX, radiusY, z, sides)
  }));
  const geometry = createLoftGeometry(sections, true, true);
  const mesh = new THREE.Mesh(geometry, materials.body);
  mesh.name = 'fuselage';
  group.add(mesh);
  return mesh;
}

interface WingSpec {
  span: number;
  rootChord: number;
  tipChord: number;
  sweep: number;
  dihedral: number;
  thickness: number;
  y: number;
  z: number;
}

function wingSection(x: number, y: number, z: number, chord: number, thickness: number): Point3[] {
  return [
    [x, y, z + chord / 2],
    [x, y - thickness / 2, z + chord * 0.15],
    [x, y, z - chord / 2],
    [x, y + thickness / 2, z + chord * 0.15]
  ];
}

function addWingPair(
  group: THREE.Group,
  materials: ModelMaterials,
  spec: WingSpec,
  name: string,
  tipAccent = true
): void {
  const half = spec.span / 2;
  const tipY = spec.y + half * Math.tan(spec.dihedral);
  const tipZ = spec.z + spec.sweep;
  const tipThickness = spec.thickness * 0.6;
  const root = wingSection(0, spec.y, spec.z, spec.rootChord, spec.thickness);

  for (const sign of [-1, 1]) {
    const tip = wingSection(sign * half, tipY, tipZ, spec.tipChord, tipThickness);
    // 翼尖色带用同一截面放样，厚度与翼尖一致，避免出现悬浮的白色厚片。
    const bandWidth = Math.min(0.09, half * 0.18);
    const bandT = 1 - bandWidth / half;
    const bandStart = wingSection(
      sign * (half - bandWidth),
      spec.y + (tipY - spec.y) * bandT,
      spec.z + (tipZ - spec.z) * bandT,
      spec.rootChord + (spec.tipChord - spec.rootChord) * bandT,
      spec.thickness + (tipThickness - spec.thickness) * bandT
    );
    const wingEnd = tipAccent ? bandStart : tip;

    const geometry = createLoftGeometry([{ points: root }, { points: wingEnd }], true, true);
    const mesh = new THREE.Mesh(geometry, materials.wing);
    mesh.name = `${name}-${sign < 0 ? 'left' : 'right'}`;
    group.add(mesh);

    if (tipAccent) {
      const bandGeometry = createLoftGeometry([{ points: bandStart }, { points: tip }], true, true);
      const band = new THREE.Mesh(bandGeometry, materials.accent);
      band.name = `${name}-tip-${sign < 0 ? 'left' : 'right'}`;
      group.add(band);
    }
  }
}

interface FinSpec {
  x: number;
  y: number;
  z: number;
  height: number;
  rootChord: number;
  tipChord: number;
  sweep: number;
  thickness: number;
}

function finSection(
  x: number,
  y: number,
  z: number,
  height: number,
  rootChord: number,
  tipChord: number,
  sweep: number
): Point3[] {
  return [
    [x, y, z + rootChord / 2],
    [x, y, z - rootChord / 2],
    [x, y + height, z + sweep - tipChord / 2],
    [x, y + height, z + sweep + tipChord / 2]
  ];
}

function addFin(group: THREE.Group, materials: ModelMaterials, spec: FinSpec, name: string): void {
  const halfThickness = spec.thickness / 2;
  const left = finSection(-halfThickness, spec.y, spec.z, spec.height, spec.rootChord, spec.tipChord, spec.sweep);
  const right = finSection(halfThickness, spec.y, spec.z, spec.height, spec.rootChord, spec.tipChord, spec.sweep);
  const geometry = createLoftGeometry([{ points: left }, { points: right }], true, true);
  const mesh = new THREE.Mesh(geometry, materials.body);
  mesh.name = name;
  mesh.position.x = spec.x;
  group.add(mesh);

  const tip = new THREE.Mesh(
    new THREE.BoxGeometry(spec.thickness * 1.2, 0.05, spec.tipChord * 0.82),
    materials.accent
  );
  tip.position.set(spec.x, spec.y + spec.height - 0.015, spec.z + spec.sweep);
  group.add(tip);

  const fillet = new THREE.Mesh(
    new THREE.BoxGeometry(spec.thickness * 2, 0.12, spec.rootChord * 0.7),
    materials.body
  );
  fillet.position.set(spec.x, spec.y + 0.04, spec.z);
  group.add(fillet);
}

interface CanopySpec {
  z: number;
  y: number;
  length: number;
  width: number;
  height: number;
}

function canopyLoop(z: number, y: number, width: number, height: number): Point3[] {
  return [
    [-width / 2, y, z],
    [-width * 0.3, y + height, z],
    [width * 0.3, y + height, z],
    [width / 2, y, z]
  ];
}

function addCanopy(group: THREE.Group, materials: ModelMaterials, spec: CanopySpec, name = 'canopy'): void {
  const profile: Array<[number, number, number]> = [
    [spec.z + spec.length * 0.5, spec.width * 0.18, spec.height * 0.08],
    [spec.z + spec.length * 0.25, spec.width * 0.7, spec.height * 0.55],
    [spec.z - spec.length * 0.05, spec.width, spec.height],
    [spec.z - spec.length * 0.35, spec.width * 0.8, spec.height * 0.7],
    [spec.z - spec.length * 0.5, spec.width * 0.28, spec.height * 0.1]
  ];
  const sections = profile.map(([z, width, height]) => ({ points: canopyLoop(z, spec.y, width, height) }));
  const geometry = createLoftGeometry(sections, true, true);
  const mesh = new THREE.Mesh(geometry, materials.glass);
  mesh.name = name;
  group.add(mesh);

  addBox(group, [spec.width + 0.06, 0.05, spec.length * 0.86], [0, spec.y + 0.02, spec.z], materials.dark);
}

function addOpenCockpit(group: THREE.Group, materials: ModelMaterials, z: number, y: number): void {
  const coaming = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.21, 0.07, 8), materials.body);
  coaming.name = 'cockpit-coaming';
  coaming.position.set(0, y, z);
  group.add(coaming);

  const opening = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 8), materials.dark);
  opening.name = 'cockpit';
  opening.position.set(0, y + 0.01, z);
  group.add(opening);

  addBox(group, [0.3, 0.12, 0.035], [0, y + 0.07, z + 0.2], materials.glass, [-0.3, 0, 0]);
  addBox(group, [0.32, 0.025, 0.045], [0, y + 0.115, z + 0.2], materials.dark, [-0.3, 0, 0]);
}

function addPropeller(materials: ModelMaterials, size: number, bladeCount: number): THREE.Group {
  const propeller = new THREE.Group();
  propeller.name = 'propeller';

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * size, 0.16 * size, 0.18 * size, 8), materials.dark);
  hub.rotation.x = Math.PI / 2;
  hub.position.z = -0.02 * size;
  propeller.add(hub);

  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.16 * size, 0.28 * size, 8), materials.accent);
  spinner.rotation.x = Math.PI / 2;
  spinner.position.z = 0.14 * size;
  propeller.add(spinner);

  for (let i = 0; i < bladeCount; i += 1) {
    const blade = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.09 * size, 0.52 * size, 0.035 * size), materials.dark);
    mesh.position.y = 0.34 * size;
    mesh.rotation.y = 0.22;
    blade.add(mesh);

    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.09 * size, 0.08 * size, 0.04 * size), materials.accent);
    tip.position.y = 0.58 * size;
    tip.rotation.y = 0.22;
    blade.add(tip);

    blade.rotation.z = (i / bladeCount) * Math.PI * 2;
    propeller.add(blade);
  }

  return propeller;
}

function placePropeller(
  group: THREE.Group,
  materials: ModelMaterials,
  x: number,
  y: number,
  z: number,
  size: number,
  bladeCount = 2
): THREE.Group {
  const propeller = addPropeller(materials, size, bladeCount);
  propeller.position.set(x, y, z);
  group.add(propeller);
  return propeller;
}

function addCowling(
  group: THREE.Group,
  materials: ModelMaterials,
  x: number,
  y: number,
  z: number,
  radius: number,
  length: number
): void {
  const cowling = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.92, length, 8),
    materials.body
  );
  cowling.rotation.x = Math.PI / 2;
  cowling.position.set(x, y, z);
  group.add(cowling);

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.82, radius * 0.82, 0.04, 8), materials.dark);
  disc.rotation.x = Math.PI / 2;
  disc.position.set(x, y, z + length / 2 + 0.01);
  group.add(disc);
}

function addEngine(
  group: THREE.Group,
  materials: ModelMaterials,
  x: number,
  y: number,
  z: number,
  propSize: number
): THREE.Group {
  const profile: Array<[number, number]> = [
    [0.5, 0.2],
    [0.35, 0.27],
    [0, 0.29],
    [-0.3, 0.23],
    [-0.45, 0.13]
  ];
  const sections = profile.map(([dz, radius]) => ({ points: ringPoints(radius, radius * 0.95, dz) }));
  const geometry = createLoftGeometry(sections, true, true);
  const nacelle = new THREE.Mesh(geometry, materials.body);
  nacelle.name = 'engine-nacelle';
  nacelle.position.set(x, y, z);
  group.add(nacelle);

  addCowling(group, materials, x, y, z + 0.5, 0.27, 0.2);
  addBox(group, [0.14, 0.22, 0.5], [x, y + 0.13, z - 0.05], materials.body);
  return placePropeller(group, materials, x, y, z + 0.72, propSize, 3);
}

function addBoom(group: THREE.Group, materials: ModelMaterials, x: number, zFront: number, zRear: number): void {
  const profile: Array<[number, number, number]> = [
    [zFront, 0.24, 0.24],
    [zFront - 0.35, 0.16, 0.18],
    [zRear + 0.3, 0.13, 0.15],
    [zRear, 0.1, 0.12]
  ];
  const sections = profile.map(([z, width, height]) => ({
    points: [
      [x - width / 2, 0.02 - height / 2, z],
      [x - width / 2, 0.02 + height / 2, z],
      [x + width / 2, 0.02 + height / 2, z],
      [x + width / 2, 0.02 - height / 2, z]
    ] as Point3[]
  }));
  const geometry = createLoftGeometry(sections, true, true);
  const mesh = new THREE.Mesh(geometry, materials.body);
  mesh.name = 'tail-boom';
  group.add(mesh);

  addBox(group, [0.14, 0.14, 0.18], [x, 0.02, zRear + 0.05], materials.accent);
}

function addLandingGear(group: THREE.Group, materials: ModelMaterials): void {
  const wheelZ = 0.38;
  for (const x of [-0.45, 0.45]) {
    addStrut(group, [x * 0.55, -0.22, wheelZ], [x, -0.6, wheelZ], 0.05, materials.dark);
    addStrut(group, [x * 0.35, -0.28, wheelZ - 0.3], [x, -0.6, wheelZ], 0.04, materials.dark);

    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 8), materials.dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, -0.6, wheelZ);
    group.add(wheel);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8), materials.metal);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(x, -0.6, wheelZ);
    group.add(hub);
  }

  addBox(group, [0.9, 0.05, 0.05], [0, -0.6, wheelZ], materials.dark);
  addStrut(group, [0, -0.12, -1.1], [0, -0.28, -1.28], 0.04, materials.dark);

  const tailWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 8), materials.dark);
  tailWheel.rotation.z = Math.PI / 2;
  tailWheel.position.set(0, -0.28, -1.28);
  group.add(tailWheel);
}

function addSpine(
  group: THREE.Group,
  materials: ModelMaterials,
  zFront: number,
  zRear: number,
  yFront: number,
  yRear: number,
  width = 0.08,
  height = 0.05
): void {
  const section = (z: number, y: number, w: number): Point3[] => [
    [-w / 2, y - height, z],
    [-w / 2, y, z],
    [w / 2, y, z],
    [w / 2, y - height, z]
  ];
  const geometry = createLoftGeometry(
    [
      { points: section(zFront, yFront, width) },
      { points: section(zRear, yRear, width * 0.72) }
    ],
    true,
    true
  );
  const mesh = new THREE.Mesh(geometry, materials.accent);
  mesh.name = 'spine';
  group.add(mesh);
}

function addIntake(group: THREE.Group, materials: ModelMaterials, x: number, y: number, z: number): void {
  addBox(group, [0.18, 0.22, 0.7], [x, y, z], materials.body);
  addBox(group, [0.16, 0.18, 0.03], [x, y, z + 0.36], materials.dark);
}

function addJetNozzle(
  group: THREE.Group,
  materials: ModelMaterials,
  z: number,
  radius: number,
  length: number
): void {
  const nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.82, length, 8),
    materials.metal
  );
  nozzle.rotation.x = Math.PI / 2;
  nozzle.position.z = z;
  group.add(nozzle);

  const inner = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.7, radius * 0.7, 0.04, 8), materials.dark);
  inner.rotation.x = Math.PI / 2;
  inner.position.z = z - length / 2 - 0.01;
  group.add(inner);
}

function addPitot(group: THREE.Group, materials: ModelMaterials, z: number): void {
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 6), materials.metal);
  tube.rotation.x = Math.PI / 2;
  tube.position.set(0, 0.02, z);
  group.add(tube);
}

function addBomb(group: THREE.Group, materials: ModelMaterials): void {
  const bomb = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.7, 8), materials.dark);
  bomb.rotation.x = Math.PI / 2;
  bomb.position.set(0, -0.58, 0.25);
  group.add(bomb);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.2, 8), materials.metal);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, -0.58, 0.7);
  group.add(nose);

  addBox(group, [0.12, 0.26, 0.4], [0, -0.4, 0.25], materials.body);
  addBox(group, [0.3, 0.03, 0.18], [0, -0.58, -0.15], materials.metal);
  addBox(group, [0.03, 0.3, 0.18], [0, -0.58, -0.15], materials.metal);
}

const BUILDERS: Record<
  PlaneModelKind,
  (group: PlaneMesh, materials: ModelMaterials, plane: PlaneConfig) => THREE.Group[]
> = {
  biplane(group, materials, plane) {
    addFuselage(group, materials, [
      [1.5, 0.03],
      [1.42, 0.16],
      [1.25, 0.28],
      [0.9, 0.34],
      [0.2, 0.35],
      [-0.4, 0.31],
      [-1, 0.2],
      [-1.35, 0.1],
      [-1.4, 0.04]
    ]);
    addWingPair(
      group,
      materials,
      { span: plane.wingspan, rootChord: 0.9, tipChord: 0.8, sweep: 0, dihedral: 0.04, thickness: 0.08, y: 0.5, z: 0.12 },
      'wing-upper'
    );
    addWingPair(
      group,
      materials,
      {
        span: plane.wingspan * 0.92,
        rootChord: 0.8,
        tipChord: 0.7,
        sweep: 0,
        dihedral: 0.02,
        thickness: 0.07,
        y: -0.2,
        z: 0.05
      },
      'wing-lower'
    );

    for (const x of [-0.82, 0.82]) {
      for (const z of [0.3, -0.12]) addStrut(group, [x, -0.22, z], [x, 0.47, z], 0.05, materials.dark);
    }
    for (const x of [-0.3, 0.3]) {
      for (const z of [0.35, -0.1]) addStrut(group, [x, 0.3, z], [x, 0.47, z], 0.045, materials.dark);
    }

    addWingPair(
      group,
      materials,
      { span: 1.1, rootChord: 0.55, tipChord: 0.4, sweep: -0.05, dihedral: 0.04, thickness: 0.05, y: 0.12, z: -1.15 },
      'tailplane',
      false
    );
    addFin(
      group,
      materials,
      { x: 0, y: 0.15, z: -1.15, height: 0.6, rootChord: 0.5, tipChord: 0.3, sweep: -0.15, thickness: 0.06 },
      'fin'
    );
    addOpenCockpit(group, materials, -0.35, 0.33);
    addSpine(group, materials, -0.4, -1.0, 0.33, 0.21, 0.09, 0.05);
    addCowling(group, materials, 0, 0, 1.32, 0.34, 0.24);
    addLandingGear(group, materials);
    return [placePropeller(group, materials, 0, 0, 1.52, 0.8, 2)];
  },

  swept(group, materials, plane) {
    addFuselage(group, materials, [
      [1.55, 0.03],
      [1.45, 0.12],
      [1.2, 0.24],
      [0.8, 0.32],
      [0.1, 0.34],
      [-0.5, 0.3],
      [-1.1, 0.18],
      [-1.45, 0.08],
      [-1.5, 0.03]
    ]);
    addWingPair(
      group,
      materials,
      { span: plane.wingspan, rootChord: 1.05, tipChord: 0.5, sweep: -0.55, dihedral: 0.07, thickness: 0.09, y: 0, z: 0.1 },
      'wing'
    );
    addWingPair(
      group,
      materials,
      { span: 1.1, rootChord: 0.5, tipChord: 0.35, sweep: -0.08, dihedral: 0.05, thickness: 0.05, y: 0.1, z: -1.2 },
      'tailplane',
      false
    );
    addFin(
      group,
      materials,
      { x: 0, y: 0.12, z: -1.2, height: 0.65, rootChord: 0.55, tipChord: 0.3, sweep: -0.18, thickness: 0.07 },
      'fin'
    );
    addCanopy(group, materials, { z: 0.4, y: 0.32, length: 0.8, width: 0.5, height: 0.26 });
    for (const x of [-0.28, 0.28]) addIntake(group, materials, x, -0.05, 0.2);
    addSpine(group, materials, -0.15, -1.0, 0.345, 0.22, 0.08, 0.05);
    addJetNozzle(group, materials, -1.5, 0.16, 0.22);
    addPitot(group, materials, 1.68);
    return [];
  },

  heavy(group, materials, plane) {
    addFuselage(group, materials, [
      [1.65, 0.05],
      [1.55, 0.2],
      [1.3, 0.36],
      [0.8, 0.44],
      [0, 0.45],
      [-0.7, 0.38],
      [-1.3, 0.24],
      [-1.6, 0.12],
      [-1.7, 0.05]
    ]);
    addWingPair(
      group,
      materials,
      { span: plane.wingspan, rootChord: 1.1, tipChord: 0.9, sweep: -0.05, dihedral: 0.04, thickness: 0.12, y: 0, z: 0.1 },
      'wing'
    );
    addWingPair(
      group,
      materials,
      { span: 1.5, rootChord: 0.6, tipChord: 0.45, sweep: -0.05, dihedral: 0.03, thickness: 0.07, y: 0.12, z: -1.45 },
      'tailplane',
      false
    );
    for (const x of [-0.45, 0.45]) {
      addFin(
        group,
        materials,
        { x, y: 0.15, z: -1.55, height: 0.65, rootChord: 0.5, tipChord: 0.3, sweep: -0.15, thickness: 0.06 },
        'fin'
      );
    }
    addCanopy(group, materials, { z: 0.55, y: 0.42, length: 0.85, width: 0.55, height: 0.28 });
    addSpine(group, materials, 0.05, -1.05, 0.475, 0.32, 0.1, 0.06);
    addBomb(group, materials);
    return [-1, 1].map((x) => addEngine(group, materials, x, -0.1, 0.35, 0.9));
  },

  twinboom(group, materials, plane) {
    addFuselage(group, materials, [
      [1.25, 0.03],
      [1.18, 0.12],
      [1, 0.22],
      [0.6, 0.3],
      [0, 0.31],
      [-0.6, 0.25],
      [-1.1, 0.14],
      [-1.25, 0.06],
      [-1.3, 0.03]
    ]);
    addWingPair(
      group,
      materials,
      { span: plane.wingspan, rootChord: 0.9, tipChord: 0.6, sweep: -0.05, dihedral: 0.05, thickness: 0.07, y: 0, z: 0.15 },
      'wing'
    );
    for (const x of [-0.9, 0.9]) addBoom(group, materials, x, 0.4, -1.75);
    addWingPair(
      group,
      materials,
      { span: 2, rootChord: 0.55, tipChord: 0.4, sweep: -0.05, dihedral: 0, thickness: 0.06, y: 0.05, z: -1.65 },
      'tailplane',
      false
    );
    for (const x of [-0.9, 0.9]) {
      addFin(
        group,
        materials,
        { x, y: 0.08, z: -1.72, height: 0.6, rootChord: 0.45, tipChord: 0.28, sweep: -0.12, thickness: 0.05 },
        'fin'
      );
    }
    addCanopy(group, materials, { z: 0.32, y: 0.3, length: 0.75, width: 0.48, height: 0.24 });
    addSpine(group, materials, -0.15, -1.0, 0.315, 0.185, 0.08, 0.05);
    addCowling(group, materials, 0, 0, 1.1, 0.3, 0.22);
    return [placePropeller(group, materials, 0, 0, 1.29, 0.85, 2)];
  },

  delta(group, materials, plane) {
    addFuselage(group, materials, [
      [1.5, 0.03],
      [1.4, 0.12],
      [1.15, 0.24],
      [0.8, 0.3],
      [0.2, 0.32],
      [-0.4, 0.28],
      [-1, 0.16],
      [-1.35, 0.07],
      [-1.4, 0.03]
    ]);
    addWingPair(
      group,
      materials,
      { span: plane.wingspan, rootChord: 1.8, tipChord: 0.3, sweep: -0.75, dihedral: 0.04, thickness: 0.09, y: -0.02, z: 0.15 },
      'wing'
    );
    addWingPair(
      group,
      materials,
      { span: 0.9, rootChord: 0.35, tipChord: 0.2, sweep: -0.12, dihedral: 0.03, thickness: 0.04, y: 0.08, z: 0.75 },
      'canard',
      false
    );
    addFin(
      group,
      materials,
      { x: 0, y: 0.1, z: -1.1, height: 0.7, rootChord: 0.6, tipChord: 0.3, sweep: -0.22, thickness: 0.07 },
      'fin'
    );
    addCanopy(group, materials, { z: 0.35, y: 0.28, length: 0.75, width: 0.48, height: 0.24 });
    addSpine(group, materials, -0.05, -0.95, 0.325, 0.19, 0.08, 0.05);
    addJetNozzle(group, materials, -1.42, 0.16, 0.2);
    addPitot(group, materials, 1.62);
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
