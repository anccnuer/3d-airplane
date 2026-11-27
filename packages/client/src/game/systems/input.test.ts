import assert from 'node:assert/strict';
import test from 'node:test';
import { InputSystem } from './input';

interface InputHarness {
  instance: InputSystem;
  handlers: Map<string, EventListener>;
  mousemove: (movementX: number, movementY: number) => void;
  restore: () => void;
}

function createHarness(): InputHarness {
  const handlers = new Map<string, EventListener>();
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const target = {
    addEventListener: () => {},
    removeEventListener: () => {},
    requestPointerLock: () => {}
  };
  (globalThis as { window?: unknown }).window = {
    addEventListener: (type: string, handler: EventListener) => handlers.set(`window:${type}`, handler),
    removeEventListener: () => {}
  };
  (globalThis as { document?: unknown }).document = {
    addEventListener: (type: string, handler: EventListener) => handlers.set(`document:${type}`, handler),
    removeEventListener: () => {},
    pointerLockElement: target
  };
  const instance = new InputSystem(target as unknown as HTMLElement, () => true);
  const mousemove = (movementX: number, movementY: number) => {
    handlers.get('document:mousemove')?.({ movementX, movementY } as MouseEvent);
  };
  return {
    instance,
    handlers,
    mousemove,
    restore: () => {
      globalThis.window = originalWindow;
      globalThis.document = originalDocument;
    }
  };
}

test('input sampling merges pending mouse deltas once per fixed tick', () => {
  const harness = createHarness();
  harness.mousemove(10, 0);
  harness.mousemove(10, 0);
  const first = harness.instance.sample(1, 1 / 60);
  assert.equal(first.seq, 1);
  assert.equal(first.tick, 1);
  assert.ok(first.yaw > 0);

  const second = harness.instance.sample(2, 1 / 60);
  assert.equal(second.seq, 2);
  assert.equal(second.tick, 2);
  assert.ok(second.yaw > 0 && second.yaw < first.yaw);
  assert.equal(harness.handlers.has('window:keydown'), true);
  harness.restore();
});
