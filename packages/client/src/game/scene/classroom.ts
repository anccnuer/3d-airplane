import * as THREE from 'three';
import { CLASSROOM_SCALE, WORLD } from '@classroom-arena/shared';
import { disposeObject3D } from './disposal';
import { createFurniture } from './furniture';

export interface ClassroomScene {
  group: THREE.Group;
  dispose: () => void;
}

function createBlackboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 320;
  const context = canvas.getContext('2d');

  if (context) {
    context.fillStyle = '#173f35';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = 'rgba(255,255,255,0.14)';
    context.lineWidth = 4;
    context.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
    context.fillStyle = '#eaf8f2';
    context.font = 'bold 100px "Microsoft YaHei", sans-serif';
    context.fillText('大家一起打飞机', 54, 126);
    context.fillStyle = '#67e8f9';
    context.font = '32px "Microsoft YaHei", sans-serif';
    context.fillText('W 起飞/油门   Q/E 滚转   鼠标转向/俯仰   左键开火', 58, 268);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createTextTexture(
  text: string,
  color: string,
  fontSize: number,
  outlineColor = 'rgba(255,255,255,0.85)'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 160;
  const context = canvas.getContext('2d');

  if (context) {
    context.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineJoin = 'round';
    context.lineWidth = Math.max(3, fontSize * 0.07);
    context.strokeStyle = outlineColor;
    context.strokeText(text, canvas.width / 2, canvas.height / 2);
    context.fillStyle = color;
    context.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createClassroom(): ClassroomScene {
  const group = new THREE.Group();
  group.name = 'classroom';

  const floorMaterial = new THREE.MeshStandardMaterial({ color: '#cbb692', roughness: 0.92 });
  const wallMaterial = new THREE.MeshStandardMaterial({ color: '#e8eef7', roughness: 0.86 });
  const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 1,
    side: THREE.DoubleSide
  });
  const woodMaterial = new THREE.MeshStandardMaterial({ color: '#9a6b46', roughness: 0.72 });
  const metalMaterial = new THREE.MeshStandardMaterial({ color: '#516273', roughness: 0.48, metalness: 0.3 });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: '#bae6fd',
    emissive: '#7dd3fc',
    emissiveIntensity: 0.35,
    roughness: 0.2,
    transparent: true,
    opacity: 0.72
  });
  const wainscotMaterial = new THREE.MeshStandardMaterial({ color: '#d7e3d6', roughness: 0.9 });
  const trimMaterial = new THREE.MeshStandardMaterial({ color: '#a9b8a5', roughness: 0.75 });
  const baseboardMaterial = new THREE.MeshStandardMaterial({ color: '#7d6248', roughness: 0.8 });
  const sillMaterial = new THREE.MeshStandardMaterial({ color: '#d8c3a0', roughness: 0.72 });
  const curtainMaterial = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.95 });
  const curtainFoldMaterial = new THREE.MeshStandardMaterial({ color: '#9aa9bd', roughness: 0.95 });
  const highlightMaterial = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.22,
    depthWrite: false
  });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.width, WORLD.depth), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.width, WORLD.depth), ceilingMaterial);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WORLD.height;
  group.add(ceiling);

  const wallHeight = WORLD.height;
  const wallSpecs = [
    { width: WORLD.width, height: wallHeight, depth: WORLD.wallThickness, x: 0, y: wallHeight / 2, z: WORLD.depth / 2 },
    { width: WORLD.width, height: wallHeight, depth: WORLD.wallThickness, x: 0, y: wallHeight / 2, z: -WORLD.depth / 2 },
    { width: WORLD.wallThickness, height: wallHeight, depth: WORLD.depth, x: -WORLD.width / 2, y: wallHeight / 2, z: 0 },
    { width: WORLD.wallThickness, height: wallHeight, depth: WORLD.depth, x: WORLD.width / 2, y: wallHeight / 2, z: 0 }
  ];

  for (const spec of wallSpecs) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(spec.width, spec.height, spec.depth), wallMaterial);
    wall.position.set(spec.x, spec.y, spec.z);
    group.add(wall);
  }

  const halfWall = WORLD.wallThickness / 2;
  const wallTrimSpecs = [
    { x: 0, z: -WORLD.depth / 2, width: WORLD.width - WORLD.wallThickness, nx: 0, nz: 1, rotationY: 0 },
    { x: 0, z: WORLD.depth / 2, width: WORLD.width - WORLD.wallThickness, nx: 0, nz: -1, rotationY: 0 },
    { x: -WORLD.width / 2, z: 0, width: WORLD.depth - WORLD.wallThickness, nx: 1, nz: 0, rotationY: Math.PI / 2 },
    { x: WORLD.width / 2, z: 0, width: WORLD.depth - WORLD.wallThickness, nx: -1, nz: 0, rotationY: Math.PI / 2 }
  ];
  for (const spec of wallTrimSpecs) {
    const surface = (depth: number): [number, number] => [
      spec.x + spec.nx * (halfWall + depth),
      spec.z + spec.nz * (halfWall + depth)
    ];

    const wainscot = new THREE.Mesh(
      new THREE.BoxGeometry(spec.width, 1.4 * CLASSROOM_SCALE, 0.06 * CLASSROOM_SCALE),
      wainscotMaterial
    );
    const wainscotBase = surface(0.03 * CLASSROOM_SCALE);
    wainscot.position.set(wainscotBase[0], 0.74 * CLASSROOM_SCALE, wainscotBase[1]);
    wainscot.rotation.y = spec.rotationY;
    group.add(wainscot);

    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(spec.width, 0.08 * CLASSROOM_SCALE, 0.09 * CLASSROOM_SCALE),
      trimMaterial
    );
    const trimBase = surface(0.05 * CLASSROOM_SCALE);
    trim.position.set(trimBase[0], 1.47 * CLASSROOM_SCALE, trimBase[1]);
    trim.rotation.y = spec.rotationY;
    group.add(trim);

    const baseboard = new THREE.Mesh(
      new THREE.BoxGeometry(spec.width, 0.3 * CLASSROOM_SCALE, 0.12 * CLASSROOM_SCALE),
      baseboardMaterial
    );
    const baseboardBase = surface(0.06 * CLASSROOM_SCALE);
    baseboard.position.set(baseboardBase[0], 0.15 * CLASSROOM_SCALE, baseboardBase[1]);
    baseboard.rotation.y = spec.rotationY;
    group.add(baseboard);
  }

  const addWindowPart = (
    size: [number, number, number],
    position: [number, number, number],
    material: THREE.Material
  ): void => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    group.add(mesh);
  };

  for (let side = -1; side <= 1; side += 2) {
    for (let index = 0; index < 4; index += 1) {
      const z = (-8 + index * 5.4) * CLASSROOM_SCALE;
      const y = 4.7 * CLASSROOM_SCALE;
      const width = 4.4 * CLASSROOM_SCALE;
      const height = 3.1 * CLASSROOM_SCALE;
      const bar = 0.1 * CLASSROOM_SCALE;
      const glassX = side * (WORLD.width / 2 - 0.25 * CLASSROOM_SCALE);
      const frameX = side * (WORLD.width / 2 - 0.3 * CLASSROOM_SCALE);

      const window = new THREE.Mesh(new THREE.BoxGeometry(0.12 * CLASSROOM_SCALE, height, width), glassMaterial);
      window.position.set(glassX, y, z);
      group.add(window);

      addWindowPart([bar, bar, width + 2 * bar], [frameX, y + height / 2 + bar / 2, z], metalMaterial);
      addWindowPart([bar, bar, width + 2 * bar], [frameX, y - height / 2 - bar / 2, z], metalMaterial);
      addWindowPart([bar, height, bar], [frameX, y, z + width / 2 + bar / 2], metalMaterial);
      addWindowPart([bar, height, bar], [frameX, y, z - width / 2 - bar / 2], metalMaterial);
      addWindowPart([bar, height, 0.07 * CLASSROOM_SCALE], [frameX, y, z], metalMaterial);
      for (const offsetY of [-0.8 * CLASSROOM_SCALE, 0.8 * CLASSROOM_SCALE]) {
        addWindowPart([bar, 0.07 * CLASSROOM_SCALE, width], [frameX, y + offsetY, z], metalMaterial);
      }

      addWindowPart(
        [0.45 * CLASSROOM_SCALE, 0.1 * CLASSROOM_SCALE, width + 0.5 * CLASSROOM_SCALE],
        [side * (WORLD.width / 2 - 0.45 * CLASSROOM_SCALE), y - height / 2 - 0.1 * CLASSROOM_SCALE, z],
        sillMaterial
      );

      for (const offsetZ of [-width / 2 + 0.45 * CLASSROOM_SCALE, width / 2 - 0.45 * CLASSROOM_SCALE]) {
        addWindowPart(
          [0.04 * CLASSROOM_SCALE, height * 0.86, 0.7 * CLASSROOM_SCALE],
          [frameX - side * 0.08 * CLASSROOM_SCALE, y, z + offsetZ],
          curtainMaterial
        );
        addWindowPart(
          [0.05 * CLASSROOM_SCALE, height * 0.86, 0.08 * CLASSROOM_SCALE],
          [frameX - side * 0.11 * CLASSROOM_SCALE, y, z + offsetZ + 0.22 * CLASSROOM_SCALE],
          curtainFoldMaterial
        );
      }

      addWindowPart(
        [0.02 * CLASSROOM_SCALE, 0.16 * CLASSROOM_SCALE, width * 0.65],
        [frameX - side * 0.03 * CLASSROOM_SCALE, y + 0.85 * CLASSROOM_SCALE, z],
        highlightMaterial
      );
    }
  }

  const boardFrame = new THREE.Mesh(
    new THREE.BoxGeometry(15 * CLASSROOM_SCALE, 4.9 * CLASSROOM_SCALE, 0.22 * CLASSROOM_SCALE),
    metalMaterial
  );
  boardFrame.position.set(0, 4.4 * CLASSROOM_SCALE, -WORLD.depth / 2 + 0.35 * CLASSROOM_SCALE);
  group.add(boardFrame);

  const boardTexture = createBlackboardTexture();
  const boardMaterial = new THREE.MeshBasicMaterial({ map: boardTexture });
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(14.4 * CLASSROOM_SCALE, 4.3 * CLASSROOM_SCALE),
    boardMaterial
  );
  board.position.set(0, 4.4 * CLASSROOM_SCALE, -WORLD.depth / 2 + 0.48 * CLASSROOM_SCALE);
  group.add(board);

  const topSlogan = new THREE.Mesh(
    new THREE.PlaneGeometry(9.5 * CLASSROOM_SCALE, 1.15 * CLASSROOM_SCALE),
    new THREE.MeshBasicMaterial({
      map: createTextTexture('好好学习 天天向上', '#c62828', 112, 'rgba(120,20,20,0.35)'),
      transparent: true,
      depthWrite: false
    })
  );
  topSlogan.position.set(0, 7.75 * CLASSROOM_SCALE, -WORLD.depth / 2 + 0.3 * CLASSROOM_SCALE);
  group.add(topSlogan);

  const sideSlogans = [
    { side: -1, text: '团结 勤奋 求实 创新', color: '#1e3a5f' },
    { side: 1, text: '书籍是人类进步的阶梯', color: '#b91c1c' }
  ];
  for (const slogan of sideSlogans) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(7.6 * CLASSROOM_SCALE, 0.9 * CLASSROOM_SCALE),
      new THREE.MeshBasicMaterial({
        map: createTextTexture(slogan.text, slogan.color, 92),
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    mesh.position.set(
      slogan.side * (WORLD.width / 2 - WORLD.wallThickness / 2 - 0.04 * CLASSROOM_SCALE),
      7.0 * CLASSROOM_SCALE,
      0
    );
    mesh.rotation.y = slogan.side < 0 ? Math.PI / 2 : -Math.PI / 2;
    group.add(mesh);
  }

  group.add(createFurniture());

  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(17 * CLASSROOM_SCALE, 0.35 * CLASSROOM_SCALE, 2.4 * CLASSROOM_SCALE),
    woodMaterial
  );
  platform.position.set(0, 0.18 * CLASSROOM_SCALE, -WORLD.depth / 2 + 2.2 * CLASSROOM_SCALE);
  group.add(platform);

  const lightMaterial = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#fef3c7',
    emissiveIntensity: 0.8
  });
  for (const x of [-10, 0, 10]) {
    for (const z of [-7, 7]) {
      const light = new THREE.Mesh(
        new THREE.BoxGeometry(3.4 * CLASSROOM_SCALE, 0.16 * CLASSROOM_SCALE, 1.1 * CLASSROOM_SCALE),
        lightMaterial
      );
      light.position.set(x * CLASSROOM_SCALE, WORLD.height - 0.18 * CLASSROOM_SCALE, z * CLASSROOM_SCALE);
      group.add(light);
    }
  }

  return {
    group,
    dispose: () => disposeObject3D(group)
  };
}
