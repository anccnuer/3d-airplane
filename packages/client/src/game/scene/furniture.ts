import * as THREE from 'three';
import { CLASSROOM_SCALE, DESK_COLLIDERS } from '@classroom-arena/shared';

const S = CLASSROOM_SCALE;

function instanced(geometry: THREE.BufferGeometry, material: THREE.Material, count: number): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false;
  return mesh;
}

export function createFurniture(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'furniture';

  const wood = new THREE.MeshStandardMaterial({ color: '#a97850', roughness: 0.68 });
  const woodLight = new THREE.MeshStandardMaterial({ color: '#c79562', roughness: 0.64 });
  const metal = new THREE.MeshStandardMaterial({ color: '#4a5c6e', roughness: 0.42, metalness: 0.38 });
  const cushion = new THREE.MeshStandardMaterial({ color: '#355b75', roughness: 0.9 });
  const paper = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.86 });

  const topThickness = 0.16 * S;
  const deskWidth = 2.3 * S;
  const deskDepth = 1.4 * S;
  const count = DESK_COLLIDERS.length;

  const deskTops = instanced(new THREE.BoxGeometry(deskWidth, topThickness, deskDepth), woodLight, count);
  const deskEdges = instanced(new THREE.BoxGeometry(deskWidth, 0.09 * S, 0.1 * S), wood, count);
  const drawers = instanced(new THREE.BoxGeometry(1.05 * S, 0.34 * S, 0.95 * S), wood, count);
  const handles = instanced(new THREE.BoxGeometry(0.32 * S, 0.05 * S, 0.06 * S), metal, count);
  const deskLegs = instanced(new THREE.BoxGeometry(0.13 * S, 1, 0.13 * S), metal, count * 4);
  const crossbars = instanced(new THREE.BoxGeometry(deskWidth - 0.3 * S, 0.08 * S, 0.08 * S), metal, count * 2);
  const chairSeats = instanced(new THREE.BoxGeometry(1.05 * S, 0.12 * S, 1.05 * S), woodLight, count);
  const chairCushions = instanced(new THREE.BoxGeometry(0.92 * S, 0.1 * S, 0.9 * S), cushion, count);
  const chairBacks = instanced(new THREE.BoxGeometry(1.05 * S, 0.72 * S, 0.12 * S), woodLight, count);
  const chairPosts = instanced(new THREE.BoxGeometry(0.1 * S, 0.9 * S, 0.1 * S), metal, count * 2);
  const chairLegs = instanced(new THREE.BoxGeometry(0.09 * S, 0.68 * S, 0.09 * S), metal, count * 4);
  const books = instanced(new THREE.BoxGeometry(0.46 * S, 0.11 * S, 0.64 * S), paper, count * 2);

  const dummy = new THREE.Object3D();
  const bookColors = ['#22D3EE', '#F59E0B', '#A78BFA', '#34D399', '#FB7185'].map((hex) => new THREE.Color(hex));
  let legIndex = 0;
  let barIndex = 0;
  let postIndex = 0;
  let chairLegIndex = 0;
  let bookIndex = 0;

  const place = (
    mesh: THREE.InstancedMesh,
    index: number,
    position: [number, number, number],
    rotation?: [number, number, number],
    scale: [number, number, number] = [1, 1, 1]
  ): void => {
    dummy.position.set(...position);
    dummy.rotation.set(...(rotation ?? [0, 0, 0]));
    dummy.scale.set(...scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  };

  for (let index = 0; index < count; index += 1) {
    const box = DESK_COLLIDERS[index];
    const x = (box.min[0] + box.max[0]) / 2;
    const z = (box.min[2] + box.max[2]) / 2;
    const topY = box.max[1] - topThickness / 2;
    const legHeight = box.max[1] - topThickness - box.min[1];

    place(deskTops, index, [x, topY, z]);
    place(deskEdges, index, [x, topY, z + deskDepth / 2 - 0.05 * S]);
    place(drawers, index, [x, box.max[1] - topThickness - 0.24 * S, z + deskDepth / 2 - 0.4 * S]);
    place(handles, index, [x, box.max[1] - topThickness - 0.22 * S, z + deskDepth / 2 - 0.02 * S]);

    for (const offsetX of [-0.95, 0.95]) {
      for (const offsetZ of [-0.5, 0.5]) {
        place(deskLegs, legIndex, [
          x + offsetX * S,
          box.min[1] + legHeight / 2,
          z + offsetZ * S
        ], undefined, [1, legHeight, 1]);
        legIndex += 1;
      }
    }
    for (const offsetZ of [-0.5, 0.5]) {
      place(crossbars, barIndex, [x, box.min[1] + 0.34 * S, z + offsetZ * S]);
      barIndex += 1;
    }

    const chairZ = z + 1.3 * S;
    place(chairSeats, index, [x, 0.72 * S, chairZ]);
    place(chairCushions, index, [x, 0.83 * S, chairZ]);
    place(chairBacks, index, [x, 1.22 * S, chairZ + 0.48 * S]);
    for (const offsetX of [-0.46, 0.46]) {
      place(chairPosts, postIndex, [x + offsetX * S, 1.1 * S, chairZ + 0.48 * S]);
      postIndex += 1;
    }
    for (const offsetX of [-0.42, 0.42]) {
      for (const offsetZ of [-0.42, 0.42]) {
        place(chairLegs, chairLegIndex, [x + offsetX * S, 0.34 * S, chairZ + offsetZ * S]);
        chairLegIndex += 1;
      }
    }

    for (let book = 0; book < 2; book += 1) {
      place(books, bookIndex, [
        x - 0.82 * S + book * 0.28 * S,
        box.max[1] + 0.055 * S + book * 0.11 * S,
        z - 0.32 * S
      ]);
      books.setColorAt(bookIndex, bookColors[(index + book) % bookColors.length]);
      bookIndex += 1;
    }
  }

  for (const mesh of [
    deskTops,
    deskEdges,
    drawers,
    handles,
    deskLegs,
    crossbars,
    chairSeats,
    chairCushions,
    chairBacks,
    chairPosts,
    chairLegs,
    books
  ]) {
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  }
  if (books.instanceColor) books.instanceColor.needsUpdate = true;

  return group;
}
