// GENERATED FILE - DO NOT EDIT
export const PROTOCOL_VERSION = 2;
export const PROTOCOL_MAGIC = "ARNA";
export const PROTOCOL_SCHEMA_HASH = "62d9057fd1ba172277e848b5fb75c6f4607f9831386041f21b4af6af87924bf9";
export const ENVELOPE_HEADER_BYTES = 18;
export const MessageType = {
  hello: 1,
  hello_ack: 2,
  create_room: 3,
  join_room: 4,
  reconnect: 5,
  set_plane: 6,
  set_ready: 7,
  leave_room: 8,
  ping: 9,
  input: 10,
  welcome: 11,
  room_list: 12,
  room_state: 13,
  match_start: 14,
  snapshot: 15,
  snapshot_delta: 16,
  game_events: 17,
  result: 18,
  error: 19,
  pong: 20,
} as const;
export type MessageTypeName = keyof typeof MessageType;
