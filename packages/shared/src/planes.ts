export type PlaneModelKind = 'biplane' | 'swept' | 'heavy' | 'twinboom' | 'delta';

export interface PlaneConfig {
  id: string;
  name: string;
  role: string;
  description: string;
  color: string;
  model: PlaneModelKind;
  minSpeed: number;
  maxSpeed: number;
  acceleration: number;
  turnRate: number;
  pitchRate: number;
  hp: number;
  damage: number;
  fireRate: number;
  bulletSpeed: number;
  wingspan: number;
}

/**
 * 所有机型共用同一套飞行与战斗数值；机型只影响外形、配色和翼展。
 * 修改这些数值后需要运行 `npm run export:game-data` 和 `npm run export:golden`。
 */
const UNIFIED_STATS = {
  minSpeed: 5,
  maxSpeed: 17,
  acceleration: 11,
  turnRate: 2.5,
  pitchRate: 2.0,
  hp: 80,
  damage: 9,
  fireRate: 7,
  bulletSpeed: 38
} satisfies Omit<PlaneConfig, 'id' | 'name' | 'role' | 'description' | 'color' | 'model' | 'wingspan'>;

export const PLANES: PlaneConfig[] = [
  {
    id: 'sparrow',
    name: '纸翼燕',
    role: '双翼侦察机',
    description: '双翼层叠的折纸轮廓，适合喜欢近距离缠斗视角的飞行员。',
    color: '#22D3EE',
    model: 'biplane',
    wingspan: 2.5,
    ...UNIFIED_STATS
  },
  {
    id: 'falcon',
    name: '赤隼',
    role: '后掠翼战斗机',
    description: '赤色涂装与后掠翼构成利落的经典战机剪影。',
    color: '#F59E0B',
    model: 'swept',
    wingspan: 2.9,
    ...UNIFIED_STATS
  },
  {
    id: 'anvil',
    name: '铁砧',
    role: '双发重型攻击机',
    description: '双发动机、宽大机翼与双垂尾，外形厚实稳重。',
    color: '#A78BFA',
    model: 'heavy',
    wingspan: 3.4,
    ...UNIFIED_STATS
  },
  {
    id: 'dragonfly',
    name: '蜻蜓',
    role: '双尾撑侦察机',
    description: '细长机身与双尾撑勾勒出轻盈又独特的轮廓。',
    color: '#34D399',
    model: 'twinboom',
    wingspan: 2.6,
    ...UNIFIED_STATS
  },
  {
    id: 'comet',
    name: '流星',
    role: '三角翼截击机',
    description: '低矮三角翼与尖削机头，呈现简洁的纸飞机造型。',
    color: '#FB7185',
    model: 'delta',
    wingspan: 2.7,
    ...UNIFIED_STATS
  }
];

export function getPlane(planeId: string): PlaneConfig {
  return PLANES.find((plane) => plane.id === planeId) ?? PLANES[0];
}
