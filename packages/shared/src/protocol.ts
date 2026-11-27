import type { Vec3 } from './constants';

export type RoomStateName = 'lobby' | 'playing' | 'ended';

export interface InputCommand {
  type: 'input';
  seq: number;
  tick: number;
  throttle: number;
  pitch: number;
  yaw: number;
  roll: number;
  fire: boolean;
}

export interface PublicPlayer {
  id: string;
  name: string;
  planeId: string;
  ready: boolean;
  connected: boolean;
  hp: number;
  alive: boolean;
  score: number;
  kills: number;
  deaths: number;
  damage: number;
}

export interface RoomInfo {
  code: string;
  name: string;
  state: RoomStateName;
  players: PublicPlayer[];
  startsAt: number | null;
  endsAt: number | null;
}

export interface RoomSummary {
  code: string;
  name: string;
  state: RoomStateName;
  playerCount: number;
}

export interface PlayerState {
  id: string;
  position: Vec3;
  rotation: Vec3;
  velocity: Vec3;
  speed: number;
  hp: number;
  alive: boolean;
  invulnerableUntil: number;
  respawnAt: number;
  parked: boolean;
}

export interface BulletState {
  id: number;
  ownerId: string;
  position: Vec3;
  direction: Vec3;
}

export type GameEventType = 'fire' | 'hit' | 'kill' | 'respawn' | 'collision';

export interface GameEvent {
  id: number;
  type: GameEventType;
  at: number;
  sourceId?: string;
  targetId?: string;
  position?: Vec3;
  text?: string;
}

export interface Standing {
  id: string;
  name: string;
  planeId: string;
  score: number;
  kills: number;
  deaths: number;
  damage: number;
}

export interface Snapshot {
  type: 'snapshot';
  tick: number;
  serverTime: number;
  players: PlayerState[];
  bullets: BulletState[];
}

export interface SnapshotDelta {
  type: 'snapshot_delta';
  baseTick: number;
  tick: number;
  serverTime: number;
  removedPlayers?: string[];
  removedBullets?: number[];
  players?: PlayerState[];
  bullets?: BulletState[];
}

export type ClientMessage =
  | { type: 'hello'; versions: number[] }
  | { type: 'create_room'; name: string; roomName: string; planeId: string }
  | { type: 'join_room'; name: string; code: string; planeId: string }
  | { type: 'reconnect'; token: string }
  | { type: 'set_plane'; planeId: string }
  | { type: 'set_ready'; ready: boolean }
  | { type: 'leave_room' }
  | InputCommand
  | { type: 'ping'; at: number };

export type ServerMessage =
  | { type: 'hello_ack'; version: number; tickRate: number; serverTime: number }
  | { type: 'welcome'; playerId: string; token: string; serverTime: number }
  | { type: 'room_list'; rooms: RoomSummary[] }
  | { type: 'room_state'; room: RoomInfo }
  | { type: 'match_start'; startsAt: number; endsAt: number }
  | Snapshot
  | SnapshotDelta
  | { type: 'game_events'; events: GameEvent[] }
  | { type: 'result'; standings: Standing[]; durationSeconds: number }
  | { type: 'error'; message: string }
  | { type: 'pong'; at: number; serverTime: number };
