import type { BulletState, PlayerState, Snapshot, SnapshotDelta } from '@classroom-arena/shared';

export interface DeltaBaseline {
  tick: number;
  players: Map<string, PlayerState>;
  bullets: Map<number, BulletState>;
}

export function toBaseline(snapshot: Snapshot): DeltaBaseline {
  return {
    tick: snapshot.tick,
    players: new Map(snapshot.players.map((player) => [player.id, player])),
    bullets: new Map(snapshot.bullets.map((bullet) => [bullet.id, bullet]))
  };
}

/**
 * Server deltas are computed against a fixed baseline snapshot, not against the
 * previous tick. Return null when the matching baseline is missing so unchanged
 * entities are not silently erased.
 */
export function applySnapshotDelta(
  baseline: DeltaBaseline | null,
  delta: SnapshotDelta
): { snapshot: Snapshot | null; baseline: DeltaBaseline | null } {
  if (delta.baseTick === delta.tick) {
    const snapshot: Snapshot = {
      type: 'snapshot',
      tick: delta.tick,
      serverTime: delta.serverTime,
      players: delta.players ?? [],
      bullets: delta.bullets ?? []
    };
    return { snapshot, baseline: toBaseline(snapshot) };
  }
  if (!baseline || baseline.tick !== delta.baseTick) return { snapshot: null, baseline };

  const players = new Map(baseline.players);
  const bullets = new Map(baseline.bullets);
  for (const id of delta.removedPlayers ?? []) players.delete(id);
  for (const id of delta.removedBullets ?? []) bullets.delete(id);
  for (const player of delta.players ?? []) players.set(player.id, player);
  for (const bullet of delta.bullets ?? []) bullets.set(bullet.id, bullet);

  return {
    snapshot: {
      type: 'snapshot',
      tick: delta.tick,
      serverTime: delta.serverTime,
      players: [...players.values()],
      bullets: [...bullets.values()]
    },
    baseline
  };
}
