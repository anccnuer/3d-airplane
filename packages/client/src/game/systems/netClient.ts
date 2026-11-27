import type { ClientMessage, ServerMessage } from '@classroom-arena/shared';
import { decodeEnvelope, encodeEnvelope } from './protocolCodec';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

type MessageHandler = (message: never) => void;

export class NetClient {
  private socket: WebSocket | null = null;
  private url = '';
  private status: ConnectionStatus = 'disconnected';
  private shouldReconnect = false;
  private reconnectTimer: number | null = null;
  private token = window.localStorage.getItem('classroom-sky-token') ?? '';
  private negotiatedVersion = 1;
  private forceProtocolV1 = false;
  private outgoingTick = 0;
  private lastAck = 0;
  private rttMs = 0;
  private clockOffsetMs = 0;
  private hasClock = false;
  private pingTimer: number | null = null;
  private readonly listeners = new Map<ServerMessage['type'], Set<MessageHandler>>();
  private readonly statusListeners = new Set<(status: ConnectionStatus) => void>();

  playerId = '';

  on<K extends ServerMessage['type']>(
    type: K,
    handler: (message: Extract<ServerMessage, { type: K }>) => void
  ): () => void {
    const handlers = this.listeners.get(type) ?? new Set<MessageHandler>();
    handlers.add(handler as MessageHandler);
    this.listeners.set(type, handlers);
    return () => handlers.delete(handler as MessageHandler);
  }

  onStatus(handler: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(handler);
    handler(this.status);
    return () => this.statusListeners.delete(handler);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  connect(url: string): void {
    this.url = url;
    const parsed = new URL(url, window.location.href);
    this.forceProtocolV1 = parsed.searchParams.get('protocol') === '1';
    this.shouldReconnect = true;
    this.setStatus('connecting');
    this.open();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
    if (this.pingTimer !== null) window.clearInterval(this.pingTimer);
    this.reconnectTimer = null;
    this.pingTimer = null;
    this.socket?.close();
    this.socket = null;
    this.setStatus('disconnected');
  }

  createRoom(name: string, roomName: string, planeId: string): void {
    this.send({ type: 'create_room', name, roomName, planeId });
  }

  joinRoom(name: string, code: string, planeId: string): void {
    this.send({ type: 'join_room', name, code, planeId });
  }

  setPlane(planeId: string): void {
    this.send({ type: 'set_plane', planeId });
  }

  setReady(ready: boolean): void {
    this.send({ type: 'set_ready', ready });
  }

  sendInput(input: Extract<ClientMessage, { type: 'input' }>): void {
    this.send(input);
  }

  leaveRoom(): void {
    this.send({ type: 'leave_room' });
  }

  private open(): void {
    if (!this.url) return;
    const socket = new WebSocket(this.url);
    socket.binaryType = 'arraybuffer';
    this.socket = socket;

    socket.onopen = () => {
      this.negotiatedVersion = 1;
      this.outgoingTick = 0;
      this.lastAck = 0;
      this.setStatus('connected');
      if (!this.forceProtocolV1) this.sendRaw({ type: 'hello', versions: [2, 1] }, true);
      if (this.token) this.send({ type: 'reconnect', token: this.token });
      this.pingTimer = window.setInterval(() => this.send({ type: 'ping', at: Date.now() }), 1000);
    };

    socket.onmessage = (event) => {
      let message: ServerMessage;
      try {
        if (event.data instanceof ArrayBuffer) {
          const frame = decodeEnvelope(event.data);
          if (!frame) return;
          this.lastAck = frame.ack;
          message = frame.message;
        } else {
          message = JSON.parse(event.data as string) as ServerMessage;
        }
      } catch (error) {
        console.error('Invalid server message', error);
        return;
      }
      this.emit(message);
    };

    socket.onclose = () => {
      this.socket = null;
      if (this.pingTimer !== null) window.clearInterval(this.pingTimer);
      this.pingTimer = null;
      this.setStatus('disconnected');
      if (!this.shouldReconnect) return;
      this.reconnectTimer = window.setTimeout(() => this.open(), 1200);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error', error);
    };
  }

  private send(message: ClientMessage): void {
    this.sendRaw(message, false);
  }

  private sendRaw(message: ClientMessage, forceBinary = false): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return;
    }
    if (!this.forceProtocolV1 && (forceBinary || this.negotiatedVersion >= 2)) {
      this.outgoingTick += 1;
      this.socket.send(encodeEnvelope(message, this.outgoingTick, this.lastAck));
      return;
    }
    this.socket.send(JSON.stringify(message));
  }

  getProtocolVersion(): number {
    return this.negotiatedVersion;
  }

  getLatestAck(): number {
    return this.lastAck;
  }

  getRttMs(): number {
    return this.rttMs;
  }

  getServerClockOffsetMs(): number {
    return this.clockOffsetMs;
  }

  hasServerClock(): boolean {
    return this.hasClock;
  }

  private emit(message: ServerMessage): void {
    if (message.type === 'hello_ack') {
      this.negotiatedVersion = message.version;
    }
    if (message.type === 'pong') {
      const measured = Math.max(0, Date.now() - message.at);
      this.rttMs = this.rttMs === 0 ? measured : this.rttMs * 0.8 + measured * 0.2;
      const observed = message.serverTime + this.rttMs / 2 - Date.now();
      this.clockOffsetMs = this.hasClock ? this.clockOffsetMs * 0.8 + observed * 0.2 : observed;
      this.hasClock = true;
    }
    if (message.type === 'welcome') {
      this.playerId = message.playerId;
      this.token = message.token;
      window.localStorage.setItem('classroom-sky-token', message.token);
    }

    if (message.type === 'error' && message.message.includes('重连失败')) {
      this.token = '';
      window.localStorage.removeItem('classroom-sky-token');
    }

    const handlers = this.listeners.get(message.type);
    if (!handlers) return;
    for (const handler of handlers) {
      (handler as (value: ServerMessage) => void)(message);
    }
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    for (const handler of this.statusListeners) handler(status);
  }
}
