import type { ClientMessage, ServerMessage } from '@classroom-arena/shared';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

type MessageHandler = (message: never) => void;

export class NetClient {
  private socket: WebSocket | null = null;
  private url = '';
  private status: ConnectionStatus = 'disconnected';
  private shouldReconnect = false;
  private reconnectTimer: number | null = null;
  private token = window.localStorage.getItem('classroom-sky-token') ?? '';
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
    this.shouldReconnect = true;
    this.setStatus('connecting');
    this.open();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
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
    this.socket = socket;

    socket.onopen = () => {
      this.setStatus('connected');
      if (this.token) this.send({ type: 'reconnect', token: this.token });
    };

    socket.onmessage = (event) => {
      let message: ServerMessage;
      try {
        message = JSON.parse(event.data as string) as ServerMessage;
      } catch (error) {
        console.error('Invalid server message', error);
        return;
      }
      this.emit(message);
    };

    socket.onclose = () => {
      this.socket = null;
      this.setStatus('disconnected');
      if (!this.shouldReconnect) return;
      this.reconnectTimer = window.setTimeout(() => this.open(), 1200);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error', error);
    };
  }

  private send(message: ClientMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return;
    }
    this.socket.send(JSON.stringify(message));
  }

  private emit(message: ServerMessage): void {
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
