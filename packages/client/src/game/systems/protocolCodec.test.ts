import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeEnvelope, encodeEnvelope } from './protocolCodec';

test('binary envelope round trip', () => {
  const encoded = encodeEnvelope({ type: 'ping', at: 1234 }, 7, 9);
  const decoded = decodeEnvelope(encoded);
  assert.ok(decoded);
  assert.equal(decoded.message.type, 'ping');
  assert.equal(decoded.tick, 7);
  assert.equal(decoded.ack, 9);
});

test('binary envelope rejects malformed frames', () => {
  assert.equal(decodeEnvelope(new ArrayBuffer(4)), null);
});
