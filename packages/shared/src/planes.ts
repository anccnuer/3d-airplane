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

export const PLANES: PlaneConfig[] = [
  {
    id: 'sparrow',
    name: '纸翼燕',
    role: '双翼侦察机',
    description: '双翼结构带来极强低速机动，适合在课桌间穿梭缠斗。',
    color: '#22D3EE',
    model: 'biplane',
    minSpeed: 5,
    maxSpeed: 17,
    acceleration: 11,
    turnRate: 2.5,
    pitchRate: 2.0,
    hp: 80,
    damage: 9,
    fireRate: 7,
    bulletSpeed: 38,
    wingspan: 2.5
  },
  {
    id: 'falcon',
    name: '赤隼',
    role: '后掠翼战斗机',
    description: '后掠翼兼顾速度与火力，适合大多数交战距离。',
    color: '#F59E0B',
    model: 'swept',
    minSpeed: 6,
    maxSpeed: 21,
    acceleration: 13,
    turnRate: 2.0,
    pitchRate: 1.7,
    hp: 100,
    damage: 12,
    fireRate: 5.5,
    bulletSpeed: 42,
    wingspan: 2.9
  },
  {
    id: 'anvil',
    name: '铁砧',
    role: '双发重型攻击机',
    description: '双发重型机体，装甲厚、单发伤害高，但转向迟缓。',
    color: '#A78BFA',
    model: 'heavy',
    minSpeed: 7,
    maxSpeed: 18,
    acceleration: 10,
    turnRate: 1.5,
    pitchRate: 1.3,
    hp: 140,
    damage: 19,
    fireRate: 3.2,
    bulletSpeed: 36,
    wingspan: 3.4
  },
  {
    id: 'dragonfly',
    name: '蜻蜓',
    role: '双尾撑侦察机',
    description: '双尾撑布局视野开阔，转向灵敏但装甲薄弱。',
    color: '#34D399',
    model: 'twinboom',
    minSpeed: 4.5,
    maxSpeed: 16,
    acceleration: 10,
    turnRate: 2.3,
    pitchRate: 1.9,
    hp: 70,
    damage: 8,
    fireRate: 8,
    bulletSpeed: 36,
    wingspan: 2.6
  },
  {
    id: 'comet',
    name: '流星',
    role: '三角翼截击机',
    description: '三角翼高速截击机，极速突出，适合一击脱离。',
    color: '#FB7185',
    model: 'delta',
    minSpeed: 8,
    maxSpeed: 22,
    acceleration: 15,
    turnRate: 1.7,
    pitchRate: 1.5,
    hp: 90,
    damage: 14,
    fireRate: 4.5,
    bulletSpeed: 48,
    wingspan: 2.7
  }
];

export function getPlane(planeId: string): PlaneConfig {
  return PLANES.find((plane) => plane.id === planeId) ?? PLANES[0];
}
