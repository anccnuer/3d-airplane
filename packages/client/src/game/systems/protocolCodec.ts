import {
  ENVELOPE_HEADER_BYTES,
  MessageType,
  PROTOCOL_MAGIC,
  PROTOCOL_VERSION,
  type ClientMessage,
  type ServerMessage
} from '@classroom-arena/shared';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function messageType(message: ClientMessage | ServerMessage): number {
  return MessageType[message.type as keyof typeof MessageType] ?? 0;
}

export function encodeEnvelope(message: ClientMessage | ServerMessage, tick = 0, ack = 0): ArrayBuffer {
  const payload = encoder.encode(JSON.stringify(message));
  const frame = new Uint8Array(ENVELOPE_HEADER_BYTES + payload.length);
  for (let index = 0; index < PROTOCOL_MAGIC.length; index += 1) {
    frame[index] = PROTOCOL_MAGIC.charCodeAt(index);
  }
  const view = new DataView(frame.buffer);
  view.setUint8(4, PROTOCOL_VERSION);
  view.setUint8(5, messageType(message));
  view.setUint32(6, tick >>> 0, true);
  view.setUint32(10, ack >>> 0, true);
  view.setUint32(14, payload.length, true);
  frame.set(payload, ENVELOPE_HEADER_BYTES);
  return frame.buffer;
}

export function decodeEnvelope(data: ArrayBuffer): { message: ServerMessage; tick: number; ack: number } | null {
  if (data.byteLength < ENVELOPE_HEADER_BYTES) return null;
  const bytes = new Uint8Array(data);
  for (let index = 0; index < PROTOCOL_MAGIC.length; index += 1) {
    if (bytes[index] !== PROTOCOL_MAGIC.charCodeAt(index)) return null;
  }
  const view = new DataView(data);
  const version = view.getUint8(4);
  if (version !== PROTOCOL_VERSION) return null;
  const length = view.getUint32(14, true);
  if (length <= 0 || data.byteLength < ENVELOPE_HEADER_BYTES + length) return null;
  const message = JSON.parse(decoder.decode(bytes.subarray(ENVELOPE_HEADER_BYTES, ENVELOPE_HEADER_BYTES + length))) as ServerMessage;
  return { message, tick: view.getUint32(6, true), ack: view.getUint32(10, true) };
}
