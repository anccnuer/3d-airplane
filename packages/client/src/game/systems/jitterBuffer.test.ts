import assert from 'node:assert/strict';
import test from 'node:test';
import { JitterBuffer } from './jitterBuffer';

test('jitter buffer releases snapshots after target delay', () => {
  const buffer = new JitterBuffer<{ serverTime: number; value: string }>(100);
  buffer.push({ serverTime: 1000, value: 'a' });
  buffer.push({ serverTime: 1016, value: 'b' });
  assert.equal(buffer.take(1050), null);
  assert.equal(buffer.take(1116)?.value, 'b');
  assert.equal(buffer.take(1200), null);
});
