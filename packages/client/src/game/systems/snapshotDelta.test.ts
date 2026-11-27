import assert from 'node:assert/strict';
import test from 'node:test';
import type { BulletState, PlayerState, Snapshot, SnapshotDelta } from '@classroom-arena/shared';
import { applySnapshotDelta, toBaseline } from './snapshotDelta';

function player(id: string, hp: number): PlayerState {
  return {
    id,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    velocity: [0, 0, 0],
    speed: 0,
    hp,
    alive: true,
    invulnerableUntil: 0,
    respawnAt: 0,
    parked: false
  };
}

function bullet(id: number): BulletState {
  return {
    id,
    ownerId: 'p1',
    position: [0, 0, 0],
    direction: [0, 0, 1]
  };
}

function delta(overrides: Partial<SnapshotDelta>): SnapshotDelta {
  return {
    type: 'snapshot_delta',
    baseTick: 100,
    tick: 101,
    serverTime: 1000,
    ...overrides
  };
}

test('self-baselined delta is treated as a full snapshot', () => {
  const result = applySnapshotDelta(null, delta({ baseTick: 100, tick: 100, players: [player('p1', 100)] }));
  assert.equal(result.snapshot?.players.length, 1);
  assert.equal(result.baseline?.tick, 100);
});

test('deltas are reconstructed from the baseline, not the previous tick', () => {
  const base: Snapshot = {
    type: 'snapshot',
    tick: 100,
    serverTime: 1000,
    players: [player('p1', 100), player('p2', 80)],
    bullets: [bullet(1), bullet(2)]
  };
  const baseline = toBaseline(base);

  const first = applySnapshotDelta(
    baseline,
    delta({ tick: 101, players: [player('p1', 70)], removedBullets: [2] })
  );
  assert.equal(first.snapshot?.players.find((entry) => entry.id === 'p1')?.hp, 70);
  assert.equal(first.snapshot?.players.find((entry) => entry.id === 'p2')?.hp, 80);
  assert.deepEqual(first.snapshot?.bullets.map((entry) => entry.id), [1]);

  // p1 returns to its baseline HP; the server omits it because the delta is
  // computed against tick 100, so reconstruction must restore the old value.
  const second = applySnapshotDelta(baseline, delta({ tick: 102, players: [] }));
  assert.equal(second.snapshot?.players.find((entry) => entry.id === 'p1')?.hp, 100);
  assert.equal(second.baseline, baseline);
});

test('delta with a missing baseline is ignored', () => {
  const result = applySnapshotDelta(null, delta({ players: [player('p1', 50)] }));
  assert.equal(result.snapshot, null);
  assert.equal(result.baseline, null);
});
